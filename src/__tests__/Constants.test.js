const {
  CLOSING_DAY,
  START_DAY,
  COMMUTE_KEYWORD,
  getSpreadsheetId,
} = require('../Constants');

// PropertiesService のモック
const mockGetProperty = jest.fn();
global.PropertiesService = {
  getScriptProperties: jest.fn().mockReturnValue({
    getProperty: mockGetProperty,
  }),
};

describe('Constants', () => {
  it('必要な定数が定義されているべき', () => {
    expect(CLOSING_DAY).toBe(15);
    expect(START_DAY).toBe(16);
    expect(COMMUTE_KEYWORD).toBe('出社');
  });

  it('SPREDSHEET_ID はロード時にPropertiesServiceから取得されるべき', () => {
    mockGetProperty.mockReturnValue('mock-id');
    expect(getSpreadsheetId()).toBe('mock-id');
  });

  it('TEMPLATE_SPREADSHEET_ID はPropertiesServiceから取得されるべき', () => {
    const { getTemplateSpreadsheetId } = require('../Constants');
    mockGetProperty.mockReturnValue('mock-template-id');
    expect(getTemplateSpreadsheetId()).toBe('mock-template-id');
    expect(mockGetProperty).toHaveBeenCalledWith('COMMUTE_TEMPLATE_SPREADSHEET');
  });
});
