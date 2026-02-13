if (typeof require !== 'undefined') {
  var { TEMPLATE_CELLS, EXPORT_FOLDER_PATH } = require('./Constants');
}

/**
 * スプレッドシート操作を行うクラス
 */
function SpreadsheetService() {}

/**
 * 指定されたパスのフォルダを取得、なければ作成します。
 * @param {string} pathString "folder1/folder2" 形式のパス
 * @returns {GoogleAppsScript.Drive.Folder}
 */
SpreadsheetService.prototype.getOrCreateFolder = function (pathString) {
  var names = pathString.split('/');
  var folder = DriveApp.getRootFolder();
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    if (name === '') continue;
    var folders = folder.getFoldersByName(name);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = folder.createFolder(name);
    }
  }
  return folder;
};

/**
 * テンプレートをコピーしてレコードを流し込み、個人のDriveに保存します。
 * @param {string} templateId テンプレートのスプレッドシートID
 * @param {Object} record 保存するレコード
 * @returns {string} 作成されたスプレッドシートのURL
 */
SpreadsheetService.prototype.exportToTemplate = function (templateId, record) {
  try {
    var userName = record.userEmail.split('@')[0];
    var fileName = '通勤費精算_' + record.targetMonth + '_' + userName;

    // 1. 保存先フォルダの取得・作成
    var folderPath = typeof EXPORT_FOLDER_PATH !== 'undefined' ? EXPORT_FOLDER_PATH : 'backoffice-concierge/通勤費';
    var targetFolder = this.getOrCreateFolder(folderPath);

    // 2. テンプレートをコピー
    var templateFile = DriveApp.getFileById(templateId);
    var copyFile = templateFile.makeCopy(fileName, targetFolder);

    // 3. コピーしたスプレッドシートを開く
    var spreadsheet = SpreadsheetApp.open(copyFile);
    var sheet = spreadsheet.getSheets()[0]; // テンプレートは最初のシートを使用

    // 4. 値を流し込む
    // セル番地は Constants.js の TEMPLATE_CELLS を使用
    var cells = typeof TEMPLATE_CELLS !== 'undefined' ? TEMPLATE_CELLS : {
      USER_NAME: 'A2',
      PASS_STATUS: 'B2',
      ONE_WAY_COST: 'D2',
      DAYS_COUNT: 'E2',
      TOTAL_AMOUNT: 'F2',
      DATE_LIST: 'G2',
    };

    sheet.getRange(cells.USER_NAME).setValue(userName);
    sheet.getRange(cells.PASS_STATUS).setValue('無');
    sheet.getRange(cells.ONE_WAY_COST).setValue(record.unitPrice / 2);
    sheet.getRange(cells.DAYS_COUNT).setValue(record.daysCount);
    sheet.getRange(cells.TOTAL_AMOUNT).setValue(record.totalAmount);
    sheet.getRange(cells.DATE_LIST).setValue(record.dateList);

    return spreadsheet.getUrl();
  } catch (error) {
    console.error('Spreadsheet export failed:', error);
    throw new Error('テンプレートへの出力に失敗しました: ' + (error.message || String(error)));
  }
};

if (typeof module !== 'undefined') {
  module.exports = { SpreadsheetService };
}
