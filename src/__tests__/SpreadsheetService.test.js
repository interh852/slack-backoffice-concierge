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
      targetMonth: '2026-01',
      unitPrice: 1000,
      daysCount: 5,
      totalAmount: 5000,
      dateList: '2026/01/20, 2026/01/21',
    };

    const url = service.exportToTemplate(templateId, record);

    expect(url).toBe('https://example.com/spreadsheet');
    expect(mockGetFileById).toHaveBeenCalledWith(templateId);
    expect(mockMakeCopy).toHaveBeenCalledWith(`通勤費精算_${record.targetMonth}_taro.tanaka`, expect.anything());
    expect(mockOpen).toHaveBeenCalledWith('mock-copy-file');
    
    // フォルダ作成の呼び出し確認
    expect(mockFolder.createFolder).toHaveBeenCalledWith('backoffice-concierge');
    expect(mockFolder.createFolder).toHaveBeenCalledWith('通勤費');
    
    // テンプレートの形式に沿った流し込み確認
    expect(mockGetRange).toHaveBeenCalledWith('A2');
    expect(mockSetRangeValue).toHaveBeenCalledWith('taro.tanaka');
    expect(mockGetRange).toHaveBeenCalledWith('D2');
    expect(mockSetRangeValue).toHaveBeenCalledWith(500); // 片道
    expect(mockGetRange).toHaveBeenCalledWith('E2');
    expect(mockSetRangeValue).toHaveBeenCalledWith(5);
    expect(mockGetRange).toHaveBeenCalledWith('F2');
    expect(mockSetRangeValue).toHaveBeenCalledWith(5000);
    expect(mockGetRange).toHaveBeenCalledWith('G2');
    expect(mockSetRangeValue).toHaveBeenCalledWith('2026/01/20, 2026/01/21');
  });
});
