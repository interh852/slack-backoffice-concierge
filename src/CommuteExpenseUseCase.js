if (typeof module !== 'undefined') {
  var _LocalPeriodCalculator = require('./PeriodCalculator');
  var _LocalCalendarService = require('./CalendarService').CalendarService;
  var _LocalSpreadsheetService = require('./SpreadsheetService').SpreadsheetService;
  var _LocalConstants = require('./Constants');
}

/**
 * 通勤費精算ユースケース
 */
function CommuteExpenseUseCase() {}

/**
 * 通勤費を計算して保存する
 */
CommuteExpenseUseCase.prototype.execute = function (baseDate, unitPrice, userName, userEmail) {
  if (!baseDate) baseDate = new Date();
  if (!userEmail) throw new Error('User email is required for commute expense application.');

  // 依存関係の解決
  var _getSettlementPeriod = typeof getSettlementPeriod !== 'undefined' ? getSettlementPeriod : _LocalPeriodCalculator.getSettlementPeriod;
  var _CalendarService = typeof CalendarService !== 'undefined' ? CalendarService : _LocalCalendarService;
  var _SpreadsheetService = typeof SpreadsheetService !== 'undefined' ? SpreadsheetService : _LocalSpreadsheetService;
  var _COMMUTE_UNIT_PRICE = typeof COMMUTE_UNIT_PRICE !== 'undefined' ? COMMUTE_UNIT_PRICE : (_LocalConstants ? _LocalConstants.COMMUTE_UNIT_PRICE : 1000);
  var _getTemplateSpreadsheetId = typeof getTemplateSpreadsheetId === 'function' ? getTemplateSpreadsheetId : (_LocalConstants ? _LocalConstants.getTemplateSpreadsheetId : function() { return ''; });

  // 単価の決定
  var currentUnitPrice = typeof unitPrice === 'number' ? unitPrice : _COMMUTE_UNIT_PRICE;

  // ユーザー名の決定
  var resolvedUserName = userName || userEmail.split('@')[0];

  // 1. 精算期間の計算
  var period = _getSettlementPeriod(baseDate);

  // 2. カレンダーから集計
  var calendarService = new _CalendarService();
  var summary = calendarService.getCommuteSummary(period.startDate, period.endDate);

  // 3. 金額計算
  var totalAmount = summary.count * currentUnitPrice;

  var targetYear = period.endDate.getFullYear();
  var targetMonth = period.endDate.getMonth() + 1;
  var targetMonthStr = targetYear + '-' + targetMonth.toString().padStart(2, '0');

  // 4. 保存
  var templateId = _getTemplateSpreadsheetId();
  var spreadsheetUrl = '';

  if (templateId) {
    var spreadsheetService = new _SpreadsheetService();
    spreadsheetUrl = spreadsheetService.exportToTemplate(templateId, {
      applicationDate: baseDate,
      userEmail: userEmail,
      userName: resolvedUserName,
      targetMonth: targetMonthStr,
      unitPrice: currentUnitPrice,
      daysCount: summary.count,
      totalAmount: totalAmount,
      dateList: summary.dates.join(', '),
    });
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
