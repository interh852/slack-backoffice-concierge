const { SpreadsheetService } = require('../SpreadsheetService');

// モックの定義
const mockSetRangeValue = jest.fn();
const mockGetRange = jest.fn().mockReturnValue({
  setValue: mockSetRangeValue,
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

global.SpreadsheetApp = {
  open: mockOpen,
};

const mockMakeCopy = jest.fn().mockReturnValue('mock-copy-file');
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
};

global.DriveApp = {
  getFileById: mockGetFileById,
  getRootFolder: jest.fn().mockReturnValue(mockFolder),
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
    expect(mockMakeCopy).toHaveBeenCalledWith(`通勤費精算_${record.targetMonth}_田中 太郎`, expect.anything());
    expect(mockOpen).toHaveBeenCalledWith('mock-copy-file');
    
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
      };
      const mockFilesIterator = {
        hasNext: jest.fn().mockReturnValueOnce(true).mockReturnValue(false),
        next: jest.fn().mockReturnValue(mockFile),
      };

      const mockTargetFolder = {
        getFilesByName: jest.fn().mockReturnValue(mockFilesIterator),
        getFoldersByName: jest.fn().mockReturnValue({ hasNext: () => false }),
      };

      // getOrCreateFolder のロジックに合わせてモックをネストさせる
      // backoffice-concierge/通勤費 の2階層分
      const mockSubFolder = {
        getFoldersByName: jest.fn().mockReturnValue({
          hasNext: jest.fn().mockReturnValue(true),
          next: jest.fn().mockReturnValue(mockTargetFolder),
        }),
      };

      mockFolder.getFoldersByName.mockReturnValue({
        hasNext: jest.fn().mockReturnValue(true),
        next: jest.fn().mockReturnValue(mockSubFolder),
      });

      const mockLastMonthSheet = {
        getRange: jest.fn().mockReturnValue({
          getValue: () => 600, // 片道600円
        }),
      };
      mockOpen.mockReturnValue({
        getSheets: () => [mockLastMonthSheet],
      });

      const fare = service.getLastMonthFare(userEmail, baseDate);

      expect(fare).toBe(600);
      expect(mockTargetFolder.getFilesByName).toHaveBeenCalledWith('通勤費精算_2026-01_test');
      expect(mockLastMonthSheet.getRange).toHaveBeenCalledWith('D2'); // ONE_WAY_COST のセル
    });

    it('先月の精算書が存在しない場合、nullを返すべき', () => {
      const userEmail = 'test@example.com';
      const baseDate = new Date(2026, 1, 15);

      mockFolder.getFoldersByName.mockReturnValue({
        hasNext: jest.fn().mockReturnValue(false),
      });

      const fare = service.getLastMonthFare(userEmail, baseDate);
      expect(fare).toBeNull();
    });
  });
});
