// 依存関係を Node.js 形式で読み込む
// GAS上ではこれらはグローバル変数として見える
if (typeof require !== 'undefined') {
  var { getSettlementPeriod } = require('./PeriodCalculator');
  var { CalendarService } = require('./CalendarService');
  var { SpreadsheetService } = require('./SpreadsheetService');
  var { COMMUTE_UNIT_PRICE, SPREADSHEET_ID, SHEET_NAME } = require('./Constants');
}

/**
 * 交通費を計算してスプレッドシートに保存するメイン関数
 * @param {Date} baseDate 基準日
 */
function calculateAndSaveCommuteExpenses(baseDate) {
  if (!baseDate) baseDate = new Date();

  var userEmail = Session.getActiveUser().getEmail();

  // 1. 精算期間の計算
  var period = getSettlementPeriod(baseDate);

  // 2. カレンダーから集計
  var calendarService = new CalendarService();
  var summary = calendarService.getCommuteSummary(period.startDate, period.endDate);

  // 3. 金額計算
  var totalAmount = summary.count * COMMUTE_UNIT_PRICE;

  var targetYear = period.endDate.getFullYear();
  var targetMonth = period.endDate.getMonth() + 1;
  var targetMonthStr = targetYear + '-' + targetMonth.toString().padStart(2, '0');

  // 4. 保存
  var spreadsheetService = new SpreadsheetService(SPREADSHEET_ID, SHEET_NAME);
  spreadsheetService.saveRecord({
    applicationDate: baseDate,
    userEmail: userEmail,
    targetMonth: targetMonthStr,
    unitPrice: COMMUTE_UNIT_PRICE,
    daysCount: summary.count,
    totalAmount: totalAmount,
    dateList: summary.dates.join(', '),
  });
}

if (typeof module !== 'undefined') {
  module.exports = { calculateAndSaveCommuteExpenses };
}
