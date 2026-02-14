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

// SpreadsheetService のモック
const mockGetLastMonthFare = jest.fn();
jest.mock('../SpreadsheetService', () => {
  return {
    SpreadsheetService: jest.fn().mockImplementation(() => {
      return {
        getLastMonthFare: mockGetLastMonthFare
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
    global.CacheService.getUserCache().get.mockReturnValue(null);
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
      mockGetLastMonthFare.mockReturnValue(null);

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

  describe('onMessage - 先月の運賃再利用', () => {
    it('先月の運賃がある場合、確認カードを送信すべき', () => {
      const event = {
        message: { text: '交通費精算して' },
        user: { email: userEmail, displayName: userName },
        space: { name: spaceName }
      };

      mockGenerateContent.mockReturnValue(JSON.stringify({
        intent: 'commute',
        message: '片道の運賃を教えてください'
      }));
      mockGetLastMonthFare.mockReturnValue(600);

      onMessage(event);

      expect(mockGetLastMonthFare).toHaveBeenCalledWith(userEmail, expect.any(Date), userName);
      expect(global.Chat.Spaces.Messages.create).toHaveBeenCalledWith(
        expect.objectContaining({ cardsV2: expect.any(Array) }),
        spaceName
      );
      expect(global.CacheService.getUserCache().put).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('WAITING_FOR_FARE_CONFIRMATION|600'),
        600
      );
    });

    it('カードで「はい」が押されたら精算を実行すべき', () => {
      const event = {
        type: 'CARD_CLICKED',
        common: { invokedFunction: 'reuse_fare_yes' },
        user: { email: userEmail, displayName: userName },
        space: { name: spaceName }
      };

      global.CacheService.getUserCache().get.mockReturnValue('WAITING_FOR_FARE_CONFIRMATION|600');
      
      const spyApply = jest.spyOn(main, 'applyCommuteExpenses').mockReturnValue({
        daysCount: 2,
        totalAmount: 2400,
        dates: ['1/10', '1/12'],
        spreadsheetUrl: 'https://example.com/spreadsheet'
      });

      onMessage(event);

      expect(spyApply).toHaveBeenCalledWith(expect.any(Date), 1200, userName, userEmail);
      expect(global.Chat.Spaces.Messages.create).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('精算書を作成しました') }),
        spaceName
      );
      spyApply.mockRestore();
    });

    it('カードで「いいえ」が押されたら金額入力を促すべき', () => {
      const event = {
        type: 'CARD_CLICKED',
        common: { invokedFunction: 'reuse_fare_no' },
        user: { email: userEmail, displayName: userName },
        space: { name: spaceName }
      };

      global.CacheService.getUserCache().get.mockReturnValue('WAITING_FOR_FARE_CONFIRMATION|600');

      onMessage(event);

      expect(global.Chat.Spaces.Messages.create).toHaveBeenCalledWith(
        { text: '了解しました。今回の片道運賃を教えてください。' },
        spaceName
      );
      expect(global.CacheService.getUserCache().put).toHaveBeenCalledWith(
        expect.any(String),
        'WAITING_FOR_AMOUNT',
        600
      );
    });
  });
});
