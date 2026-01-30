const { onMessage, onAddToSpace } = require('../ChatHandler');
const main = require('../main');

// jest.mock は使わず、spyOn でメソッドをモック化
// main.js の実装によっては spyOn できない（module.exports が関数そのものだったり）けど
// 今回は module.exports = { calculateAndSaveCommuteExpenses } なのでオブジェクト

describe('ChatHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('onMessage', () => {
    it('メッセージを受信したら交通費計算を実行して結果を返すべき', () => {
      // スパイを設定
      const spyCalculate = jest
        .spyOn(main, 'calculateAndSaveCommuteExpenses')
        .mockImplementation(() => {});

      const event = {
        message: {
          text: '交通費精算',
        },
        user: {
          email: 'test@example.com',
          displayName: 'Test User',
        },
      };

      const response = onMessage(event);

      expect(spyCalculate).toHaveBeenCalled();
      expect(response).toEqual({
        text: '✅ 交通費の申請を受け付けました！カレンダーの「出社」予定を集計してスプレッドシートに保存しました。',
      });

      // スパイを解除
      spyCalculate.mockRestore();
    });
  });

  describe('onAddToSpace', () => {
    it('スペースに追加されたら挨拶メッセージを返すべき', () => {
      const event = {};
      const response = onAddToSpace(event);

      expect(response).toEqual({
        text: 'こんにちは！交通費精算コンシェルジュです。「交通費」と話しかけると、自動でカレンダーを集計して申請します。',
      });
    });
  });
});
