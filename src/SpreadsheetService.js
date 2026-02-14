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
    // ユーザー名の決定（渡された名前があれば使い、なければメールから取得）
    var userName = record.userName || record.userEmail.split('@')[0];
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

/**
 * 先月の精算書を探して片道運賃を取得します。
 * @param {string} userEmail ユーザーのメールアドレス
 * @param {Date} baseDate 基準日（通常は今日）
 * @returns {number|null} 片道運賃、見つからない場合はnull
 */
SpreadsheetService.prototype.getLastMonthFare = function (userEmail, baseDate) {
  try {
    if (!baseDate) baseDate = new Date();
    
    // 1. 先月の targetMonth を計算 (YYYY-MM)
    var lastMonthDate = new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1);
    var lastMonthStr = lastMonthDate.getFullYear() + '-' + (lastMonthDate.getMonth() + 1).toString().padStart(2, '0');
    
    var userName = userEmail.split('@')[0];
    var fileName = '通勤費精算_' + lastMonthStr + '_' + userName;

    // 2. 保存先フォルダの取得
    var folderPath = typeof EXPORT_FOLDER_PATH !== 'undefined' ? EXPORT_FOLDER_PATH : 'backoffice-concierge/通勤費';
    var names = folderPath.split('/');
    var folder = DriveApp.getRootFolder();
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      if (name === '') continue;
      var folders = folder.getFoldersByName(name);
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        return null; // フォルダがなければデータもない
      }
    }

    // 3. ファイルを検索
    var files = folder.getFilesByName(fileName);
    if (!files.hasNext()) return null;

    var file = files.next();
    var spreadsheet = SpreadsheetApp.open(file);
    var sheet = spreadsheet.getSheets()[0];

    // 4. 片道運賃を取得
    var cells = typeof TEMPLATE_CELLS !== 'undefined' ? TEMPLATE_CELLS : { ONE_WAY_COST: 'D2' };
    var fare = sheet.getRange(cells.ONE_WAY_COST).getValue();

    return typeof fare === 'number' ? fare : null;
  } catch (error) {
    console.error('Failed to get last month fare:', error);
    return null;
  }
};

if (typeof module !== 'undefined') {
  module.exports = { SpreadsheetService };
}
