if (typeof require !== 'undefined') {
  var main = require('./main');
  var { CHAT_KEYWORD, STATE_KEY_PREFIX, STATE_WAITING_FOR_AMOUNT } = require('./Constants');
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

  // 金額入力待ちの状態チェック
  if (currentState === STATE_WAITING_FOR_AMOUNT) {
    handleAmountInput(messageText, spaceName, stateKey, cache);
    return;
  }

  // キーワードチェック（新規フロー開始）
  var keyword = typeof CHAT_KEYWORD !== 'undefined' ? CHAT_KEYWORD : '通勤費';
  if (messageText.indexOf(keyword) !== -1) {
    var waitingState =
      typeof STATE_WAITING_FOR_AMOUNT !== 'undefined'
        ? STATE_WAITING_FOR_AMOUNT
        : 'WAITING_FOR_AMOUNT';
    cache.put(stateKey, waitingState, 600); // 10分間有効
    Chat.Spaces.Messages.create(
      { text: '片道の通勤費を数値で教えてください（例: 500）' },
      spaceName
    );
    return;
  }

  // それ以外のメッセージ
  Chat.Spaces.Messages.create(
    {
      text:
        '「' +
        keyword +
        '」という言葉を含めて話しかけてください。自動でカレンダーを集計して申請します。',
    },
    spaceName
  );
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

  // 文字列から数字部分だけを抽出（例: "500円" -> "500", "¥ 1,000" -> "1000"）
  var numericText = messageText.replace(/[^\d]/g, '');
  var amount = parseInt(numericText, 10);

  if (isNaN(amount) || numericText === '') {
    Chat.Spaces.Messages.create(
      { text: '数値を入力してください。中断する場合は「キャンセル」と入力してください。' },
      spaceName
    );
    return;
  }

  try {
    var roundTripAmount = amount * 2;
    var result;
    if (typeof main !== 'undefined' && main.applyCommuteExpenses) {
      result = main.applyCommuteExpenses(new Date(), roundTripAmount);
    } else {
      result = applyCommuteExpenses(new Date(), roundTripAmount);
    }

    var message =
      '✅ 通勤費の申請を受け付けました！\n\n' +
      '出社日: ' +
      (result.dates ? result.dates.join(', ') : 'なし') +
      ' (' +
      result.daysCount +
      '日間)\n' +
      '通勤費: ' +
      result.totalAmount +
      '円';

    Chat.Spaces.Messages.create({ text: message }, spaceName);
    cache.remove(stateKey);
  } catch (error) {
    console.error('Error in handleAmountInput:', error);
    Chat.Spaces.Messages.create(
      { text: '❌ エラーが発生しました: ' + (error.message || String(error)) },
      spaceName
    );
  }
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
  var keyword = typeof CHAT_KEYWORD !== 'undefined' ? CHAT_KEYWORD : '通勤費';

  if (data.spaceName) {
    Chat.Spaces.Messages.create(
      {
        text:
          'こんにちは！交通費精算コンシェルジュです。「' +
          keyword +
          '」と話しかけると、自動でカレンダーを集計して申請します。',
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
  module.exports = { onMessage, onAddedToSpace: onAddedToSpace };
}

/**
 * ボットがスペースに追加された時のハンドラ
 */
function onAddedToSpace(event) {
  var spaceName = '';
  if (event.space) {
    spaceName = event.space.name;
  } else if (event.chat && event.chat.messagePayload && event.chat.messagePayload.space) {
    spaceName = event.chat.messagePayload.space.name;
  }

  var keyword = typeof CHAT_KEYWORD !== 'undefined' ? CHAT_KEYWORD : '通勤費';

  if (spaceName) {
    Chat.Spaces.Messages.create(
      {
        text:
          'こんにちは！交通費精算コンシェルジュです。「' +
          keyword +
          '」と話しかけると、自動でカレンダーを集計して申請します。',
      },
      spaceName
    );
  }
  return;
}

function onRemovedFromSpace(event) {
  console.log('Bot removed');
}

if (typeof module !== 'undefined') {
  module.exports = { onMessage, onAddToSpace: onAddedToSpace };
}
