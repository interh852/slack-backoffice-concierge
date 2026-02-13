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
    getProperty: jest.fn().mockImplementation((key) => {
      if (key === 'GEMINI_API_KEY') return 'test-api-key';
      if (key === 'COMMUTE_EXPENSE_SPREDSHEET') return 'test-ss-id';
      return null;
    })
  })
};

// SpreadsheetAppのモック
const mockGetRange = jest.fn();
const mockGetSheetByName = jest.fn();
const mockOpenById = jest.fn();
global.SpreadsheetApp = {
  openById: mockOpenById
};

// CacheServiceのモック
const mockPut = jest.fn();
const mockGet = jest.fn();
const mockRemove = jest.fn();
const mockScriptCachePut = jest.fn();
const mockScriptCacheGet = jest.fn();

global.CacheService = {
  getUserCache: jest.fn().mockReturnValue({
    put: mockPut,
    get: mockGet,
    remove: mockRemove
  }),
  getScriptCache: jest.fn().mockReturnValue({
    put: mockScriptCachePut,
    get: mockScriptCacheGet
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

describe('ChatHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // スクリプトキャッシュのデフォルト（ヒットしない）
    mockScriptCacheGet.mockReturnValue(null);

    // スプレッドシートのデフォルトモック設定
    mockOpenById.mockReturnValue({
      getSheetByName: mockGetSheetByName
    });
    mockGetSheetByName.mockImplementation((name) => {
      return {
        getRange: jest.fn().mockReturnValue({
          getValue: jest.fn().mockReturnValue(name === '情報' ? 'gemini-2.5-flash-lite' : 'テスト用プロンプト')
        })
      };
    });

    // デフォルトでは Gemini は「その他」を返すと仮定
    mockGenerateContent.mockReturnValue(JSON.stringify({
      intent: 'other',
      amount: null,
      message: 'こんにちは！'
    }));
  });

  describe('onMessage - Gemini 統合リファクタリング', () => {
    it('キャッシュがない場合、スプレッドシートから取得してGeminiを呼び出すべき', () => {
      const event = {
        message: { text: 'テスト' },
        user: { email: 'test@example.com' },
        space: { name: 'spaces/AAAA' }
      };

      onMessage(event);

      expect(mockOpenById).toHaveBeenCalled();
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it('JSONにマークダウン記法が含まれていても正しくパースすべき', () => {
      mockGenerateContent.mockReturnValue('```json\n{"intent": "other", "message": "掃除済み"}\n```');

      const event = {
        message: { text: 'テスト' },
        user: { email: 'test@example.com' },
        space: { name: 'spaces/AAAA' }
      };

      onMessage(event);

      expect(mockCreateMessage).toHaveBeenCalledWith(
        expect.objectContaining({ text: '掃除済み' }),
        'spaces/AAAA'
      );
    });

    it('予期せぬエラーが発生しても、ユーザーにエラーを通知すべき', () => {
      mockGenerateContent.mockImplementation(() => { throw new Error('Boom!'); });

      const event = {
        message: { text: 'テスト' },
        user: { email: 'test@example.com' },
        space: { name: 'spaces/AAAA' }
      };

      onMessage(event);

      expect(mockCreateMessage).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('エラー') }),
        'spaces/AAAA'
      );
    });
  });

  describe('onMessage - 既存機能の維持', () => {
    it('自然言語で精算を依頼されたら、金額の入力を促すべき', () => {
      mockGenerateContent.mockReturnValue(JSON.stringify({
        intent: 'commute',
        amount: null,
        message: '片道の運賃を教えてね！'
      }));

      const event = {
        message: { text: '精算して' },
        user: { email: 'test@example.com' },
        space: { name: 'spaces/AAAA' }
      };

      onMessage(event);

      expect(mockPut).toHaveBeenCalledWith('state_test@example.com', 'WAITING_FOR_AMOUNT', 600);
      expect(mockCreateMessage).toHaveBeenCalledWith(
        { text: '片道の運賃を教えてね！' },
        'spaces/AAAA'
      );
    });

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
