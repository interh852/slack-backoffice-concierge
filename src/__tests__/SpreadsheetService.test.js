const { SpreadsheetService } = require('../SpreadsheetService');

// モックの定義
const mockAppendRow = jest.fn();
const mockSetRangeValue = jest.fn();
const mockGetRange = jest.fn().mockReturnValue({
  setValue: mockSetRangeValue,
});
const mockGetSheetByName = jest.fn().mockReturnValue({
  appendRow: mockAppendRow,
  getRange: mockGetRange,
});
const mockOpenById = jest.fn().mockReturnValue({
  getSheetByName: mockGetSheetByName,
});
const mockOpen = jest.fn().mockReturnValue({
  getSheetByName: mockGetSheetByName,
  getUrl: jest.fn().mockReturnValue('https://example.com/spreadsheet'),
});

global.SpreadsheetApp = {
  openById: mockOpenById,
  open: mockOpen,
};

const mockMakeCopy = jest.fn().mockReturnValue('mock-copy-file');
const mockGetFileById = jest.fn().mockReturnValue({
  makeCopy: mockMakeCopy,
});

global.DriveApp = {
  getFileById: mockGetFileById,
};

describe('SpreadsheetService', () => {
  let service;
  const SPREADSHEET_ID = 'test-id';
  const SHEET_NAME = 'test-sheet';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SpreadsheetService(SPREADSHEET_ID, SHEET_NAME);
  });

  it('レコードを正しくスプレッドシートに追加できるべき', () => {
    const record = {
      applicationDate: new Date(2026, 0, 29),
      userEmail: 'taro.tanaka@example.com',
      targetMonth: '2026-01',
      unitPrice: 1000,
      daysCount: 5,
      totalAmount: 5000,
      dateList: '2026/01/20, 2026/01/21',
    };

    service.saveRecord(record);

    expect(mockOpenById).toHaveBeenCalledWith(SPREADSHEET_ID);
    expect(mockGetSheetByName).toHaveBeenCalledWith(SHEET_NAME);
    expect(mockAppendRow).toHaveBeenCalledWith([
      record.applicationDate,
      record.userEmail,
      record.targetMonth,
      record.unitPrice,
      record.daysCount,
      record.totalAmount,
      record.dateList,
    ]);
  });

  it('テンプレートをコピーしてレコードを流し込めるべき', () => {
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
    expect(mockMakeCopy).toHaveBeenCalledWith(`通勤費精算_${record.targetMonth}_taro.tanaka`);
    expect(mockOpen).toHaveBeenCalledWith('mock-copy-file');
    // セルへの流し込み（セルの位置は仮定）
    expect(mockGetRange).toHaveBeenCalled();
    expect(mockSetRangeValue).toHaveBeenCalled();
  });
});
