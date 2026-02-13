const { onMessage, onAddToSpace } = require('../ChatHandler');
const main = require('../main');
const { GeminiService } = require('../GeminiService');

// GeminiServiceのモック
jest.mock('../GeminiService');
const mockGenerateContent = jest.fn();
GeminiService.prototype.generateContent = mockGenerateContent;

// PropertiesServiceのモック
global.PropertiesService = {
  getScriptProperties: jest.fn().mockReturnValue({
    getProperty: jest.fn().mockReturnValue('test-api-key')
  })
};

// SpreadsheetAppのモック
global.SpreadsheetApp = {
  openById: jest.fn().mockReturnValue({
    getSheetByName: jest.fn().mockReturnValue({
      getRange: jest.fn().mockReturnValue({
        getValue: jest.fn().mockReturnValue('gemini-2.5-flash-lite')
      })
    })
  })
};

// Chat APIのグローバルモック
const mockCreateMessage = jest.fn();
global.Chat = {
  Spaces: {
    Messages: {
      create: mockCreateMessage
    }
  }
};

// CacheServiceのグローバルモック
const mockPut = jest.fn();
const mockGet = jest.fn();
const mockRemove = jest.fn();
global.CacheService = {
  getUserCache: jest.fn().mockReturnValue({
    put: mockPut,
    get: mockGet,
    remove: mockRemove
  })
};

describe('ChatHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルトでは Gemini は「その他」を返すと仮定
    mockGenerateContent.mockReturnValue(JSON.stringify({
      intent: 'other',
      amount: null,
      message: 'こんにちは！何かお手伝いしましょうか？'
    }));
  });

  describe('onMessage - Gemini 統合フロー', () => {
    it('自然言語で精算を依頼されたら、金額の入力を促すべき', () => {
      mockGenerateContent.mockReturnValue(JSON.stringify({
        intent: 'commute',
        amount: null,
        message: '片道の運賃を教えてね！'
      }));

      const event = {
        message: { text: '交通費の精算をお願いしたいな' },
        user: { email: 'test@example.com' },
        space: { name: 'spaces/AAAA' }
      };

      onMessage(event);

      expect(mockGenerateContent).toHaveBeenCalled();
      expect(mockPut).toHaveBeenCalledWith('state_test@example.com', 'WAITING_FOR_AMOUNT', 600);
      expect(mockCreateMessage).toHaveBeenCalledWith(
        { text: '片道の運賃を教えてね！' },
        'spaces/AAAA'
      );
    });

    it('金額を含めて精算を依頼されたら、即座に精算を実行すべき', () => {
      mockGenerateContent.mockReturnValue(JSON.stringify({
        intent: 'commute',
        amount: 600,
        message: '了解！片道600円で精算するね。'
      }));

      const spyApply = jest.spyOn(main, 'applyCommuteExpenses').mockReturnValue({
        daysCount: 2,
        totalAmount: 2400, // 600 * 2 * 2
        dates: ['2026-02-01', '2026-02-02']
      });

      const event = {
        message: { text: '片道600円で交通費精算して！' },
        user: { email: 'test@example.com' },
        space: { name: 'spaces/AAAA' }
      };

      onMessage(event);

      // 往復1200円で呼ばれることを確認
      expect(spyApply).toHaveBeenCalledWith(expect.any(Date), 1200);
      expect(mockCreateMessage).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('2400円') }),
        'spaces/AAAA'
      );
      spyApply.mockRestore();
    });

    it('精算以外の雑談には、Geminiの回答をそのまま返すべき', () => {
      mockGenerateContent.mockReturnValue(JSON.stringify({
        intent: 'other',
        amount: null,
        message: '今日はいい天気だね！仕事がんばろ！'
      }));

      const event = {
        message: { text: 'おはよー' },
        user: { email: 'test@example.com' },
        space: { name: 'spaces/AAAA' }
      };

      onMessage(event);

      expect(mockCreateMessage).toHaveBeenCalledWith(
        { text: '今日はいい天気だね！仕事がんばろ！' },
        'spaces/AAAA'
      );
      expect(mockPut).not.toHaveBeenCalled();
    });
  });

  describe('onMessage - 既存の金額入力待ちフロー', () => {
    it('金額入力待ちの状態で数値を送られたら、Geminiを介さず処理すべき', () => {
      mockGet.mockReturnValue('WAITING_FOR_AMOUNT');
      
      const spyApply = jest.spyOn(main, 'applyCommuteExpenses').mockReturnValue({
        daysCount: 1,
        totalAmount: 1000,
        dates: ['2026-01-10']
      });

      const event = {
        message: { text: '500' },
        user: { email: 'test@example.com' },
        space: { name: 'spaces/AAAA' }
      };

      onMessage(event);

      expect(mockGenerateContent).not.toHaveBeenCalled();
      expect(spyApply).toHaveBeenCalledWith(expect.any(Date), 1000);
      spyApply.mockRestore();
    });
  });
});
