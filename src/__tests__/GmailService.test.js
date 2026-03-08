const { GmailService } = require('../GmailService');

// GmailAppのモック
global.GmailApp = {
  search: jest.fn(),
};

describe('GmailService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GmailService();
  });

  it('条件に一致する過去24時間以内のメールを検索する', () => {
    const mockThreads = [];
    GmailApp.search.mockReturnValue(mockThreads);

    service.getRecentThreads('月次日報レポート');

    expect(GmailApp.search).toHaveBeenCalledWith(
      expect.stringContaining('subject:("月次日報レポート") after:'),
    );
  });

  it('除外ラベルが指定された場合にクエリに追加される', () => {
    service.getRecentThreads('月次日報レポート', 'Processed');

    expect(GmailApp.search).toHaveBeenCalledWith(
      expect.stringContaining('-label:Processed'),
    );
  });
});
