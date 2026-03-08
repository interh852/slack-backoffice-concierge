const { MonthlyReportArchiverUseCase } = require('../MonthlyReportArchiverUseCase');
const { ARCHIVE_CONFIG } = require('../Constants');

// GmailとDrive、PropertiesServiceのモック
global.GmailApp = {
  search: jest.fn(),
  getUserLabelByName: jest.fn(),
  createLabel: jest.fn(),
};
global.DriveApp = {
  getFoldersByName: jest.fn(),
  getFolderById: jest.fn(),
  getRootFolder: jest.fn(),
};
global.PropertiesService = {
  getScriptProperties: jest.fn().mockReturnValue({
    getProperty: jest.fn(),
  }),
};
global.ARCHIVE_CONFIG = ARCHIVE_CONFIG;

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
    it('メールのスレッドをループして添付PDFをDriveに保存しラベルを付与する', () => {
      const mockAttachment = {
        getName: () => 'report.pdf',
        getContentType: () => 'application/pdf',
      };
      const mockMessage = {
        getSubject: () => 'nikaho1 月次日報レポート 2026-02',
        getAttachments: () => [mockAttachment],
      };
      const mockThread = {
        getMessages: () => [mockMessage],
        addLabel: jest.fn(),
      };
      const mockBaseFolder = { id: mockFolderId };
      const mockFolder = {
        createFile: jest.fn(),
      };
      const mockLabel = { getName: () => ARCHIVE_CONFIG.PROCESSED_LABEL };

      // モックの設定
      DriveApp.getFolderById.mockReturnValue(mockBaseFolder);
      GmailApp.getUserLabelByName.mockReturnValue(mockLabel);

      // 依存サービスのメソッドをスパイ
      const getRecentThreadsSpy = jest.spyOn(useCase.gmailService, 'getRecentThreads')
        .mockReturnValue([mockThread]);
      const getFolderFromPathSpy = jest.spyOn(useCase.driveService, 'getFolderFromPath')
        .mockReturnValue(mockFolder);

      useCase.archive();

      expect(getRecentThreadsSpy).toHaveBeenCalledWith(
        ARCHIVE_CONFIG.TARGET_SUBJECT,
        ARCHIVE_CONFIG.PROCESSED_LABEL
      );
      expect(getFolderFromPathSpy).toHaveBeenCalledWith(
        `nikaho1/${ARCHIVE_CONFIG.TARGET_SUBFOLDER}`,
        mockBaseFolder,
        false
      );
      expect(mockFolder.createFile).toHaveBeenCalledWith(mockAttachment);
      expect(mockThread.addLabel).toHaveBeenCalledWith(mockLabel);
    });

    it('フォルダIDが設定されていない場合にエラーを投げる', () => {
      PropertiesService.getScriptProperties().getProperty.mockReturnValue(null);
      useCase = new MonthlyReportArchiverUseCase();

      expect(() => useCase.archive()).toThrow(`Script property ${ARCHIVE_CONFIG.DRIVE_PROP_KEY} is not defined`);
    });
  });
});
