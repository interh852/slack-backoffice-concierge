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

// SpreadsheetService のモック
const mockGetSiteNameMap = jest.fn();
jest.mock('../SpreadsheetService', () => {
  return {
    SpreadsheetService: jest.fn().mockImplementation(() => {
      return {
        getSiteNameMap: mockGetSiteNameMap,
      };
    }),
  };
});

// 定数取得のモック
global.getSpreadsheetId = jest.fn().mockReturnValue('mock-ss-id');

// モックをグローバルに
global.SpreadsheetService = jest.requireMock('../SpreadsheetService').SpreadsheetService;

describe('MonthlyReportArchiverUseCase', () => {
  let useCase;
  const mockFolderId = 'test-folder-id';

  beforeEach(() => {
    jest.clearAllMocks();
    PropertiesService.getScriptProperties().getProperty.mockReturnValue(mockFolderId);
    mockGetSiteNameMap.mockReturnValue({
      'nikaho1': 'にかほ1'
    });
    useCase = new MonthlyReportArchiverUseCase();
  });

  describe('extractSiteName', () => {
    it('表題の先頭のスペース区切りからサイト名を抽出できる', () => {
      const subject = 'nikaho1 月次日報レポート 2026-02';
      expect(useCase.extractSiteName(subject)).toBe('nikaho1');
    });
  });

  describe('archive', () => {
    it('サイト名をマッピング変換してDriveに保存する', () => {
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

      DriveApp.getFolderById.mockReturnValue(mockBaseFolder);
      GmailApp.getUserLabelByName.mockReturnValue(mockLabel);

      jest.spyOn(useCase.gmailService, 'getRecentThreads').mockReturnValue([mockThread]);
      const getFolderFromPathSpy = jest.spyOn(useCase.driveService, 'getFolderFromPath').mockReturnValue(mockFolder);

      useCase.archive();

      // nikaho1 が にかほ1 に変換されていることを確認
      expect(getFolderFromPathSpy).toHaveBeenCalledWith(
        `にかほ1/${ARCHIVE_CONFIG.TARGET_SUBFOLDER}`,
        mockBaseFolder,
        false
      );
      expect(mockFolder.createFile).toHaveBeenCalledWith(mockAttachment);
    });
  });
});
