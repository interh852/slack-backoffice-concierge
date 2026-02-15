if (typeof require !== 'undefined') {
  var main = require('./main');
  var {
    getSpreadsheetId,
    CONFIG_SHEET_NAME,
    STATE_KEY_PREFIX,
    STATE_WAITING_FOR_AMOUNT,
    STATE_WAITING_FOR_FARE_CONFIRMATION,
  } = require('./Constants');
  var { GeminiService } = require('./GeminiService');
  var { SpreadsheetService } = require('./SpreadsheetService');
}

/**
 * Google Chatからのメッセージを受信した時のハンドラ
 */
function onMessage(event) {
  try {
    console.log('--- onMessage START ---');
    var data = extractEventData(event);
    console.log('User:', data.userName, 'Email:', data.userEmail);

    if (!data.spaceName) return;

    var cache = CacheService.getUserCache();
    var stateKey = STATE_KEY_PREFIX + data.userEmail;
    var currentState = cache.get(stateKey);
    console.log('Current state:', currentState);

    // 状態がある場合（金額入力待ち、または運賃確認待ち）の処理
    if (
      currentState &&
      (currentState === STATE_WAITING_FOR_AMOUNT ||
        currentState.indexOf(STATE_WAITING_FOR_FARE_CONFIRMATION) === 0)
    ) {
      handleStatefulInteraction(data.text, data, stateKey, cache, currentState);
      return;
    }

    // Gemini
    var config = getBotConfig();
    var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    var gemini = new GeminiService(apiKey, config.model);
    var responseText = gemini.generateContent(data.text, config.prompt);

    var result;
    try {
      result = parseGeminiResponse(responseText);
    } catch (e) {
      // Geminiの応答がJSONでない場合は、そのまま会話として扱う
      console.warn('Gemini response is not JSON:', responseText);
      result = { intent: 'other', message: responseText };
    }

    if (result.intent === 'commute') {
      handleCommuteIntent(result, data, stateKey, cache);
    } else {
      sendMessage(result.message, data.spaceName);
    }
  } catch (error) {
    console.error('onMessage error:', error);
    if (event.space && event.space.name) {
      sendMessage('❌ エラーが発生しました: ' + error.message, event.space.name);
    }
  }
}

/**
 * 状態に応じたインタラクションを処理します
 */
function handleStatefulInteraction(messageText, data, stateKey, cache, currentState) {
  if (messageText === 'キャンセル') {
    cache.remove(stateKey);
    sendMessage('処理を中断しました。', data.spaceName);
    return;
  }

  // 運賃確認待ちの場合
  if (currentState.indexOf(STATE_WAITING_FOR_FARE_CONFIRMATION) === 0) {
    var lastMonthFare = parseInt(currentState.split('|')[1], 10);
    if (messageText.indexOf('はい') !== -1) {
      var commuteResult = executeCommuteExpense(lastMonthFare, data);
      cache.remove(stateKey);
      sendMessage(
        '先月の運賃（片道' + lastMonthFare + '円）で申請しました！\n\n' + commuteResult.text,
        data.spaceName
      );
      return;
    } else if (messageText.indexOf('いいえ') !== -1) {
      cache.put(stateKey, STATE_WAITING_FOR_AMOUNT, 600);
      sendMessage('了解しました。今回の片道運賃を数字だけで教えてください。', data.spaceName);
      return;
    } else {
      sendMessage(
        '「はい」か「いいえ」で答えてください。（中断する場合は「キャンセル」）',
        data.spaceName
      );
      return;
    }
  }

  // 金額入力待ちの場合
  var numericText = messageText.replace(/[^\d]/g, '');
  var amount = parseInt(numericText, 10);

  if (isNaN(amount) || numericText === '') {
    sendMessage('運賃を数字で入力してください。', data.spaceName);
    return;
  }

  var res = executeCommuteExpense(amount, data);
  cache.remove(stateKey);
  sendMessage('片道' + amount + '円で申請しました！\n\n' + res.text, data.spaceName);
}

/**
 * 通勤費申請の意図を処理します
 */
function handleCommuteIntent(result, data, stateKey, cache) {
  if (result.amount) {
    var commuteResult = executeCommuteExpense(result.amount, data);
    sendMessage(result.message + '\n\n' + commuteResult.text, data.spaceName);
  } else {
    console.log('Searching last month fare...');
    var ssService = new SpreadsheetService();
    var lastMonthFare = ssService.getLastMonthFare(data.userEmail, new Date(), data.userName);

    if (lastMonthFare) {
      console.log('Fare found:', lastMonthFare);
      cache.put(stateKey, STATE_WAITING_FOR_FARE_CONFIRMATION + '|' + lastMonthFare, 600);
      var msg =
        '先月の精算資料から片道運賃 **' +
        lastMonthFare +
        '円** が見つかりました。\nこの運賃を再利用しますか？\n（「はい」または「いいえ」で答えてください）';
      sendMessage(msg, data.spaceName);
    } else {
      cache.put(stateKey, STATE_WAITING_FOR_AMOUNT, 600);
      sendMessage(result.message, data.spaceName);
    }
  }
}

/**
 * チャットにメッセージを送信するヘルパー関数
 */
function sendMessage(text, spaceName) {
  try {
    Chat.Spaces.Messages.create({ text: text }, spaceName);
  } catch (e) {
    console.error('Failed to send message:', e);
  }
}

function getBotConfig() {
  var cache = CacheService.getScriptCache();
  var model = cache.get('GEMINI_MODEL');
  var prompt = cache.get('GEMINI_PROMPT');
  if (model && prompt) return { model: model, prompt: prompt };

  var sheetId = PropertiesService.getScriptProperties().getProperty('COMMUTE_EXPENSE_SPREDSHEET');
  var ss = SpreadsheetApp.openById(sheetId);
  model = ss.getSheetByName('情報').getRange('B1').getValue();
  prompt = ss.getSheetByName('通勤費').getRange('B1').getValue();
  cache.put('GEMINI_MODEL', model, 21600);
  cache.put('GEMINI_PROMPT', prompt, 21600);
  return { model: model, prompt: prompt };
}

function parseGeminiResponse(responseText) {
  var cleanText = responseText
    .replace(/```json\s*/g, '')
    .replace(/```/g, '')
    .trim();
  return JSON.parse(cleanText);
}

function executeCommuteExpense(amount, data) {
  try {
    var roundTripAmount = amount * 2;
    var result =
      typeof main !== 'undefined' && main.applyCommuteExpenses
        ? main.applyCommuteExpenses(new Date(), roundTripAmount, data.userName, data.userEmail)
        : applyCommuteExpenses(new Date(), roundTripAmount, data.userName, data.userEmail);

    var text =
      '出社日: ' +
      (result.dates ? result.dates.join(', ') : 'なし') +
      ' (' +
      result.daysCount +
      '日間)\n' +
      '合計金額: ' +
      result.totalAmount +
      '円';
    if (result.spreadsheetUrl) text += '\n\n精算書: ' + result.spreadsheetUrl;
    return { text: text };
  } catch (error) {
    console.error('executeCommuteExpense error:', error);
    return { text: '❌ 精算処理中にエラーが発生しました。' };
  }
}

function extractEventData(event) {
  var text =
    (event.message && event.message.text) ||
    (event.chat &&
      event.chat.messagePayload &&
      event.chat.messagePayload.message &&
      event.chat.messagePayload.message.text) ||
    '';
  var spaceName =
    (event.space && event.space.name) ||
    (event.chat &&
      event.chat.messagePayload &&
      event.chat.messagePayload.space &&
      event.chat.messagePayload.space.name) ||
    '';
  var user =
    event.user ||
    (event.chat && event.chat.user) ||
    (event.chat && event.chat.messagePayload && event.chat.messagePayload.user) ||
    (event.chat &&
      event.chat.messagePayload &&
      event.chat.messagePayload.message &&
      event.chat.messagePayload.message.sender) ||
    {};
  return {
    text: text.trim(),
    spaceName: spaceName,
    userEmail: user.email || '',
    userName: user.displayName || '',
  };
}

function onAddedToSpace(event) {
  var data = extractEventData(event);
  if (data.spaceName) {
    sendMessage('こんにちは、YV-Botです', data.spaceName);
  }
}

if (typeof module !== 'undefined') {
  module.exports = { onMessage, onAddedToSpace };
}
