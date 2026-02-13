// GeminiService のモックを最初に行う
const mockGenerateContent = jest.fn();
jest.mock('../GeminiService', () => {
  return {
    GeminiService: jest.fn().mockImplementation(() => {
      return {
        generateContent: mockGenerateContent
      };
    })
  };
});

// その後に読み込む
if (typeof require !== 'undefined') {
  var { onMessage } = require('../ChatHandler');
  var main = require('../main');
}

// GAS グローバルオブジェクトのモック
global.CacheService = {
  getUserCache: jest.fn().mockReturnValue({
    get: jest.fn(),
    put: jest.fn(),
    remove: jest.fn()
  }),
  getScriptCache: jest.fn().mockReturnValue({
    get: jest.fn(),
    put: jest.fn()
  })
};

global.PropertiesService = {
  getScriptProperties: jest.fn().mockReturnValue({
    getProperty: jest.fn().mockReturnValue('mock-api-key')
  })
};

global.Chat = {
  Spaces: {
    Messages: {
      create: jest.fn()
    }
  }
};

global.SpreadsheetApp = {
  openById: jest.fn().mockReturnValue({
    getSheetByName: jest.fn().mockReturnValue({
      getRange: jest.fn().mockReturnValue({
        getValue: jest.fn().mockReturnValue('mock-value')
      })
    })
  })
};

describe('ChatHandler', () => {
  const spaceName = 'spaces/AAAA';
  const userEmail = 'test@example.com';
  const userName = '田中 太郎';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('onMessage - Gemini 統合リファクタリング', () => {
    it('キャッシュがない場合、スプレッドシートから取得してGeminiを呼び出すべき', () => {
      const event = {
        message: { text: 'テスト' },
        user: { email: userEmail, displayName: userName },
        space: { name: spaceName }
      };

      mockGenerateContent.mockReturnValue(JSON.stringify({
        intent: 'other',
        message: 'こんにちは'
      }));

      onMessage(event);

      expect(global.Chat.Spaces.Messages.create).toHaveBeenCalledWith(
        { text: 'こんにちは' },
        spaceName
      );
    });

    it('JSONにマークダウン記法が含まれていても正しくパースすべき', () => {
      const event = {
        message: { text: 'テスト' },
        user: { email: userEmail, displayName: userName },
        space: { name: spaceName }
      };

      mockGenerateContent.mockReturnValue('```json\n{"intent":"other", "message":"JSONテスト"}\n```');

      onMessage(event);

      expect(global.Chat.Spaces.Messages.create).toHaveBeenCalledWith(
        { text: 'JSONテスト' },
        spaceName
      );
    });

    it('予期せぬエラーが発生しても、ユーザーにエラーを通知すべき', () => {
      const event = {
        message: { text: 'テスト' },
        user: { email: userEmail, displayName: userName },
        space: { name: spaceName }
      };

      mockGenerateContent.mockImplementation(() => {
        throw new Error('Boom!');
      });

      onMessage(event);

      expect(global.Chat.Spaces.Messages.create).toHaveBeenCalledWith(
        { text: '❌ 申し訳ありません、システムエラーが発生しました。' },
        spaceName
      );
    });
  });

  describe('onMessage - 既存機能の維持', () => {
    it('自然言語で精算を依頼されたら、金額の入力を促すべき', () => {
      const event = {
        message: { text: '精算して' },
        user: { email: userEmail, displayName: userName },
        space: { name: spaceName }
      };

      mockGenerateContent.mockReturnValue(JSON.stringify({
        intent: 'commute',
        message: '片道の運賃を教えてください'
      }));

      onMessage(event);

      expect(global.Chat.Spaces.Messages.create).toHaveBeenCalledWith(
        { text: '片道の運賃を教えてください' },
        spaceName
      );
      expect(global.CacheService.getUserCache().put).toHaveBeenCalled();
    });

    it('金額入力待ちの状態で数値を送られたら、Geminiを介さず処理すべき', () => {
      const event = {
        message: { text: '500' },
        user: { email: userEmail, displayName: userName },
        space: { name: spaceName }
      };

      global.CacheService.getUserCache().get.mockReturnValue('WAITING_FOR_AMOUNT');
      
      const spyApply = jest.spyOn(main, 'applyCommuteExpenses').mockReturnValue({
        daysCount: 2,
        totalAmount: 2000,
        dates: ['2026-01-10', '2026-01-12'],
        spreadsheetUrl: 'https://example.com/spreadsheet'
      });

      onMessage(event);

      expect(mockGenerateContent).not.toHaveBeenCalled();
      expect(spyApply).toHaveBeenCalledWith(expect.any(Date), 1000, userName, userEmail);
      spyApply.mockRestore();
    });
  });
});
