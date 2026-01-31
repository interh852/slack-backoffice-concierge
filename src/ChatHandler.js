if (typeof require !== 'undefined') {
  var main = require('./main');
}

/**
 * Google Chatからのメッセージを受信した時のハンドラ
 */
function onMessage(event) {
  console.log('onMessage called with event:', JSON.stringify(event));
  try {
    // モック可能なようにオブジェクト経由で呼び出す
    if (typeof main !== 'undefined' && main.calculateAndSaveCommuteExpenses) {
      console.log('Calling main.calculateAndSaveCommuteExpenses (Node env)');
      main.calculateAndSaveCommuteExpenses();
    } else {
      console.log('Calling calculateAndSaveCommuteExpenses (GAS env)');
      calculateAndSaveCommuteExpenses();
    }

    console.log('Calculation completed successfully');
    
    // スレッド情報を取得
    var thread = event && event.message && event.message.thread ? event.message.thread : null;

    return {
      actionResponse: {
        type: 'NEW_MESSAGE'
      },
      text: '✅ 交通費の申請を受け付けました！カレンダーの「出社」予定を集計してスプレッドシートに保存しました。',
      thread: thread
    };
  } catch (error) {
    console.error('Error in onMessage:', error);
    return {
      actionResponse: {
        type: 'NEW_MESSAGE'
      },
      text: '❌ エラーが発生しました: ' + (error.message || String(error)),
    };
  }
}

/**
 * ボットがスペースに追加された時のハンドラ
 */
function onAddedToSpace(event) {
  return {
    actionResponse: {
      type: 'NEW_MESSAGE'
    },
    text: 'こんにちは！交通費精算コンシェルジュです。「交通費」と話しかけると、自動でカレンダーを集計して申請します。',
  };
}

function onRemovedFromSpace(event) {
  console.log('Bot removed');
}

if (typeof module !== 'undefined') {
  module.exports = { onMessage, onAddedToSpace };
}
