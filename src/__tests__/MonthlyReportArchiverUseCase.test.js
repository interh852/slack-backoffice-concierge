const { MonthlyReportArchiverUseCase } = require('../MonthlyReportArchiverUseCase');

// GmailとDrive、PropertiesServiceのモック
global.GmailApp = { search: jest.fn() };
global.DriveApp = {
  getFoldersByName: jest.fn(),
  getFolderById: jest.fn(),
};
global.PropertiesService = {
  getScriptProperties: jest.fn().mockReturnValue({
    getProperty: jest.fn(),
  }),
};

describe('MonthlyReportArchiverUseCase', () => {
  let useCase;
  const mockFolderId = 'test-folder-id';

  beforeEach(() => {
    jest.clearAllMocks();
    PropertiesService.getScriptProperties().getProperty.mockReturnValue(mockFolderId);
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
      const mockBaseFolder = { id: mockFolderId };
      const mockFolder = {
        createFile: jest.fn(),
      };

      // モックの設定
      DriveApp.getFolderById.mockReturnValue(mockBaseFolder);

      // 依存サービスのメソッドをスパイ
      const getRecentMonthlyReportsSpy = jest.spyOn(useCase.gmailService, 'getRecentMonthlyReports')
        .mockReturnValue([mockThread]);
      const getOrCreateFolderSpy = jest.spyOn(useCase.driveService, 'getOrCreateFolderFromPath')
        .mockReturnValue(mockFolder);

      useCase.archive();

      expect(PropertiesService.getScriptProperties().getProperty).toHaveBeenCalledWith('WF_BANK_REPORT_DRIVE');
      expect(getRecentMonthlyReportsSpy).toHaveBeenCalled();
      expect(DriveApp.getFolderById).toHaveBeenCalledWith(mockFolderId);
      expect(getOrCreateFolderSpy).toHaveBeenCalledWith(
        'nikaho1/Daily Summary',
        mockBaseFolder
      );
      expect(mockFolder.createFile).toHaveBeenCalledWith(mockAttachment);
    });

    it('フォルダIDが設定されていない場合にエラーを投げる', () => {
      PropertiesService.getScriptProperties().getProperty.mockReturnValue(null);
      useCase = new MonthlyReportArchiverUseCase();

      expect(() => useCase.archive()).toThrow('Script property WF_BANK_REPORT_DRIVE is not defined');
    });
  });
});
