const Constants = require('../Constants');

describe('Constants', () => {
  it('必要な定数が定義されているべき', () => {
    expect(Constants.CLOSING_DAY).toBe(15);
    expect(Constants.START_DAY).toBe(16);
    expect(Constants.COMMUTE_KEYWORD).toBe('出社');
    expect(Constants.COMMUTE_UNIT_PRICE).toBe(1000);
    expect(Constants.SHEET_NAME).toBe('CommuteExpenses');
  });
});
