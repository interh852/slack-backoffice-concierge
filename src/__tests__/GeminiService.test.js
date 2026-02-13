const { GeminiService } = require('../GeminiService');

// UrlFetchAppのモック
const mockFetch = jest.fn();
global.UrlFetchApp = {
  fetch: mockFetch
};

describe('GeminiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('APIキーが指定されていない場合にエラーを投げるべき', () => {
    const service = new GeminiService(null, 'gemini-2.5-flash-lite');
    expect(() => service.generateContent('hi', 'instruction')).toThrow('apiKey is required');
  });

  it('正しいパラメータでAPIを呼び出し、回答を返すべき', () => {
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

    const service = new GeminiService('test-api-key', 'test-model');
    const result = service.generateContent('500円で精算して', 'お前は交通費精算のプロ');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('test-model'),
      expect.objectContaining({
        method: 'post',
        contentType: 'application/json',
        payload: expect.stringContaining('500円で精算して')
      })
    );
    expect(result).toBe('{"intent": "commute", "amount": 500}');
  });
});
