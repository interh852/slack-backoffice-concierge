// 1. まずモックを定義
const mockGetProperty = jest.fn();
global.PropertiesService = {
  getScriptProperties: jest.fn().mockReturnValue({
    getProperty: mockGetProperty
  })
};

// 2. Constants が読み込まれる前にプロパティを設定
mockGetProperty.mockImplementation((key) => {
  if (key === 'COMMUTE_EXPENSE_SPREDSHEET') return 'test-ss-id';
  if (key === 'GEMINI_API_KEY') return 'test-api-key';
  return null;
});

// 3. その後で依存関係を読み込む
const { GeminiService } = require('../GeminiService');
const Constants = require('../Constants');

// UrlFetchAppのモック
const mockFetch = jest.fn();
global.UrlFetchApp = {
  fetch: mockFetch
};

// SpreadsheetAppのモック
const mockGetRange = jest.fn();
const mockGetSheetByName = jest.fn();
const mockOpenById = jest.fn();
global.SpreadsheetApp = {
  openById: mockOpenById
};

describe('GeminiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenById.mockReturnValue({
      getSheetByName: mockGetSheetByName
    });
    mockGetSheetByName.mockReturnValue({
      getRange: mockGetRange
    });
    mockGetRange.mockReturnValue({
      getValue: () => 'gemini-2.5-flash-lite'
    });
  });

  it('APIキーが設定されていない場合にエラーを投げるべき', () => {
    // このテストの時だけ null を返すように上書き
    mockGetProperty.mockImplementation((key) => {
      if (key === 'GEMINI_API_KEY') return null;
      return 'something';
    });
    const service = new GeminiService();
    expect(() => service.generateContent('hi', 'instruction')).toThrow('GEMINI_API_KEY is not set');
  });

  it('スプレッドシートからモデル名を取得し、正しいパラメータでAPIを呼び出すべき', () => {
    mockGetProperty.mockImplementation((key) => {
      if (key === 'GEMINI_API_KEY') return 'test-api-key';
      if (key === 'COMMUTE_EXPENSE_SPREDSHEET') return 'test-ss-id';
      return null;
    });

    const mockApiResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: '{"intent": "commute", "amount": 500}' }]
          }
        }
      ]
    };
    
    mockFetch.mockReturnValue({
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify(mockApiResponse)
    });

    const service = new GeminiService();
    const result = service.generateContent('500円で精算して', 'お前は交通費精算のプロ');

    expect(mockOpenById).toHaveBeenCalledWith('test-ss-id');
    expect(mockGetSheetByName).toHaveBeenCalledWith('情報');
    expect(mockGetRange).toHaveBeenCalledWith('B1');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('gemini-2.5-flash-lite'),
      expect.any(Object)
    );
    expect(result).toBe('{"intent": "commute", "amount": 500}');
  });
});
