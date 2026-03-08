// 依存関係を Node.js 形式で読み込む
if (typeof module !== 'undefined') {
  var _CommuteExpenseUseCase = require('./CommuteExpenseUseCase').CommuteExpenseUseCase;
  var _MonthlyReportArchiverUseCase = require('./MonthlyReportArchiverUseCase').MonthlyReportArchiverUseCase;
}

/**
 * 通勤費申請のエントリーポイント
 */
function applyCommuteExpenses(baseDate, unitPrice, userName, userEmail) {
  var UseCase = (typeof _CommuteExpenseUseCase !== 'undefined') ? _CommuteExpenseUseCase : CommuteExpenseUseCase;
  var useCase = new UseCase();
  return useCase.execute(baseDate, unitPrice, userName, userEmail);
}

/**
 * 月次レポートをアーカイブするエントリーポイント（トリガー用）
 */
function archiveMonthlyReports() {
  var UseCase = (typeof _MonthlyReportArchiverUseCase !== 'undefined') ? _MonthlyReportArchiverUseCase : MonthlyReportArchiverUseCase;
  var useCase = new UseCase();
  useCase.archive();
}

if (typeof module !== 'undefined') {
  module.exports = { applyCommuteExpenses, archiveMonthlyReports };
}
