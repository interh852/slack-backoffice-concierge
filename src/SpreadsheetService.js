/**
 * スプレッドシートにレコードを保存するクラス
 * @param {string} spreadsheetId
 * @param {string} sheetName
 */
function SpreadsheetService(spreadsheetId, sheetName) {
  this.spreadsheetId = spreadsheetId;
  this.sheetName = sheetName;
}

/**
 * スプレッドシートにレコードを保存します。
 * @param {Object} record 保存するレコード
 */
SpreadsheetService.prototype.saveRecord = function (record) {
  var spreadsheet = SpreadsheetApp.openById(this.spreadsheetId);
  var sheet = spreadsheet.getSheetByName(this.sheetName);

  if (!sheet) {
    throw new Error('Sheet "' + this.sheetName + '" not found');
  }

  sheet.appendRow([
    record.applicationDate,
    record.userEmail,
    record.targetMonth,
    record.unitPrice,
    record.daysCount,
    record.totalAmount,
    record.dateList,
  ]);
};

/**
 * テンプレートをコピーしてレコードを流し込み、個人のDriveに保存します。
 * @param {string} templateId テンプレートのスプレッドシートID
 * @param {Object} record 保存するレコード
 * @returns {string} 作成されたスプレッドシートのURL
 */
SpreadsheetService.prototype.exportToTemplate = function (templateId, record) {
  var userName = record.userEmail.split('@')[0];
  var fileName = '通勤費精算_' + record.targetMonth + '_' + userName;

  // 1. テンプレートをコピー
  var templateFile = DriveApp.getFileById(templateId);
  var copyFile = templateFile.makeCopy(fileName);

  // 2. コピーしたスプレッドシートを開く
  var spreadsheet = SpreadsheetApp.open(copyFile);
  var sheet = spreadsheet.getSheetByName(this.sheetName) || spreadsheet.getSheets()[0];

  // 3. 値を流し込む（セルの位置は仮定）
  var cellMapping = {
    B2: record.applicationDate,
    B3: userName,
    B4: record.targetMonth,
    B5: record.unitPrice,
    B6: record.daysCount,
    B7: record.totalAmount,
    B8: record.dateList,
  };

  for (var cell in cellMapping) {
    sheet.getRange(cell).setValue(cellMapping[cell]);
  }

  return spreadsheet.getUrl();
};

if (typeof module !== 'undefined') {
  module.exports = { SpreadsheetService };
}
