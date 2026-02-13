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
  var sheet = spreadsheet.getSheets()[0]; // テンプレートは最初のシートを使用

  // 3. 値を流し込む
  // A2: 名前
  // B2: 有効期限内の定期券の有無
  // D2: 片道交通費
  // E2: 出社日数
  // F2: 交通費支給額
  // G2: 実際に出社した日付記入欄
  var cellMapping = {
    A2: userName,
    B2: '無',
    D2: record.unitPrice / 2,
    E2: record.daysCount,
    F2: record.totalAmount,
    G2: record.dateList,
  };

  for (var cell in cellMapping) {
    sheet.getRange(cell).setValue(cellMapping[cell]);
  }

  return spreadsheet.getUrl();
};

if (typeof module !== 'undefined') {
  module.exports = { SpreadsheetService };
}
