/**
 * Gmail操作に関するサービス
 */
class GmailService {
  /**
   * 過去24時間以内の「月次日報レポート」メールを取得する
   * @returns {GmailThread[]} Gmailスレッドの配列
   */
  getRecentMonthlyReports() {
    const now = new Date();
    const twentyFourHoursAgo = Math.floor((now.getTime() - 24 * 60 * 60 * 1000) / 1000);
    const query = `subject:("月次日報レポート") after:${twentyFourHoursAgo}`;
    return GmailApp.search(query);
  }
}

// Node.js環境でのテスト用
if (typeof module !== 'undefined') {
  module.exports = { GmailService };
}
