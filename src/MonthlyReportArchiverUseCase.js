/**
 * 月次日報レポートをアーカイブするユースケース
 */
class MonthlyReportArchiverUseCase {
  constructor() {
    this.gmailService = new GmailService();
    this.driveService = new DriveService();
    this.basePath =
      '50_風車管理/金融機関報告/アーカイブ（日報・日次レポート・月次レポート）';
  }

  /**
   * 過去24時間以内のレポートを抽出して保存する
   */
  archive() {
    const threads = this.gmailService.getRecentMonthlyReports();

    for (const thread of threads) {
      const messages = thread.getMessages();
      for (const message of messages) {
        const subject = message.getSubject();
        const attachments = message.getAttachments();

        if (attachments.length === 0) continue;

        const siteName = this.extractSiteName(subject);
        const folderPath = `${this.basePath}/${siteName}/Daily Summary`;
        const folder = this.driveService.getOrCreateFolderFromPath(folderPath);

        for (const attachment of attachments) {
          // PDFファイルのみを対象にする
          if (attachment.getContentType() === 'application/pdf') {
            folder.createFile(attachment);
            console.log(`Saved: ${attachment.getName()} to ${folderPath}`);
          }
        }
      }
    }
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
  var { DriveService } = require('./DriveService');
  module.exports = { MonthlyReportArchiverUseCase };
}
