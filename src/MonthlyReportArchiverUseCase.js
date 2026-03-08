/**
 * 月次日報レポートをアーカイブするユースケース
 */
class MonthlyReportArchiverUseCase {
  constructor() {
    this.gmailService = new GmailService();
    this.driveService = new DriveService();
    // アーカイブ（日報・日次レポート・月次レポート）フォルダのIDをプロパティから取得
    this.baseFolderId = PropertiesService.getScriptProperties().getProperty(
      'WF_BANK_REPORT_DRIVE',
    );
  }

  /**
   * 過去24時間以内のレポートを抽出して保存する
   */
  archive() {
    if (!this.baseFolderId) {
      throw new Error(
        'Script property WF_BANK_REPORT_DRIVE is not defined. Please set the folder ID.',
      );
    }

    const threads = this.gmailService.getRecentMonthlyReports();
    const baseFolder = DriveApp.getFolderById(this.baseFolderId);

    for (const thread of threads) {
      const messages = thread.getMessages();
      for (const message of messages) {
        const subject = message.getSubject();
        const attachments = message.getAttachments();

        if (attachments.length === 0) continue;

        const siteName = this.extractSiteName(subject);
        const relativePath = `${siteName}/Daily Summary`;

        try {
          const folder = this.driveService.getFolderFromPath(
            relativePath,
            baseFolder,
          );

          for (const attachment of attachments) {
            // PDFファイルのみを対象にする
            if (attachment.getContentType() === 'application/pdf') {
              folder.createFile(attachment);
              console.log(`Saved: ${attachment.getName()} to ${relativePath}`);
            }
          }
        } catch (e) {
          console.error(`Skipping "${subject}": ${e.message}`);
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
