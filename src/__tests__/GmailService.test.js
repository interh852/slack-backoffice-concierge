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

  it('過去24時間以内の月次日報レポートメールを検索する', () => {
    const mockThreads = [];
    GmailApp.search.mockReturnValue(mockThreads);

    service.getRecentMonthlyReports();

    expect(GmailApp.search).toHaveBeenCalledWith(
      expect.stringContaining('subject:("月次日報レポート") after:'),
    );
  });
});
