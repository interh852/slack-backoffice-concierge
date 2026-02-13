if (typeof require !== 'undefined') {
  var main = require('./main');
  var { CHAT_KEYWORD, STATE_KEY_PREFIX, STATE_WAITING_FOR_AMOUNT } = require('./Constants');
  var { GeminiService } = require('./GeminiService');
}

/**
 * Google Chatからのメッセージを受信した時のハンドラ
 */
function onMessage(event) {
  console.log('onMessage called with event:', JSON.stringify(event));

  // イベントオブジェクトから必要な情報を抽出
  var data = extractEventData(event);
  var messageText = data.text;
  var spaceName = data.spaceName;
  var userEmail = data.userEmail;

  if (!spaceName) return;

  var cache = CacheService.getUserCache();
  var stateKey = STATE_KEY_PREFIX + userEmail;
  var currentState = cache.get(stateKey);

  // 金額入力待ちの状態チェック（ここはGeminiを通さず高速に処理）
  if (currentState === STATE_WAITING_FOR_AMOUNT) {
    handleAmountInput(messageText, spaceName, stateKey, cache);
    return;
  }

  // Geminiを使って意図解析
  var gemini = new GeminiService();
  
  // スプレッドシートからプロンプトを取得
  var sheetId = typeof SPREADSHEET_ID !== 'undefined' ? SPREADSHEET_ID : '';
  var ss = SpreadsheetApp.openById(sheetId);
  var promptSheet = ss.getSheetByName('通勤費');
  var systemInstruction = promptSheet.getRange('B1').getValue();
  
  var responseText = gemini.generateContent(messageText, systemInstruction);
  var result;
  try {
    result = JSON.parse(responseText);
  } catch (e) {
    console.error('Gemini response parse error:', responseText);
    result = { intent: 'other', message: '申し訳ありません、メッセージを正しく理解できませんでした。' };
  }

  // 意図に応じた処理
  if (result.intent === 'commute') {
    if (result.amount) {
      // 金額が含まれている場合は即座に精算
      Chat.Spaces.Messages.create({ text: result.message }, spaceName);
      executeCommuteExpense(result.amount, spaceName, stateKey, cache);
    } else {
      // 金額がない場合は入力待ち状態にする
      var waitingState = typeof STATE_WAITING_FOR_AMOUNT !== 'undefined' ? STATE_WAITING_FOR_AMOUNT : 'WAITING_FOR_AMOUNT';
      cache.put(stateKey, waitingState, 600);
      Chat.Spaces.Messages.create({ text: result.message }, spaceName);
    }
  } else {
    // それ以外（雑談など）
    Chat.Spaces.Messages.create({ text: result.message }, spaceName);
  }
}

/**
 * 通勤費精算を実行します
 */
function executeCommuteExpense(amount, spaceName, stateKey, cache) {
  try {
    var roundTripAmount = amount * 2;
    var result;
    if (typeof main !== 'undefined' && main.applyCommuteExpenses) {
      result = main.applyCommuteExpenses(new Date(), roundTripAmount);
    } else {
      result = applyCommuteExpenses(new Date(), roundTripAmount);
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

    Chat.Spaces.Messages.create({ text: message }, spaceName);
    cache.remove(stateKey);
  } catch (error) {
    console.error('Error in executeCommuteExpense:', error);
    Chat.Spaces.Messages.create(
      { text: '❌ エラーが発生しました: ' + (error.message || String(error)) },
      spaceName
    );
  }
}

/**
 * 金額入力を処理します
 */
function handleAmountInput(messageText, spaceName, stateKey, cache) {
  if (messageText === 'キャンセル') {
    cache.remove(stateKey);
    Chat.Spaces.Messages.create({ text: '処理を中断しました。' }, spaceName);
    return;
  }

  // 文字列から数字部分だけを抽出
  var numericText = messageText.replace(/[^\d]/g, '');
  var amount = parseInt(numericText, 10);

  if (isNaN(amount) || numericText === '') {
    Chat.Spaces.Messages.create(
      { text: '数値を入力してください。中断する場合は「キャンセル」と入力してください。' },
      spaceName
    );
    return;
  }

  executeCommuteExpense(amount, spaceName, stateKey, cache);
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
  if (event.user && event.user.email) {
    userEmail = event.user.email;
  } else if (event.chat && event.chat.messagePayload && event.chat.messagePayload.user) {
    userEmail = event.chat.messagePayload.user.email;
  }

  return { text: text, spaceName: spaceName, userEmail: userEmail };
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
