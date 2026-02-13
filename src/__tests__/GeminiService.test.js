const { GeminiService } = require('../GeminiService');

// PropertiesServiceのモック
const mockGetProperty = jest.fn();
global.PropertiesService = {
  getScriptProperties: jest.fn().mockReturnValue({
    getProperty: mockGetProperty
  })
};

// UrlFetchAppのモック
const mockFetch = jest.fn();
global.UrlFetchApp = {
  fetch: mockFetch
};

describe('GeminiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('APIキーが設定されていない場合にエラーを投げるべき', () => {
    mockGetProperty.mockReturnValue(null);
    const service = new GeminiService();
    expect(() => service.generateContent('hi', 'instruction')).toThrow('GEMINI_API_KEY is not set');
  });

  it('正しいパラメータでAPIを呼び出し、回答を返すべき', () => {
    mockGetProperty.mockReturnValue('test-api-key');
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

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('test-api-key'),
      expect.objectContaining({
        method: 'post',
        contentType: 'application/json',
        payload: expect.stringContaining('500円で精算して')
      })
    );
    expect(result).toBe('{"intent": "commute", "amount": 500}');
  });
});
