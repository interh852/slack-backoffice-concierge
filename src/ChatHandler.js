if (typeof require !== 'undefined') {
  var main = require('./main');
}

/**
 * Google Chatからのメッセージを受信した時のハンドラ
 */
function onMessage(event) {
  try {
    // モック可能なようにオブジェクト経由で呼び出す
    if (typeof main !== 'undefined' && main.calculateAndSaveCommuteExpenses) {
      main.calculateAndSaveCommuteExpenses();
    } else {
      // GAS環境ではグローバル関数として存在するはず（ここがちょっと微妙だけど）
      // あるいはGAS環境でも main オブジェクトとしてロードされる構成にするか...
      // いったん「GAS環境ではグローバル関数 calculateAndSaveCommuteExpenses がある」前提で書くならこう：
      calculateAndSaveCommuteExpenses();
    }

    return {
      text: '✅ 交通費の申請を受け付けました！カレンダーの「出社」予定を集計してスプレッドシートに保存しました。',
    };
  } catch (error) {
    return {
      text: '❌ エラーが発生しました: ' + (error.message || String(error)),
    };
  }
}

/**
 * ボットがスペースに追加された時のハンドラ
 */
function onAddToSpace(event) {
  return {
    text: 'こんにちは！交通費精算コンシェルジュです。「交通費」と話しかけると、自動でカレンダーを集計して申請します。',
  };
}

function onRemoveFromSpace(event) {
  console.log('Bot removed');
}

if (typeof module !== 'undefined') {
  module.exports = { onMessage, onAddToSpace };
}
