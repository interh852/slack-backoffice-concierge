const { SpreadsheetService } = require('../SpreadsheetService');

// グローバル定数のモック
global.TEMPLATE_CELLS = {
  USER_NAME: 'A2',
  TOTAL_AMOUNT: 'F2',
  DAYS_COUNT: 'E2',
  DATE_LIST: 'G2',
  ONE_WAY_COST: 'D2',
};
global.EXPORT_FOLDER_PATH = 'backoffice-concierge/通勤費';

// モックの定義
const mockSetRangeValue = jest.fn();
const mockGetValue = jest.fn();
const mockGetRange = jest.fn().mockReturnValue({
  setValue: mockSetRangeValue,
  getValue: mockGetValue,
});

const mockSheet = {
  getRange: mockGetRange,
};

const mockOpen = jest.fn().mockReturnValue({
  getSheets: jest.fn().mockReturnValue([mockSheet]),
  getUrl: jest.fn().mockReturnValue('https://example.com/spreadsheet'),
});

const mockOpenById = jest.fn().mockReturnValue({
  getSheets: jest.fn().mockReturnValue([mockSheet]),
  getUrl: jest.fn().mockReturnValue('https://example.com/spreadsheet'),
});

global.SpreadsheetApp = {
  open: mockOpen,
  openById: mockOpenById,
};

const mockMakeCopy = jest.fn().mockReturnValue({
  getId: jest.fn().mockReturnValue('mock-copy-file-id'),
});
const mockGetFileById = jest.fn().mockReturnValue({
  makeCopy: mockMakeCopy,
});

// フォルダモック
const mockFolder = {
  getFoldersByName: jest.fn().mockReturnValue({
    hasNext: jest.fn().mockReturnValue(false),
    next: jest.fn(),
  }),
  createFolder: jest.fn().mockReturnThis(),
  getName: () => 'Root',
};

global.DriveApp = {
  getFileById: mockGetFileById,
  getRootFolder: jest.fn().mockReturnValue(mockFolder),
  searchFiles: jest.fn().mockReturnValue({
    hasNext: jest.fn().mockReturnValue(false),
    next: jest.fn(),
  }),
};

describe('SpreadsheetService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SpreadsheetService();
  });

  it('テンプレートをコピーして指定のフォルダに保存し、レコードを流し込めるべき', () => {
    const templateId = 'template-id';
    const record = {
      userName: '田中 太郎',
      targetMonth: '2026-01',
      totalAmount: 5000,
      daysCount: 5,
      dateList: '2026/01/20, 2026/01/21',
    };

    const url = service.exportToTemplate(templateId, record);

    expect(url).toBe('https://example.com/spreadsheet');
    expect(mockGetFileById).toHaveBeenCalledWith(templateId);
    expect(mockOpenById).toHaveBeenCalledWith('mock-copy-file-id');

    // テンプレートの形式に沿った流し込み確認
    expect(mockGetRange).toHaveBeenCalledWith('A2');
    expect(mockSetRangeValue).toHaveBeenCalledWith('田中 太郎');
  });

  describe('getLastMonthFare', () => {
    it('先月の精算書が存在する場合、片道運賃を取得できるべき', () => {
      const targetMonth = '2026-01';
      const userName = '伊東明則';

      const mockFile = {
        getId: () => 'last-month-file-id',
        getName: () => '通勤費精算_2026-01_伊東明則',
      };

      const mockFilesIterator = {
        hasNext: jest.fn().mockReturnValueOnce(true).mockReturnValue(false),
        next: jest.fn().mockReturnValue(mockFile),
      };

      global.DriveApp.searchFiles.mockReturnValue(mockFilesIterator);
      mockGetValue.mockReturnValue(600);

      const fare = service.getLastMonthFare(targetMonth, userName);

      expect(fare).toBe(600);
      expect(global.DriveApp.searchFiles).toHaveBeenCalled();
      expect(mockOpen).toHaveBeenCalled();
    });

    it('先月の精算書が存在しない場合、nullを返すべき', () => {
      global.DriveApp.searchFiles.mockReturnValue({
        hasNext: jest.fn().mockReturnValue(false),
      });

      const fare = service.getLastMonthFare('2026-01', 'test');
      expect(fare).toBeNull();
    });
  });
});
