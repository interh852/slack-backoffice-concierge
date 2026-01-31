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

if (typeof module !== 'undefined') {
  module.exports = { SpreadsheetService };
}
