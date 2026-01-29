import { calculateAndSaveCommuteExpenses } from './main';

/**
 * SlackからのPOSTリクエストを処理します。
 * 通常、GASのdoPost関数から呼び出されます。
 * 
 * @param e GASのdoPostイベントオブジェクト
 * @returns Slackへのレスポンス
 */
export function handleSlackRequest(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
  try {
    // 交通費計算と保存を実行
    // ※ 実際にはe.parameter.user_idなどを使ってユーザーを特定するロジックが必要ですが、
    // 現状はSession.getActiveUser()に依存しているため、そのまま呼び出します。
    calculateAndSaveCommuteExpenses();

    const response = {
      response_type: 'ephemeral',
      text: '✅ 交通費の申請を受け付けました！カレンダーの「出社」予定を集計してスプレッドシートに保存しました。'
    };

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    const errorResponse = {
      response_type: 'ephemeral',
      text: `❌ エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`
    };

    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * GASの公開エントリーポイント
 */
function doPost(e: GoogleAppsScript.Events.DoPost) {
  return handleSlackRequest(e);
}
