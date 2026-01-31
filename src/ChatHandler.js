if (typeof require !== 'undefined') {
  var main = require('./main');
}

/**
 * Google Chatからのメッセージを受信した時のハンドラ
 */
function onMessage(event) {
  console.log('onMessage called with event:', JSON.stringify(event));
  
  // スペース名を安全に取得
  var spaceName = "";
  if (event.space) {
    spaceName = event.space.name;
  } else if (event.chat && event.chat.messagePayload && event.chat.messagePayload.space) {
    spaceName = event.chat.messagePayload.space.name;
  }
  
  try {
    // 処理実行
    if (typeof main !== 'undefined' && main.calculateAndSaveCommuteExpenses) {
      console.log('Calling main.calculateAndSaveCommuteExpenses (Node env)');
      main.calculateAndSaveCommuteExpenses();
    } else {
      console.log('Calling calculateAndSaveCommuteExpenses (GAS env)');
      calculateAndSaveCommuteExpenses();
    }

    console.log('Calculation completed successfully');
    
    // 非同期でメッセージ送信
    if (spaceName) {
      Chat.Spaces.Messages.create(
        { text: '✅ 交通費の申請を受け付けました！カレンダーの「出社」予定を集計してスプレッドシートに保存しました。' },
        spaceName
      );
    } else {
      console.error('Space name not found in event object');
    }
    
  } catch (error) {
    console.error('Error in onMessage:', error);
    
    // エラー時も非同期で送信
    if (spaceName) {
      Chat.Spaces.Messages.create(
        { text: '❌ エラーが発生しました: ' + (error.message || String(error)) },
        spaceName
      );
    }
  }
  
  // 同期レスポンスは空でOK
  return;
}

/**
 * ボットがスペースに追加された時のハンドラ
 */
function onAddedToSpace(event) {
  var spaceName = "";
  if (event.space) {
    spaceName = event.space.name;
  } else if (event.chat && event.chat.messagePayload && event.chat.messagePayload.space) {
    spaceName = event.chat.messagePayload.space.name;
  }

  if (spaceName) {
    Chat.Spaces.Messages.create(
      { text: 'こんにちは！交通費精算コンシェルジュです。「交通費」と話しかけると、自動でカレンダーを集計して申請します。' },
      spaceName
    );
  }
  return;
}

function onRemovedFromSpace(event) {
  console.log('Bot removed');
}

if (typeof module !== 'undefined') {
  module.exports = { onMessage, onAddedToSpace };
}
