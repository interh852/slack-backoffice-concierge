// 依存関係を Node.js 形式で読み込む
if (typeof require !== 'undefined') {
  var { getSettlementPeriod } = require('./PeriodCalculator');
  var { CalendarService } = require('./CalendarService');
  var { SpreadsheetService } = require('./SpreadsheetService');
  var { COMMUTE_UNIT_PRICE, SPREADSHEET_ID, SHEET_NAME } = require('./Constants');
}

/**
 * 交通費を計算してスプレッドシートに保存するメイン関数
 * @param {Date} baseDate 基準日
 * @param {number} unitPrice 単価（往復分、省略時は定数を使用）
 * @returns {Object} 計算結果 { daysCount, totalAmount, dates }
 */
function calculateAndSaveCommuteExpenses(baseDate, unitPrice) {
  console.log('calculateAndSaveCommuteExpenses started');
  if (!baseDate) baseDate = new Date();
  
  // 単価の決定
  var currentUnitPrice = typeof unitPrice === 'number' ? unitPrice : COMMUTE_UNIT_PRICE;
  
  var userEmail = Session.getActiveUser().getEmail();
  console.log('User Email:', userEmail);
  
  // 1. 精算期間の計算
  var period = getSettlementPeriod(baseDate);
  console.log('Period:', period.startDate, 'to', period.endDate);
  
  // 2. カレンダーから集計
  var calendarService = new CalendarService();
  var summary = calendarService.getCommuteSummary(period.startDate, period.endDate);
  console.log('Commute Summary:', summary);
  
  // 3. 金額計算
  var totalAmount = summary.count * currentUnitPrice;
  
  var targetYear = period.endDate.getFullYear();
  var targetMonth = period.endDate.getMonth() + 1;
  var targetMonthStr = targetYear + '-' + targetMonth.toString().padStart(2, '0');
  
  // 4. 保存
  var spreadsheetService = new SpreadsheetService(SPREADSHEET_ID, SHEET_NAME);
  console.log('Saving to spreadsheet:', SPREADSHEET_ID, SHEET_NAME);
  spreadsheetService.saveRecord({
    applicationDate: baseDate,
    userEmail: userEmail,
    targetMonth: targetMonthStr,
    unitPrice: currentUnitPrice,
    daysCount: summary.count,
    totalAmount: totalAmount,
    dateList: summary.dates.join(', ')
  });
  console.log('Saved successfully');

  return {
    daysCount: summary.count,
    totalAmount: totalAmount,
    dates: summary.dates
  };
}

if (typeof module !== 'undefined') {
  module.exports = { calculateAndSaveCommuteExpenses };
}
