/**
 * Google Chatからのメッセージを処理するクラス
 */

if (typeof module !== 'undefined') {
  const { GeminiService } = require('./GeminiService');
  const { SpreadsheetService } = require('./SpreadsheetService');
  const { CommuteExpenseUseCase } = require('./CommuteExpenseUseCase');
  const {
    STATE_KEY_PREFIX,
    STATE_WAITING_FOR_AMOUNT,
    STATE_WAITING_FOR_FARE_CONFIRMATION,
    getSpreadsheetId,
  } = require('./Constants');
}

/**
 * チャットイベントを受け取るメイン関数
 * @param {Object} event Google Chatからのイベント
 * @returns {Object} 返信メッセージ
 */
function onMessage(event) {
  console.log('--- onMessage START ---');
  var user = event.user;
  console.log('User: ' + user.displayName + ' Email: ' + user.email);

  var messageText = event.message.text;
  var userEmail = user.email;

  // 1. ユーザーの状態を取得
  var userState = getUserState(userEmail);
  console.log('Current state: ' + userState);

  // 状態に応じた処理
  if (userState && userState.indexOf(STATE_WAITING_FOR_FARE_CONFIRMATION) === 0) {
    return handleFareConfirmation(event, userState);
  } else if (userState === STATE_WAITING_FOR_AMOUNT) {
    return handleAmountInput(event);
  }

  // キャンセルコマンドの処理
  if (messageText.indexOf('キャンセル') !== -1) {
    clearUserState(userEmail);
    return { text: '処理を中断しました。' };
  }

  // 2. Geminiで意図解析
  var gemini = new GeminiService();
  var configId = typeof getSpreadsheetId === 'function' ? getSpreadsheetId() : '';
  var result = gemini.analyzeIntent(messageText, configId);

  // 3. 意図に応じた振り分け
  switch (result.intent) {
    case 'commute_expense':
      return handleCommuteIntent(event);
    case 'set_amount':
      return handleAmountIntent(event, result.amount);
    case 'other':
    default:
      return { text: result.message || 'すみません、よくわかりませんでした。' };
  }
}

/**
 * 通勤費精算の開始処理
 */
function handleCommuteIntent(event) {
  var userEmail = event.user.email;
  var userName = event.user.displayName;

  // 1. 先月の運賃があるか確認
  var spreadsheetService = new SpreadsheetService();
  var now = new Date();
  var lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  var targetMonth = lastMonth.getFullYear() + '-' + (lastMonth.getMonth() + 1).toString().padStart(2, '0');

  console.log('Searching last month fare...');
  var lastFare = spreadsheetService.getLastMonthFare(targetMonth, userName);

  if (lastFare) {
    console.log('Fare found: ' + lastFare);
    setUserState(userEmail, STATE_WAITING_FOR_FARE_CONFIRMATION + '|' + lastFare);
    return {
      text: '先月の片道運賃（' + lastFare + '円）を再利用しますか？ 「はい」か「いいえ」で答えてね。',
    };
  }

  // 2. なければ金額入力を促す
  setUserState(userEmail, STATE_WAITING_FOR_AMOUNT);
  return { text: '片道運賃（円）を教えてください！' };
}

/**
 * 運賃再利用の確認処理
 */
function handleFareConfirmation(event, state) {
  var text = event.message.text;
  var userEmail = event.user.email;
  var userName = event.user.displayName;
  var lastFare = parseInt(state.split('|')[1]);

  if (text.indexOf('はい') !== -1 || text.indexOf('再利用') !== -1) {
    clearUserState(userEmail);
    return executeApplication(userEmail, userName, lastFare);
  } else if (text.indexOf('いいえ') !== -1) {
    setUserState(userEmail, STATE_WAITING_FOR_AMOUNT);
    return { text: '了解です！新しい片道運賃（円）を教えてください。' };
  } else {
    return { text: '「はい」か「いいえ」で答えてね！' };
  }
}

/**
 * 金額入力の処理
 */
function handleAmountInput(event) {
  var text = event.message.text;
  var amount = parseInt(text.replace(/[^0-9]/g, ''));

  if (isNaN(amount)) {
    return { text: '数字で金額を教えてほしいな！' };
  }

  var userEmail = event.user.email;
  var userName = event.user.displayName;
  clearUserState(userEmail);

  return executeApplication(userEmail, userName, amount);
}

/**
 * 明示的な金額指定の処理
 */
function handleAmountIntent(event, amount) {
  if (!amount) {
    setUserState(event.user.email, STATE_WAITING_FOR_AMOUNT);
    return { text: '片道運賃は何円かな？' };
  }
  return executeApplication(event.user.email, event.user.displayName, amount);
}

/**
 * 実際の精算処理を実行
 */
function executeApplication(userEmail, userName, unitPrice) {
  var useCase = new CommuteExpenseUseCase();
  var result = useCase.execute(new Date(), unitPrice, userName, userEmail);

  return {
    text:
      userName + 'さんの精算を受け付けたよ！✨\n' +
      '期間中の出社日数: ' + result.daysCount + '日\n' +
      '合計金額: ' + result.totalAmount + '円\n' +
      '精算書を作成したよ: ' + result.spreadsheetUrl,
  };
}

// ユーザー状態管理の簡易実装（PropertiesServiceを使用）
function getUserState(email) {
  var prefix = typeof STATE_KEY_PREFIX !== 'undefined' ? STATE_KEY_PREFIX : 'state_';
  return PropertiesService.getUserProperties().getProperty(prefix + email);
}

function setUserState(email, state) {
  var prefix = typeof STATE_KEY_PREFIX !== 'undefined' ? STATE_KEY_PREFIX : 'state_';
  PropertiesService.getUserProperties().setProperty(prefix + email, state);
}

function clearUserState(email) {
  var prefix = typeof STATE_KEY_PREFIX !== 'undefined' ? STATE_KEY_PREFIX : 'state_';
  PropertiesService.getUserProperties().deleteProperty(prefix + email);
}

if (typeof module !== 'undefined') {
  module.exports = { onMessage };
}
