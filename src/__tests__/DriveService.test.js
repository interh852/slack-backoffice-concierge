const { DriveService } = require('../DriveService');

// DriveAppのモック
global.DriveApp = {
  getFoldersByName: jest.fn(),
};

describe('DriveService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DriveService();
  });

  it('指定したパスのフォルダを再帰的に取得する', () => {
    const mockFolderRoot = {
      getFoldersByName: jest.fn(),
    };
    const mockFolderFinance = {
      getFoldersByName: jest.fn(),
    };
    const mockFolderArchive = {
      getFoldersByName: jest.fn(),
    };
    const mockFolderSite = {
      getFoldersByName: jest.fn(),
    };
    const mockFolderDaily = {
      getName: () => 'Daily Summary',
    };

    // 共有ドライブのルート取得のモック
    DriveApp.getFoldersByName.mockReturnValue({
      hasNext: jest.fn().mockReturnValueOnce(true).mockReturnValue(false),
      next: jest.fn().mockReturnValue(mockFolderRoot),
    });

    // 各階層のフォルダ取得のモック
    mockFolderRoot.getFoldersByName.mockReturnValue({
      hasNext: jest.fn().mockReturnValueOnce(true).mockReturnValue(false),
      next: jest.fn().mockReturnValue(mockFolderFinance),
    });
    mockFolderFinance.getFoldersByName.mockReturnValue({
      hasNext: jest.fn().mockReturnValueOnce(true).mockReturnValue(false),
      next: jest.fn().mockReturnValue(mockFolderArchive),
    });
    mockFolderArchive.getFoldersByName.mockReturnValue({
      hasNext: jest.fn().mockReturnValueOnce(true).mockReturnValue(false),
      next: jest.fn().mockReturnValue(mockFolderSite),
    });
    mockFolderSite.getFoldersByName.mockReturnValue({
      hasNext: jest.fn().mockReturnValueOnce(true).mockReturnValue(false),
      next: jest.fn().mockReturnValue(mockFolderDaily),
    });

    const path = '50_風車管理/金融機関報告/アーカイブ（日報・日次レポート・月次レポート）/site_A/Daily Summary';
    const folder = service.getFolderFromPath(path);

    expect(DriveApp.getFoldersByName).toHaveBeenCalledWith('50_風車管理');
    expect(folder.getName()).toBe('Daily Summary');
  });

  it('フォルダが存在しない場合にエラーを投げる', () => {
    const mockFolderRoot = {
      getFoldersByName: jest.fn().mockReturnValue({
        hasNext: () => false,
      }),
      getName: () => 'Root',
    };

    DriveApp.getFoldersByName.mockReturnValue({
      hasNext: () => true,
      next: () => mockFolderRoot,
    });

    const path = 'Root/NotFound';
    expect(() => service.getFolderFromPath(path)).toThrow('Folder "NotFound" not found in "Root"');
  });
});
