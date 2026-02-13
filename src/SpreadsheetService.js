if (typeof require !== 'undefined') {
  var { TEMPLATE_CELLS } = require('./Constants');
}

/**
 * スプレッドシート操作を行うクラス
 */
function SpreadsheetService() {}

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

    // 1. テンプレートをコピー
    var templateFile = DriveApp.getFileById(templateId);
    var copyFile = templateFile.makeCopy(fileName);

    // 2. コピーしたスプレッドシートを開く
    var spreadsheet = SpreadsheetApp.open(copyFile);
    var sheet = spreadsheet.getSheets()[0]; // テンプレートは最初のシートを使用

    // 3. 値を流し込む
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
