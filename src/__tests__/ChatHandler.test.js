// GeminiService のモックを最初に行う
const mockAnalyzeIntent = jest.fn();
jest.mock('../GeminiService', () => {
  return {
    GeminiService: jest.fn().mockImplementation(() => {
      return {
        analyzeIntent: mockAnalyzeIntent,
      };
    }),
  };
});

// SpreadsheetService のモック
const mockGetLastMonthFare = jest.fn();
jest.mock('../SpreadsheetService', () => {
  return {
    SpreadsheetService: jest.fn().mockImplementation(() => {
      return {
        getLastMonthFare: mockGetLastMonthFare,
      };
    }),
  };
});

// UseCase のモック
const mockExecute = jest.fn();
jest.mock('../CommuteExpenseUseCase', () => {
  return {
    CommuteExpenseUseCase: jest.fn().mockImplementation(() => {
      return {
        execute: mockExecute,
      };
    }),
  };
});

// GASのグローバル環境を模倣
global.GeminiService = jest.requireMock('../GeminiService').GeminiService;
global.SpreadsheetService = jest.requireMock('../SpreadsheetService').SpreadsheetService;
global.CommuteExpenseUseCase = jest.requireMock('../CommuteExpenseUseCase').CommuteExpenseUseCase;

// その後に読み込む
const { onMessage } = require('../ChatHandler');

// GAS グローバルオブジェクトのモック
global.PropertiesService = {
  getScriptProperties: jest.fn().mockReturnValue({
    getProperty: jest.fn().mockReturnValue('mock-api-key'),
  }),
  getUserProperties: jest.fn().mockReturnValue({
    getProperty: jest.fn(),
    setProperty: jest.fn(),
    deleteProperty: jest.fn(),
  }),
};

// 他の定数などもグローバルに生やす
global.STATE_KEY_PREFIX = 'state_';
global.STATE_WAITING_FOR_AMOUNT = 'WAITING_FOR_AMOUNT';
global.STATE_WAITING_FOR_FARE_CONFIRMATION = 'WAITING_FOR_FARE_CONFIRMATION';

describe('ChatHandler', () => {
  const userEmail = 'test@example.com';
  const userName = '田中 太郎';

  beforeEach(() => {
    jest.clearAllMocks();
    global.PropertiesService.getUserProperties().getProperty.mockReturnValue(null);
  });

  describe('onMessage - テキスト対話（カードなし）', () => {
    it('Geminiの意図解析結果に基づいてメッセージを送信すべき', () => {
      const event = {
        message: { text: 'テスト' },
        user: { email: userEmail, displayName: userName },
      };

      mockAnalyzeIntent.mockReturnValue({
        intent: 'other',
        message: 'こんにちは',
      });

      const response = onMessage(event);

      expect(response.text).toBe('こんにちは');
    });

    it('JSONパースエラー時は会話として続行すべき', () => {
      const event = {
        message: { text: 'テスト' },
        user: { email: userEmail, displayName: userName },
      };

      mockAnalyzeIntent.mockReturnValue({
        intent: 'other',
        message: '無効なレスポンス',
      });

      const response = onMessage(event);

      expect(response.text).toBe('無効なレスポンス');
    });
  });

  describe('onMessage - 先月の運賃再利用', () => {
    it('先月の運賃がある場合、確認メッセージを送信すべき', () => {
      const event = {
        message: { text: '交通費精算して' },
        user: { email: userEmail, displayName: userName },
      };

      mockAnalyzeIntent.mockReturnValue({
        intent: 'commute_expense',
      });
      mockGetLastMonthFare.mockReturnValue(600);

      const response = onMessage(event);

      expect(mockGetLastMonthFare).toHaveBeenCalled();
      expect(response.text).toContain('先月の片道運賃（600円）を再利用しますか？');
    });

    it('「はい」と答えたら精算を実行すべき', () => {
      const event = {
        message: { text: 'はい' },
        user: { email: userEmail, displayName: userName },
      };

      global.PropertiesService.getUserProperties().getProperty.mockReturnValue('WAITING_FOR_FARE_CONFIRMATION|600');
      mockExecute.mockReturnValue({
        daysCount: 2,
        totalAmount: 2400,
        dates: ['1/10', '1/12'],
        spreadsheetUrl: 'https://example.com/spreadsheet',
      });

      const response = onMessage(event);

      expect(mockExecute).toHaveBeenCalled();
      expect(response.text).toContain('精算を受け付けたよ！');
    });

    it('「いいえ」と答えたら金額入力を促すべき', () => {
      const event = {
        message: { text: 'いいえ' },
        user: { email: userEmail, displayName: userName },
      };

      global.PropertiesService.getUserProperties().getProperty.mockReturnValue('WAITING_FOR_FARE_CONFIRMATION|600');

      const response = onMessage(event);

      expect(response.text).toContain('新しい片道運賃（円）を教えてください');
    });
  });
});
