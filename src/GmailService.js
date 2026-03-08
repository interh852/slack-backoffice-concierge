/**
 * Gmail操作に関するサービス
 */
class GmailService {
  /**
   * 過去24時間以内の条件に一致するメールを取得する
   * @param {string} subjectQuery 件名の検索条件
   * @param {string} [excludeLabel] 除外するラベル（二重処理防止用）
   * @returns {GmailThread[]} Gmailスレッドの配列
   */
  getRecentThreads(subjectQuery, excludeLabel) {
    const now = new Date();
    const twentyFourHoursAgo = Math.floor((now.getTime() - 24 * 60 * 60 * 1000) / 1000);
    let query = `subject:("${subjectQuery}") after:${twentyFourHoursAgo}`;

    if (excludeLabel) {
      query += ` -label:${excludeLabel}`;
    }

    return GmailApp.search(query);
  }

  /**
   * 過去24時間以内の「月次日報レポート」メールを取得する
   * @deprecated getRecentThreads を使用してください
   * @returns {GmailThread[]} Gmailスレッドの配列
   */
  getRecentMonthlyReports() {
    return this.getRecentThreads('月次日報レポート');
  }
}

// Node.js環境でのテスト用
if (typeof module !== 'undefined') {
  module.exports = { GmailService };
}
