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

describe('ChatHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('onMessage', () => {
    it('メッセージを受信したら交通費計算を実行し、Chat API経由で結果を送信すべき', () => {
      // スパイを設定
      const spyCalculate = jest.spyOn(main, 'calculateAndSaveCommuteExpenses').mockImplementation(() => {});

      const event = {
        message: {
          text: '交通費精算'
        },
        user: {
          email: 'test@example.com',
          displayName: 'Test User'
        },
        space: {
          name: 'spaces/AAAA'
        }
      };

      // 戻り値は空になるはず
      const response = onMessage(event);

      expect(spyCalculate).toHaveBeenCalled();
      expect(response).toBeUndefined(); // 同期レスポンスはなし

      // 非同期送信の検証
      expect(mockCreateMessage).toHaveBeenCalledWith(
        { text: '✅ 交通費の申請を受け付けました！カレンダーの「出社」予定を集計してスプレッドシートに保存しました。' },
        'spaces/AAAA'
      );

      // スパイを解除
      spyCalculate.mockRestore();
    });
  });

  describe('onAddToSpace', () => {
    it('スペースに追加されたらChat API経由で挨拶メッセージを送信すべき', () => {
      const event = {
        space: {
          name: 'spaces/AAAA'
        }
      };
      
      const response = onAddToSpace(event);
      
      expect(response).toBeUndefined();
      expect(mockCreateMessage).toHaveBeenCalledWith(
        { text: 'こんにちは！交通費精算コンシェルジュです。「交通費」と話しかけると、自動でカレンダーを集計して申請します。' },
        'spaces/AAAA'
      );
    });
  });
});
