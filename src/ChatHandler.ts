import { calculateAndSaveCommuteExpenses } from './main';

/**
 * Google Chatからメッセージを受信した時のイベントハンドラ
 * @param event イベントオブジェクト
 * @returns レスポンスメッセージ
 */
export function onMessage(event: any): any {
  try {
    // 交通費計算と保存を実行
    // ※ Chatからの呼び出しでは、Session.getActiveUser() が「チャットを実行したユーザー」になるため
    // main.ts のロジックそのままで、そのユーザーのカレンダーを見に行ける！
    calculateAndSaveCommuteExpenses();

    return {
      text: '✅ 交通費の申請を受け付けました！カレンダーの「出社」予定を集計してスプレッドシートに保存しました。'
    };

  } catch (error) {
    return {
      text: `❌ エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * ボットがスペースに追加された時のイベントハンドラ
 * @param event イベントオブジェクト
 */
export function onAddToSpace(event: any): { text: string } {
  return {
    text: 'こんにちは！交通費精算コンシェルジュです。「交通費」と話しかけると、自動でカレンダーを集計して申請します。'
  };
}

/**
 * ボットがスペースから削除された時のイベントハンドラ（必要に応じて）
 */
export function onRemoveFromSpace(event: any): void {
  console.log('Bot removed from space');
}
