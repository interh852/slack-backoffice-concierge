const { onMessage, onAddToSpace } = require('../ChatHandler');
const main = require('../main');

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
  });

  describe('onMessage - 対話フロー', () => {
    it('「通勤費」と送られたら、金額の入力を促し、状態を保存すべき', () => {
      const event = {
        message: { text: '通勤費' },
        user: { email: 'test@example.com' },
        space: { name: 'spaces/AAAA' }
      };

      onMessage(event);

      // 状態がキャッシュに保存されたか確認
      expect(mockPut).toHaveBeenCalledWith(
        'state_test@example.com',
        'WAITING_FOR_AMOUNT',
        600 // 有効期限10分
      );

      // 質問メッセージが送信されたか確認
      expect(mockCreateMessage).toHaveBeenCalledWith(
        { text: '片道の通勤費を数値で教えてください（例: 500）' },
        'spaces/AAAA'
      );
    });

    it('金額入力待ちの状態で数値を送られたら、計算を実行して結果を返すべき', () => {
      // 状態を「待ち」に設定
      mockGet.mockReturnValue('WAITING_FOR_AMOUNT');
      
      const spyApply = jest.spyOn(main, 'applyCommuteExpenses').mockReturnValue({
        daysCount: 3,
        totalAmount: 3000,
        dates: ['2026-01-10']
      });

      const event = {
        message: { text: '500' }, // 片道500円
        user: { email: 'test@example.com' },
        space: { name: 'spaces/AAAA' }
      };

      onMessage(event);

      // 往復1000円（片道500 * 2）で計算ロジックが呼ばれたか確認
      // applyCommuteExpenses が第2引数に単価を受け取るようになる必要がある
      expect(spyApply).toHaveBeenCalledWith(expect.any(Date), 1000);

      // 結果メッセージの送信確認
      expect(mockCreateMessage).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('3000円') }),
        'spaces/AAAA'
      );

      // 状態がクリアされたか確認
      expect(mockRemove).toHaveBeenCalledWith('state_test@example.com');

      spyApply.mockRestore();
    });

    it('金額入力待ちの状態で「500円」のように単位付きで送られても、正しく計算すべき', () => {
      mockGet.mockReturnValue('WAITING_FOR_AMOUNT');
      
      const spyApply = jest.spyOn(main, 'applyCommuteExpenses').mockReturnValue({
        daysCount: 1,
        totalAmount: 1000,
        dates: ['2026-01-10']
      });

      const event = {
        message: { text: '500円' }, 
        user: { email: 'test@example.com' },
        space: { name: 'spaces/AAAA' }
      };

      onMessage(event);

      // 500円をパースして1000円（往復）で呼ばれることを期待
      expect(spyApply).toHaveBeenCalledWith(expect.any(Date), 1000);
      expect(mockRemove).toHaveBeenCalledWith('state_test@example.com');

      spyApply.mockRestore();
    });

    it('金額入力待ちの状態で数値以外を送られたら、エラーを返すべき', () => {
      mockGet.mockReturnValue('WAITING_FOR_AMOUNT');

      const event = {
        message: { text: 'あいうえお' },
        user: { email: 'test@example.com' },
        space: { name: 'spaces/AAAA' }
      };

      onMessage(event);

      expect(mockCreateMessage).toHaveBeenCalledWith(
        { text: '数値を入力してください。中断する場合は「キャンセル」と入力してください。' },
        'spaces/AAAA'
      );
    });
  });

  describe('onAddToSpace', () => {
    it('スペースに追加されたら挨拶メッセージを送信すべき', () => {
      const event = { space: { name: 'spaces/AAAA' } };
      onAddToSpace(event);
      expect(mockCreateMessage).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('通勤費') }),
        'spaces/AAAA'
      );
    });
  });
});
