if (typeof require !== 'undefined') {
  var main = require('./main');
  var {
    getSpreadsheetId,
    CONFIG_SHEET_NAME,
    STATE_KEY_PREFIX,
    STATE_WAITING_FOR_AMOUNT,
    STATE_WAITING_FOR_FARE_CONFIRMATION,
    ACTION_REUSE_FARE_YES,
    ACTION_REUSE_FARE_NO,
  } = require('./Constants');
  var { GeminiService } = require('./GeminiService');
  var { SpreadsheetService } = require('./SpreadsheetService');
}

/**
 * Google Chatからのメッセージを受信した時のハンドラ
 */
function onMessage(event) {
  try {
    console.log('onMessage called with event:', JSON.stringify(event));

    var data = extractEventData(event);
    var messageText = data.text;
    var spaceName = data.spaceName;
    var userEmail = data.userEmail;
    var userName = data.userName;

    if (!spaceName) return;

    var cache = CacheService.getUserCache();
    var stateKey = STATE_KEY_PREFIX + userEmail;
    var currentState = cache.get(stateKey);

    // カードクリックイベントの処理
    if (event.type === 'CARD_CLICKED') {
      handleCardClick(event, spaceName, userName, userEmail, stateKey, cache);
      return;
    }

    // 金額入力待ちの状態チェック
    if (currentState === STATE_WAITING_FOR_AMOUNT) {
      handleAmountInput(messageText, spaceName, userName, userEmail, stateKey, cache);
      return;
    }

    // 設定値（モデル・プロンプト）を取得
    var config = getBotConfig();
    var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

    // Geminiを使って意図解析
    var gemini = new GeminiService(apiKey, config.model);
    var responseText = gemini.generateContent(messageText, config.prompt);

    var result;
    try {
      result = parseGeminiResponse(responseText);
    } catch (e) {
      console.error('Gemini response parse error:', responseText, e);
      result = { intent: 'other', message: '申し訳ありません、メッセージを正しく理解できませんでした。' };
    }

    // 意図に応じた処理
    if (result.intent === 'commute') {
      if (result.amount) {
        Chat.Spaces.Messages.create({ text: result.message }, spaceName);
        executeCommuteExpense(result.amount, spaceName, userName, userEmail, stateKey, cache);
      } else {
        // 先月の運賃をチェック
        var ssService = new SpreadsheetService();
        var lastMonthFare = ssService.getLastMonthFare(userEmail, new Date(), userName);

        if (lastMonthFare) {
          sendFareConfirmationCard(lastMonthFare, spaceName);
          cache.put(stateKey, STATE_WAITING_FOR_FARE_CONFIRMATION + '|' + lastMonthFare, 600);
        } else {
          var waitingState =
            typeof STATE_WAITING_FOR_AMOUNT !== 'undefined' ? STATE_WAITING_FOR_AMOUNT : 'WAITING_FOR_AMOUNT';
          cache.put(stateKey, waitingState, 600);
          Chat.Spaces.Messages.create({ text: result.message }, spaceName);
        }
      }
    } else {
      Chat.Spaces.Messages.create({ text: result.message }, spaceName);
    }
  } catch (error) {
    console.error('Critical error in onMessage:', error);
    if (event && spaceName) {
      Chat.Spaces.Messages.create({ text: '❌ 申し訳ありません、システムエラーが発生しました。' }, spaceName);
    }
  }
}

/**
 * カードクリックを処理します
 */
function handleCardClick(event, spaceName, userName, userEmail, stateKey, cache) {
  var actionId = event.common.actionMethodName;
  var currentState = cache.get(stateKey);

  if (!currentState || currentState.indexOf(STATE_WAITING_FOR_FARE_CONFIRMATION) !== 0) {
    return;
  }

  var lastMonthFare = parseInt(currentState.split('|')[1], 10);

  if (actionId === ACTION_REUSE_FARE_YES) {
    Chat.Spaces.Messages.create({ text: '先月の運賃（片道' + lastMonthFare + '円）を使用します。' }, spaceName);
    executeCommuteExpense(lastMonthFare, spaceName, userName, userEmail, stateKey, cache);
  } else {
    cache.put(stateKey, STATE_WAITING_FOR_AMOUNT, 600);
    Chat.Spaces.Messages.create({ text: '了解しました。今回の片道運賃を教えてください。' }, spaceName);
  }
}

/**
 * 運賃確認カードを送信します
 */
function sendFareConfirmationCard(fare, spaceName) {
  var card = {
    cardsV2: [
      {
        cardId: 'fareConfirmation',
        card: {
          header: { title: '運賃の確認' },
          sections: [
            {
              widgets: [
                { textParagraph: { text: '先月の精算資料から片道運賃 **' + fare + '円** が見つかりました。この運賃を使用しますか？' } },
                {
                  buttonList: {
                    buttons: [
                      {
                        text: 'はい (使用する)',
                        onClick: { action: { actionMethodName: ACTION_REUSE_FARE_YES } },
                      },
                      {
                        text: 'いいえ (入力する)',
                        onClick: { action: { actionMethodName: ACTION_REUSE_FARE_NO } },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };
  Chat.Spaces.Messages.create(card, spaceName);
}

/**
 * ボットの設定（モデル・プロンプト）をキャッシュ経由で取得します
 */
function getBotConfig() {
  var cache = CacheService.getScriptCache();
  var model = cache.get('GEMINI_MODEL');
  var prompt = cache.get('GEMINI_PROMPT');

  if (model && prompt) {
    return { model: model, prompt: prompt };
  }

  // キャッシュがなければスプレッドシートから取得
  var sheetId = typeof getSpreadsheetId === 'function' ? getSpreadsheetId() : '';
  if (!sheetId) sheetId = PropertiesService.getScriptProperties().getProperty('COMMUTE_EXPENSE_SPREDSHEET');

  var ss = SpreadsheetApp.openById(sheetId);

  if (!model) {
    var configSheetName = typeof CONFIG_SHEET_NAME !== 'undefined' ? CONFIG_SHEET_NAME : '情報';
    model = ss.getSheetByName(configSheetName).getRange('B1').getValue();
    cache.put('GEMINI_MODEL', model, 21600); // 6時間キャッシュ
  }

  if (!prompt) {
    prompt = ss.getSheetByName('通勤費').getRange('B1').getValue();
    cache.put('GEMINI_PROMPT', prompt, 21600);
  }

  return { model: model, prompt: prompt };
}

/**
 * Geminiのレスポンス（JSON）を安全にパースします
 */
function parseGeminiResponse(responseText) {
  // マークダウン記法 (```json ... ```) を除去
  var cleanText = responseText.replace(/```json\s*/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanText);
}

/**
 * 通勤費精算を実行します
 */
function executeCommuteExpense(amount, spaceName, userName, userEmail, stateKey, cache) {
  try {
    var roundTripAmount = amount * 2;
    var result;
    if (typeof main !== 'undefined' && main.applyCommuteExpenses) {
      result = main.applyCommuteExpenses(new Date(), roundTripAmount, userName, userEmail);
    } else {
      result = applyCommuteExpenses(new Date(), roundTripAmount, userName, userEmail);
    }

    var message =
      '✅ 通勤費の申請を受け付けました。\n\n' +
      '出社日: ' +
      (result.dates ? result.dates.join(', ') : 'なし') +
      ' (' +
      result.daysCount +
      '日間)\n' +
      '合計金額: ' +
      result.totalAmount +
      '円';

    if (result.spreadsheetUrl) {
      message += '\n\n精算書を作成しました:\n' + result.spreadsheetUrl;
    }

    Chat.Spaces.Messages.create({ text: message }, spaceName);
    cache.remove(stateKey);
  } catch (error) {
    console.error('Error in executeCommuteExpense:', error);
    Chat.Spaces.Messages.create(
      { text: '❌ 精算処理中にエラーが発生しました: ' + (error.message || String(error)) },
      spaceName
    );
  }
}

/**
 * 金額入力を処理します
 */
function handleAmountInput(messageText, spaceName, userName, userEmail, stateKey, cache) {
  if (messageText === 'キャンセル') {
    cache.remove(stateKey);
    Chat.Spaces.Messages.create({ text: '処理を中断しました。' }, spaceName);
    return;
  }

  var numericText = messageText.replace(/[^\d]/g, '');
  var amount = parseInt(numericText, 10);

  if (isNaN(amount) || numericText === '') {
    Chat.Spaces.Messages.create(
      { text: '数値を入力してください。中断する場合は「キャンセル」と入力してください。' },
      spaceName
    );
    return;
  }

  executeCommuteExpense(amount, spaceName, userName, userEmail, stateKey, cache);
}

/**
 * イベントオブジェクトから共通のデータを抽出します
 */
function extractEventData(event) {
  var text = '';
  if (event.message && event.message.text) {
    text = event.message.text.trim();
  } else if (event.chat && event.chat.messagePayload && event.chat.messagePayload.message) {
    text = event.chat.messagePayload.message.text.trim();
  }

  var spaceName = '';
  if (event.space) {
    spaceName = event.space.name;
  } else if (event.chat && event.chat.messagePayload && event.chat.messagePayload.space) {
    spaceName = event.chat.messagePayload.space.name;
  }

  var userEmail = '';
  var userName = '';

  // ユーザー情報の取得を試みる
  var user =
    event.user ||
    (event.chat && event.chat.messagePayload && event.chat.messagePayload.message && event.chat.messagePayload.message.sender) ||
    (event.chat && event.chat.messagePayload && event.chat.messagePayload.user) ||
    (event.message && event.message.sender);

  if (user) {
    userEmail = user.email || '';
    userName = user.displayName || '';
  }

  return { text: text, spaceName: spaceName, userEmail: userEmail, userName: userName };
}

/**
 * ボットがスペースに追加された時のハンドラ
 */
function onAddedToSpace(event) {
  var data = extractEventData(event);
  if (data.spaceName) {
    Chat.Spaces.Messages.create(
      {
        text:
          '交通費精算コンシェルジュです。カレンダーの「出社」イベントを集計して交通費を申請します。\n' +
          '「精算をお願い」や「片道600円で精算して」のように話しかけてください。',
      },
      data.spaceName
    );
  }
  return;
}

function onRemovedFromSpace(event) {
  console.log('Bot removed');
}

if (typeof module !== 'undefined') {
  module.exports = { onMessage, onAddedToSpace: onAddedToSpace, onAddToSpace: onAddedToSpace };
}
