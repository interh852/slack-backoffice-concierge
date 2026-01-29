import { SpreadsheetService, CommuteRecord } from '../SpreadsheetService';

// SpreadsheetAppのモック
const mockAppendRow = jest.fn();
const mockGetSheetByName = jest.fn().mockReturnValue({
  appendRow: mockAppendRow,
});
const mockOpenById = jest.fn().mockReturnValue({
  getSheetByName: mockGetSheetByName,
});

(global as any).SpreadsheetApp = {
  openById: mockOpenById,
};

describe('SpreadsheetService', () => {
  let service: SpreadsheetService;
  const SPREADSHEET_ID = 'test-id';
  const SHEET_NAME = 'test-sheet';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SpreadsheetService(SPREADSHEET_ID, SHEET_NAME);
  });

  it('レコードを正しくスプレッドシートに追加できるべき', () => {
    const record: CommuteRecord = {
      applicationDate: new Date(2026, 0, 29),
      userEmail: 'taro.tanaka@example.com',
      targetMonth: '2026-01',
      unitPrice: 1000,
      daysCount: 5,
      totalAmount: 5000,
      dateList: '2026/01/20, 2026/01/21'
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
      record.dateList
    ]);
  });
});
