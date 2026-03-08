/**
 * 月次日報レポートをアーカイブするユースケース
 */
class MonthlyReportArchiverUseCase {
  constructor() {
    // 依存関係の解決
    const _GmailService = typeof GmailService !== 'undefined' ? GmailService : (typeof _LocalGmailService !== 'undefined' ? _LocalGmailService : null);
    const _DriveService = typeof DriveService !== 'undefined' ? DriveService : (typeof _LocalDriveService !== 'undefined' ? _LocalDriveService : null);
    const _config = typeof ARCHIVE_CONFIG !== 'undefined' ? ARCHIVE_CONFIG : (typeof _LocalArchiveConfig !== 'undefined' ? _LocalArchiveConfig : {});

    this.gmailService = new _GmailService();
    this.driveService = new _DriveService();
    this.config = _config;
    
    // アーカイブ先フォルダのIDをプロパティから取得
    this.baseFolderId = PropertiesService.getScriptProperties().getProperty(
      this.config.DRIVE_PROP_KEY
    );
  }

  /**
   * 過去24時間以内のレポートを抽出して保存する
   */
  archive() {
    if (!this.baseFolderId) {
      throw new Error(`Script property ${this.config.DRIVE_PROP_KEY} is not defined.`);
    }

    // 処理済みラベルを除外して取得
    const threads = this.gmailService.getRecentThreads(
      this.config.TARGET_SUBJECT,
      this.config.PROCESSED_LABEL
    );
    const baseFolder = DriveApp.getFolderById(this.baseFolderId);

    // 処理済みラベルの取得（存在しなければ作成）
    let processedLabel = GmailApp.getUserLabelByName(this.config.PROCESSED_LABEL);
    if (!processedLabel) {
      processedLabel = GmailApp.createLabel(this.config.PROCESSED_LABEL);
    }

    for (const thread of threads) {
      const messages = thread.getMessages();
      let isThreadProcessed = false;

      for (const message of messages) {
        const subject = message.getSubject();
        const attachments = message.getAttachments();

        if (attachments.length === 0) continue;

        const siteName = this.extractSiteName(subject);
        const relativePath = `${siteName}/${this.config.TARGET_SUBFOLDER}`;

        try {
          // フォルダが存在しない場合はエラーにする (createIfMissing = false)
          const folder = this.driveService.getFolderFromPath(relativePath, baseFolder, false);

          for (const attachment of attachments) {
            // PDFファイルのみを対象にする
            if (attachment.getContentType() === this.config.TARGET_MIME_TYPE) {
              folder.createFile(attachment);
              console.log(`Saved: ${attachment.getName()} to ${relativePath}`);
              isThreadProcessed = true;
            }
          }
        } catch (e) {
          console.error(`Skipping "${subject}": ${e.message}`);
        }
      }

      // スレッド内の処理が少なくとも1つ行われた場合はラベルを付与して次回からスキップ
      if (isThreadProcessed) {
        thread.addLabel(processedLabel);
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
    const targetSubject = this.config.TARGET_SUBJECT || '月次日報レポート';
    if (siteName === targetSubject || !siteName) {
      return 'Unknown';
    }

    return siteName;
  }
}

// Node.js環境でのテスト用
if (typeof module !== 'undefined') {
  var _LocalGmailService = require('./GmailService').GmailService;
  var _LocalDriveService = require('./DriveService').DriveService;
  var _LocalArchiveConfig = require('./Constants').ARCHIVE_CONFIG;
  module.exports = { MonthlyReportArchiverUseCase };
}
