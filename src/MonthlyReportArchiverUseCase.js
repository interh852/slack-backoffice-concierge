/**
 * 月次日報レポートをアーカイブするユースケース
 */
class MonthlyReportArchiverUseCase {
  constructor() {
    this.gmailService = new GmailService();
  }

  /**
   * 過去24時間以内のレポートを抽出して保存する
   */
  archive() {
    const threads = this.gmailService.getRecentMonthlyReports();
    // TODO: ここでスレッドをループして、PDFを抽出してDriveに保存する
  }

  /**
   * 表題からサイト名を抽出する
   * @param {string} subject メールの表題
   * @returns {string} 抽出されたサイト名
   */
  extractSiteName(subject) {
    if (!subject) return 'Unknown';

    // スペースで区切って最初の要素を取得
    const parts = subject.trim().split(/\s+/);
    const siteName = parts[0];

    // 最初の要素が「月次日報レポート」そのものならサイト名が抜けていると判断
    if (siteName === '月次日報レポート' || !siteName) {
      return 'Unknown';
    }

    return siteName;
  }
}

// Node.js環境でのテスト用
if (typeof module !== 'undefined') {
  var { GmailService } = require('./GmailService');
  module.exports = { MonthlyReportArchiverUseCase };
}
