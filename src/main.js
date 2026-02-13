// 依存関係を Node.js 形式で読み込む
if (typeof require !== 'undefined') {
  var { CommuteExpenseUseCase } = require('./CommuteExpenseUseCase');
}

/**
 * 通勤費申請のエントリーポイント
 * @param {Date} baseDate 基準日
 * @param {number} unitPrice 単価
 * @param {string} userName ユーザー名
 * @param {string} userEmail ユーザーメールアドレス
 * @returns {Object} 計算結果
 */
function applyCommuteExpenses(baseDate, unitPrice, userName, userEmail) {
  var useCase = new CommuteExpenseUseCase();
  return useCase.execute(baseDate, unitPrice, userName, userEmail);
}

if (typeof module !== 'undefined') {
  module.exports = { applyCommuteExpenses };
}
