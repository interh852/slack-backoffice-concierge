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
    it('「交通費」という文字列が含まれるメッセージを受信したら交通費計算を実行し、詳細な結果を送信すべき', () => {
      // スパイを設定し、戻り値を設定
      const spyCalculate = jest.spyOn(main, 'calculateAndSaveCommuteExpenses').mockReturnValue({
        daysCount: 2,
        totalAmount: 2000,
        dates: ['2026-01-10', '2026-01-12']
      });

      const event = {
        message: {
          text: '交通費精算をお願いします'
        },
        space: {
          name: 'spaces/AAAA'
        }
      };

      onMessage(event);

      expect(spyCalculate).toHaveBeenCalled();
      
      // 詳細なメッセージが含まれているか検証
      expect(mockCreateMessage).toHaveBeenCalledWith(
        expect.objectContaining({ 
          text: expect.stringContaining('出社日: 2026-01-10, 2026-01-12') 
        }),
        'spaces/AAAA'
      );
      expect(mockCreateMessage).toHaveBeenCalledWith(
        expect.objectContaining({ 
          text: expect.stringContaining('交通費: 2000円') 
        }),
        'spaces/AAAA'
      );

      spyCalculate.mockRestore();
    });

    it('「交通費」という文字列が含まれないメッセージの場合は無視し、ヘルプを返すべき', () => {
      const spyCalculate = jest.spyOn(main, 'calculateAndSaveCommuteExpenses').mockImplementation(() => {});

      const event = {
        message: {
          text: 'こんにちは'
        },
        space: {
          name: 'spaces/AAAA'
        }
      };

      onMessage(event);

      expect(spyCalculate).not.toHaveBeenCalled();
      expect(mockCreateMessage).toHaveBeenCalledWith(
        { text: '「交通費」という言葉を含めて話しかけてください。自動でカレンダーを集計して申請します。' },
        'spaces/AAAA'
      );

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
      
      onAddToSpace(event);
      
      expect(mockCreateMessage).toHaveBeenCalledWith(
        { text: 'こんにちは！交通費精算コンシェルジュです。「交通費」と話しかけると、自動でカレンダーを集計して申請します。' },
        'spaces/AAAA'
      );
    });
  });
});
