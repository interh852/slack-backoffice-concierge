const { SpreadsheetService } = require('../SpreadsheetService');

// モックの定義
const mockSetRangeValue = jest.fn();
const mockGetRange = jest.fn().mockReturnValue({
  setValue: mockSetRangeValue,
  getValue: jest.fn(),
});
const mockGetSheetByName = jest.fn().mockReturnValue({
  getRange: mockGetRange,
});

const mockSheet = {
  getRange: mockGetRange,
};

const mockOpen = jest.fn().mockReturnValue({
  getSheetByName: mockGetSheetByName,
  getSheets: jest.fn().mockReturnValue([mockSheet]),
  getUrl: jest.fn().mockReturnValue('https://example.com/spreadsheet'),
});

const mockOpenById = jest.fn().mockReturnValue({
  getSheetByName: mockGetSheetByName,
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
  getFiles: jest.fn().mockReturnValue({
    hasNext: jest.fn().mockReturnValue(false),
    next: jest.fn(),
  }),
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
      applicationDate: new Date(2026, 0, 29),
      userEmail: 'taro.tanaka@example.com',
      userName: '田中 太郎',
      targetMonth: '2026-01',
      unitPrice: 1000,
      daysCount: 5,
      totalAmount: 5000,
      dateList: '2026/01/20, 2026/01/21',
    };

    const url = service.exportToTemplate(templateId, record);

    expect(url).toBe('https://example.com/spreadsheet');
    expect(mockGetFileById).toHaveBeenCalledWith(templateId);
    expect(mockMakeCopy).toHaveBeenCalledWith(
      `通勤費精算_${record.targetMonth}_田中 太郎`,
      expect.anything()
    );
    expect(mockOpenById).toHaveBeenCalledWith('mock-copy-file-id');

    // テンプレートの形式に沿った流し込み確認
    expect(mockGetRange).toHaveBeenCalledWith('A2');
    expect(mockSetRangeValue).toHaveBeenCalledWith('田中 太郎');
  });

  describe('getLastMonthFare', () => {
    it('先月の精算書が存在する場合、片道運賃を取得できるべき', () => {
      const userEmail = 'test@example.com';
      const baseDate = new Date(2026, 1, 15); // 2月
      // 先月は 2026-01

      const mockFile = {
        getId: () => 'last-month-file-id',
        getName: () => '通勤費精算_2026-01_伊東明則',
      };

      const mockFilesIterator = {
        hasNext: jest.fn().mockReturnValueOnce(true).mockReturnValue(false),
        next: jest.fn().mockReturnValue(mockFile),
      };

      global.DriveApp.searchFiles.mockReturnValue(mockFilesIterator);

      // getRange().getValue() の戻り値を設定
      mockGetRange.mockReturnValue({
        getValue: jest.fn().mockReturnValue(600),
      });

      const fare = service.getLastMonthFare(userEmail, baseDate, '伊東明則');

      expect(fare).toBe(600);
      expect(global.DriveApp.searchFiles).toHaveBeenCalled();
      expect(mockOpenById).toHaveBeenCalledWith('last-month-file-id');
    });

    it('先月の精算書が存在しない場合、nullを返すべき', () => {
      const userEmail = 'test@example.com';
      const baseDate = new Date(2026, 1, 15);

      global.DriveApp.searchFiles.mockReturnValue({
        hasNext: jest.fn().mockReturnValue(false),
      });

      const fare = service.getLastMonthFare(userEmail, baseDate, 'test');
      expect(fare).toBeNull();
    });
  });
});
