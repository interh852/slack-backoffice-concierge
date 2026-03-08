const { MonthlyReportArchiverUseCase } = require('../MonthlyReportArchiverUseCase');

// GmailとDriveのモック
global.GmailApp = { search: jest.fn() };
global.DriveApp = { getFoldersByName: jest.fn() };

describe('MonthlyReportArchiverUseCase', () => {
  let useCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new MonthlyReportArchiverUseCase();
  });

  describe('extractSiteName', () => {
    it('表題の先頭のスペース区切りからサイト名を抽出できる', () => {
      const subject = 'nikaho1 月次日報レポート 2026-02';
      expect(useCase.extractSiteName(subject)).toBe('nikaho1');
    });

    it('サイト名が含まれない場合はUnknownを返す', () => {
      const subject = '月次日報レポート 2026-02';
      expect(useCase.extractSiteName(subject)).toBe('Unknown');
    });
  });

  describe('archive', () => {
    it('メールのスレッドをループして添付PDFをDriveに保存する', () => {
      const mockAttachment = {
        getName: () => 'report.pdf',
        getContentType: () => 'application/pdf',
        copyBlob: jest.fn().mockReturnThis(),
      };
      const mockMessage = {
        getSubject: () => 'nikaho1 月次日報レポート 2026-02',
        getAttachments: () => [mockAttachment],
      };
      const mockThread = {
        getMessages: () => [mockMessage],
      };
      const mockFolder = {
        createFile: jest.fn(),
      };

      // 依存サービスのメソッドをスパイ
      const getRecentMonthlyReportsSpy = jest.spyOn(useCase.gmailService, 'getRecentMonthlyReports')
        .mockReturnValue([mockThread]);
      const getOrCreateFolderSpy = jest.spyOn(useCase.driveService, 'getOrCreateFolderFromPath')
        .mockReturnValue(mockFolder);

      useCase.archive();

      expect(getRecentMonthlyReportsSpy).toHaveBeenCalled();
      expect(getOrCreateFolderSpy).toHaveBeenCalledWith(
        expect.stringContaining('nikaho1/Daily Summary')
      );
      expect(mockFolder.createFile).toHaveBeenCalledWith(mockAttachment);
    });
  });
});
