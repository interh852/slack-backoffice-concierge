import { onMessage, onAddToSpace } from '../ChatHandler';
import * as main from '../main';

jest.mock('../main');

describe('ChatHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('onMessage', () => {
    it('メッセージを受信したら交通費計算を実行して結果を返すべき', () => {
      const event = {
        message: {
          text: '交通費精算'
        },
        user: {
          email: 'test@example.com',
          displayName: 'Test User'
        }
      } as any;

      const response = onMessage(event);

      expect(main.calculateAndSaveCommuteExpenses).toHaveBeenCalled();
      expect(response).toEqual({
        text: '✅ 交通費の申請を受け付けました！カレンダーの「出社」予定を集計してスプレッドシートに保存しました。'
      });
    });
  });

  describe('onAddToSpace', () => {
    it('スペースに追加されたら挨拶メッセージを返すべき', () => {
      const event = {} as any;
      const response = onAddToSpace(event);
      
      expect(response).toEqual({
        text: 'こんにちは！交通費精算コンシェルジュです。「交通費」と話しかけると、自動でカレンダーを集計して申請します。'
      });
    });
  });
});
