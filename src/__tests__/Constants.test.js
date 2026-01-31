// PropertiesServiceのモック
const mockGetProperty = jest.fn();
const mockGetScriptProperties = jest.fn().mockReturnValue({
  getProperty: mockGetProperty
});
global.PropertiesService = {
  getScriptProperties: mockGetScriptProperties
};

describe('Constants', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // requireキャッシュをクリアして、テストごとにConstantsを再読み込みさせる
    jest.resetModules();
  });

  it('必要な定数が定義されているべき', () => {
    const Constants = require('../Constants');
    expect(Constants.CLOSING_DAY).toBe(15);
    expect(Constants.START_DAY).toBe(16);
    expect(Constants.COMMUTE_KEYWORD).toBe('出社');
    expect(Constants.CHAT_KEYWORD).toBe('通勤費');
    expect(Constants.COMMUTE_UNIT_PRICE).toBe(1000);
    expect(Constants.SHEET_NAME).toBe('シート1');
  });

  it('SPREADSHEET_ID はロード時にPropertiesServiceから取得されるべき', () => {
    mockGetProperty.mockReturnValue('TEST_SPREADSHEET_ID');
    
    // 再読み込みでトップレベルコードを実行させる
    const Constants = require('../Constants');
    
    expect(mockGetScriptProperties).toHaveBeenCalled();
    expect(mockGetProperty).toHaveBeenCalledWith('COMMUTE_EXPENSE_SPREDSHEET');
    expect(Constants.SPREADSHEET_ID).toBe('TEST_SPREADSHEET_ID');
  });
});
