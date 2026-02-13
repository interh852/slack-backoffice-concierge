const { getSettlementPeriod } = require('../PeriodCalculator');

describe('PeriodCalculator', () => {
  it('基準日が1月29日の場合、12月16日から1月15日を返すべき', () => {
    const baseDate = new Date(2026, 0, 29); // 2026年1月29日
    const period = getSettlementPeriod(baseDate);

    expect(period.startDate).toEqual(new Date(2025, 11, 16));
    expect(period.endDate).toEqual(new Date(2026, 0, 15));
  });

  it('基準日が2月10日の場合、1月16日から2月15日を返すべき', () => {
    const baseDate = new Date(2026, 1, 10); // 2026年2月10日
    const period = getSettlementPeriod(baseDate);

    expect(period.startDate).toEqual(new Date(2026, 0, 16));
    expect(period.endDate).toEqual(new Date(2026, 1, 15));
  });

  it('基準日が2月20日の場合、1月16日から2月15日を返すべき', () => {
    const baseDate = new Date(2026, 1, 20); // 2026年2月20日
    const period = getSettlementPeriod(baseDate);

    expect(period.startDate).toEqual(new Date(2026, 0, 16));
    expect(period.endDate).toEqual(new Date(2026, 1, 15));
  });

  it('年越しを正しく処理できるべき', () => {
    const baseDate = new Date(2026, 0, 5); // 2026年1月5日
    const period = getSettlementPeriod(baseDate);

    expect(period.startDate).toEqual(new Date(2025, 11, 16));
    expect(period.endDate).toEqual(new Date(2026, 0, 15));
  });
});
