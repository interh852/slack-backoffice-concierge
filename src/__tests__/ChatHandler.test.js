// GeminiService のモックを最初に行う
const mockGenerateContent = jest.fn();
jest.mock('../GeminiService', () => {
  return {
    GeminiService: jest.fn().mockImplementation(() => {
      return {
        generateContent: mockGenerateContent,
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
    remove: jest.fn(),
  }),
  getScriptCache: jest.fn().mockReturnValue({
    get: jest.fn(),
    put: jest.fn(),
  }),
};

global.PropertiesService = {
  getScriptProperties: jest.fn().mockReturnValue({
    getProperty: jest.fn().mockReturnValue('mock-api-key'),
  }),
};

global.Chat = {
  Spaces: {
    Messages: {
      create: jest.fn(),
    },
  },
};

global.SpreadsheetApp = {
  openById: jest.fn().mockReturnValue({
    getSheetByName: jest.fn().mockReturnValue({
      getRange: jest.fn().mockReturnValue({
        getValue: jest.fn().mockReturnValue('mock-value'),
      }),
    }),
  }),
};

describe('ChatHandler', () => {
  const spaceName = 'spaces/AAAA';
  const userEmail = 'test@example.com';
  const userName = '田中 太郎';

  beforeEach(() => {
    jest.clearAllMocks();
    global.CacheService.getUserCache().get.mockReturnValue(null);
  });

  describe('onMessage - テキスト対話（カードなし）', () => {
    it('Geminiの意図解析結果に基づいてメッセージを送信すべき', () => {
      const event = {
        message: { text: 'テスト' },
        user: { email: userEmail, displayName: userName },
        space: { name: spaceName },
      };

      mockGenerateContent.mockReturnValue(
        JSON.stringify({
          intent: 'other',
          message: 'こんにちは',
        })
      );

      onMessage(event);

      expect(global.Chat.Spaces.Messages.create).toHaveBeenCalledWith(
        { text: 'こんにちは' },
        spaceName
      );
    });

    it('JSONパースエラー時は会話として続行すべき', () => {
      const event = {
        message: { text: 'テスト' },
        user: { email: userEmail, displayName: userName },
        space: { name: spaceName },
      };

      // 無効なJSONを返す
      mockGenerateContent.mockReturnValue('無効なレスポンス');

      onMessage(event);

      // パースエラー時はそのまま送信するロジックに変更したため
      // エラーメッセージではなく、元のテキストが送信されることを確認
      expect(global.Chat.Spaces.Messages.create).toHaveBeenCalledWith(
        { text: '無効なレスポンス' },
        spaceName
      );
    });
  });

  describe('onMessage - 先月の運賃再利用', () => {
    it('先月の運賃がある場合、確認メッセージを送信すべき', () => {
      const event = {
        message: { text: '交通費精算して' },
        user: { email: userEmail, displayName: userName },
        space: { name: spaceName },
      };

      mockGenerateContent.mockReturnValue(
        JSON.stringify({
          intent: 'commute',
          message: '片道の運賃を教えてください',
        })
      );
      mockGetLastMonthFare.mockReturnValue(600);

      onMessage(event);

      expect(mockGetLastMonthFare).toHaveBeenCalledWith(userEmail, expect.any(Date), userName);
      expect(global.Chat.Spaces.Messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('先月の精算資料から片道運賃 **600円** が見つかりました'),
        }),
        spaceName
      );
      expect(global.CacheService.getUserCache().put).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('WAITING_FOR_FARE_CONFIRMATION|600'),
        600
      );
    });

    it('「はい」と答えたら精算を実行すべき', () => {
      const event = {
        message: { text: 'はい' },
        user: { email: userEmail, displayName: userName },
        space: { name: spaceName },
      };

      global.CacheService.getUserCache().get.mockReturnValue('WAITING_FOR_FARE_CONFIRMATION|600');

      const spyApply = jest.spyOn(main, 'applyCommuteExpenses').mockReturnValue({
        daysCount: 2,
        totalAmount: 2400,
        dates: ['1/10', '1/12'],
        spreadsheetUrl: 'https://example.com/spreadsheet',
      });

      onMessage(event);

      expect(spyApply).toHaveBeenCalledWith(expect.any(Date), 1200, userName, userEmail);
      expect(global.Chat.Spaces.Messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('先月の運賃（片道600円）で申請しました'),
        }),
        spaceName
      );
      spyApply.mockRestore();
    });

    it('「いいえ」と答えたら金額入力を促すべき', () => {
      const event = {
        message: { text: 'いいえ' },
        user: { email: userEmail, displayName: userName },
        space: { name: spaceName },
      };

      global.CacheService.getUserCache().get.mockReturnValue('WAITING_FOR_FARE_CONFIRMATION|600');

      onMessage(event);

      expect(global.Chat.Spaces.Messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('了解しました。今回の片道運賃を数字だけで教えてください'),
        }),
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
