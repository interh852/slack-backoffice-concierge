if (typeof require !== 'undefined') {
  var { getSettlementPeriod } = require('./PeriodCalculator');
  var { CalendarService } = require('./CalendarService');
  var { SpreadsheetService } = require('./SpreadsheetService');
  var { COMMUTE_UNIT_PRICE, TEMPLATE_SPREADSHEET_ID } = require('./Constants');
}

/**
 * 通勤費精算ユースケース
 */
function CommuteExpenseUseCase() {}

/**
 * 通勤費を計算して保存する
 * @param {Date} baseDate 基準日
 * @param {number} unitPrice 単価（往復分、省略時は定数を使用）
 * @returns {Object} 計算結果 { daysCount, totalAmount, dates, spreadsheetUrl }
 */
CommuteExpenseUseCase.prototype.execute = function (baseDate, unitPrice) {
  console.log('CommuteExpenseUseCase.execute started');
  if (!baseDate) baseDate = new Date();

  // 単価の決定
  var defaultPrice = typeof COMMUTE_UNIT_PRICE !== 'undefined' ? COMMUTE_UNIT_PRICE : 1000;
  var currentUnitPrice = typeof unitPrice === 'number' ? unitPrice : defaultPrice;

  var userEmail = Session.getActiveUser().getEmail();

  // 1. 精算期間の計算
  var period = getSettlementPeriod(baseDate);

  // 2. カレンダーから集計
  var calendarService = new CalendarService();
  var summary = calendarService.getCommuteSummary(period.startDate, period.endDate);

  // 3. 金額計算
  var totalAmount = summary.count * currentUnitPrice;

  var targetYear = period.endDate.getFullYear();
  var targetMonth = period.endDate.getMonth() + 1;
  var targetMonthStr = targetYear + '-' + targetMonth.toString().padStart(2, '0');

  // 4. 保存（テンプレートへの出力のみ）
  var templateId = typeof TEMPLATE_SPREADSHEET_ID !== 'undefined' ? TEMPLATE_SPREADSHEET_ID : '';
  var spreadsheetUrl = '';

  if (templateId) {
    var spreadsheetService = new SpreadsheetService();
    spreadsheetUrl = spreadsheetService.exportToTemplate(templateId, {
      applicationDate: baseDate,
      userEmail: userEmail,
      targetMonth: targetMonthStr,
      unitPrice: currentUnitPrice,
      daysCount: summary.count,
      totalAmount: totalAmount,
      dateList: summary.dates.join(', '),
    });
  } else {
    console.warn('TEMPLATE_SPREADSHEET_ID is not defined. No template was created.');
  }

  return {
    daysCount: summary.count,
    totalAmount: totalAmount,
    dates: summary.dates,
    spreadsheetUrl: spreadsheetUrl,
  };
};

if (typeof module !== 'undefined') {
  module.exports = { CommuteExpenseUseCase };
}
