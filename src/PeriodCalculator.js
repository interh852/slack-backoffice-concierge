// 依存関係（Constants）はグローバル変数として期待するが、
// Node環境では require で取得する必要がある
if (typeof require !== 'undefined') {
  var { CLOSING_DAY, START_DAY } = require('./Constants');
}

/**
 * 15日締めサイクルに基づいて精算期間を計算します。
 *
 * @param {Date} baseDate 計算の基準となる日付。
 * @returns {Object} { startDate: Date, endDate: Date }
 */
function getSettlementPeriod(baseDate) {
  var year = baseDate.getFullYear();
  var month = baseDate.getMonth();

  // CLOSING_DAY はグローバルまたは require 経由で取得
  // GAS上ではグローバル変数として参照できる
  var closing = typeof CLOSING_DAY !== 'undefined' ? CLOSING_DAY : 15;
  var start = typeof START_DAY !== 'undefined' ? START_DAY : 16;

  // 常に基準日の当月15日を終了日、前月16日を開始日とする
  var endDate = new Date(year, month, closing);
  var startDate = new Date(year, month - 1, start);

  return { startDate: startDate, endDate: endDate };
}

if (typeof module !== 'undefined') {
  module.exports = { getSettlementPeriod };
}
