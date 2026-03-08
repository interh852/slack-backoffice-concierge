/**
 * 月次日報レポートをアーカイブするユースケース
 */
class MonthlyReportArchiverUseCase {
  constructor() {
    // 依存関係の解決
    const _GmailService = typeof GmailService !== 'undefined' ? GmailService : (typeof _LocalGmailService !== 'undefined' ? _LocalGmailService : null);
    const _DriveService = typeof DriveService !== 'undefined' ? DriveService : (typeof _LocalDriveService !== 'undefined' ? _LocalDriveService : null);
    const _SpreadsheetService = typeof SpreadsheetService !== 'undefined' ? SpreadsheetService : (typeof _LocalSpreadsheetService !== 'undefined' ? _LocalSpreadsheetService : null);
    const _config = typeof ARCHIVE_CONFIG !== 'undefined' ? ARCHIVE_CONFIG : (typeof _LocalArchiveConfig !== 'undefined' ? _LocalArchiveConfig : {});
    const _getSpreadsheetId = typeof getSpreadsheetId === 'function' ? getSpreadsheetId : (typeof _LocalConstants !== 'undefined' ? _LocalConstants.getSpreadsheetId : function() { return ''; });

    this.gmailService = new _GmailService();
    this.driveService = new _DriveService();
    this.spreadsheetService = new _SpreadsheetService();
    this.config = _config;
    
    // 設定用スプレッドシートからサイト名のマッピングを取得
    const ssId = _getSpreadsheetId();
    this.siteNameMap = this.spreadsheetService.getSiteNameMap(ssId);
    console.log('サイト名マッピングを読み込みました: ' + JSON.stringify(this.siteNameMap));
    
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
      throw new Error('スクリプトプロパティ ' + this.config.DRIVE_PROP_KEY + ' が設定されていません。');
    }

    console.log('月次日報レポートのアーカイブを開始します...');

    // 処理済みラベルを除外して取得
    const threads = this.gmailService.getRecentThreads(
      this.config.TARGET_SUBJECT,
      this.config.PROCESSED_LABEL
    );
    
    console.log('対象となる可能性のあるメールスレッド数: ' + threads.length);

    const baseFolder = DriveApp.getFolderById(this.baseFolderId);

    // 処理済みラベルの取得（存在しなければ作成）
    let processedLabel = GmailApp.getUserLabelByName(this.config.PROCESSED_LABEL);
    if (!processedLabel) {
      processedLabel = GmailApp.createLabel(this.config.PROCESSED_LABEL);
    }

    for (const thread of threads) {
      const messages = thread.getMessages();
      let isThreadProcessed = false;

      console.log('スレッドをチェック中: ' + messages[0].getSubject());

      for (const message of messages) {
        const subject = message.getSubject();
        const attachments = message.getAttachments();

        if (attachments.length === 0) continue;

        const rawSiteName = this.extractSiteName(subject);
        const siteDisplayName = this.siteNameMap[rawSiteName] || rawSiteName;
        const relativePath = siteDisplayName + '/' + this.config.TARGET_SUBFOLDER;

        try {
          const folder = this.driveService.getFolderFromPath(relativePath, baseFolder, false);

          for (const attachment of attachments) {
            const fileName = attachment.getName();
            const contentType = attachment.getContentType();
            
            // PDF判定: MIMEタイプがPDF、または拡張子が .pdf の場合
            const isPdf = contentType === this.config.TARGET_MIME_TYPE || 
                          (fileName && fileName.toLowerCase().endsWith('.pdf'));
            
            if (isPdf) {
              // octet-stream の場合は PDF として明示的に保存できるように調整
              let blob = attachment.copyBlob();
              if (contentType !== 'application/pdf') {
                blob.setContentType('application/pdf');
              }
              
              folder.createFile(blob);
              console.log('    - 【成功】ファイルを保存しました: ' + fileName + ' -> ' + relativePath);
              isThreadProcessed = true;
            } else {
              console.log('    - 【スキップ】PDFではないため保存しません: ' + fileName + ' (' + contentType + ')');
            }
          }
        } catch (e) {
          console.error('  - 【エラー】' + e.message);
        }
      }

      if (isThreadProcessed) {
        thread.addLabel(processedLabel);
        console.log('スレッドを「処理済み」としてマークしました。');
      }
    }
    
    console.log('アーカイブ処理が完了しました。');
  }

  /**
   * 表題からサイト名を抽出する
   */
  extractSiteName(subject) {
    if (!subject) return 'Unknown';
    const parts = subject.trim().split(/\s+/);
    const siteName = parts[0];
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
  var _LocalSpreadsheetService = require('./SpreadsheetService').SpreadsheetService;
  var _LocalArchiveConfig = require('./Constants').ARCHIVE_CONFIG;
  var _LocalConstants = require('./Constants');
  module.exports = { MonthlyReportArchiverUseCase };
}
