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
});
