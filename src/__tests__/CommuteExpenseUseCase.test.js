// モック化を最初に行う
const mockGetSettlementPeriod = jest.fn();
jest.mock('../PeriodCalculator', () => ({
  getSettlementPeriod: mockGetSettlementPeriod
}));

const mockGetCommuteSummary = jest.fn();
const mockCalendarServiceInstance = {
  getCommuteSummary: mockGetCommuteSummary,
};
jest.mock('../CalendarService', () => ({
  CalendarService: jest.fn(() => mockCalendarServiceInstance)
}));

const mockExportToTemplate = jest.fn();
const mockSpreadsheetServiceInstance = {
  exportToTemplate: mockExportToTemplate,
};
jest.mock('../SpreadsheetService', () => ({
  SpreadsheetService: jest.fn(() => mockSpreadsheetServiceInstance)
}));

const mockGetTemplateSpreadsheetId = jest.fn();
jest.mock('../Constants', () => ({
  COMMUTE_UNIT_PRICE: 1000,
  getTemplateSpreadsheetId: mockGetTemplateSpreadsheetId,
}));

// その後に require
const { CommuteExpenseUseCase } = require('../CommuteExpenseUseCase');
const { CalendarService } = require('../CalendarService');
const { SpreadsheetService } = require('../SpreadsheetService');

describe('CommuteExpenseUseCase', () => {
  let useCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CommuteExpenseUseCase();
  });

  it('実行すると期間計算・集計・テンプレート出力を行い、結果を返すこと', () => {
    const mockEmail = 'test@example.com';
    const mockUserName = '田中 太郎';
    const mockDate = new Date(2026, 0, 29);
    const mockStartDate = new Date(2025, 11, 16);
    const mockEndDate = new Date(2026, 0, 15);
    const mockDaysCount = 2;
    const mockDates = ['2026-01-10', '2026-01-12'];
    const unitPrice = 1000;

    mockGetTemplateSpreadsheetId.mockReturnValue('test-template-id');
    
    mockGetSettlementPeriod.mockReturnValue({
      startDate: mockStartDate,
      endDate: mockEndDate,
    });
    mockGetCommuteSummary.mockReturnValue({
      count: mockDaysCount,
      dates: mockDates
    });
    mockExportToTemplate.mockReturnValue('https://example.com/spreadsheet');

    const result = useCase.execute(mockDate, unitPrice, mockUserName, mockEmail);

    // 戻り値の検証
    expect(result).toEqual({
      daysCount: mockDaysCount,
      totalAmount: 2000,
      dates: mockDates,
      spreadsheetUrl: 'https://example.com/spreadsheet'
    });

    // 呼び出し検証
    expect(mockGetSettlementPeriod).toHaveBeenCalledWith(mockDate);
    expect(CalendarService).toHaveBeenCalled();
    expect(mockGetCommuteSummary).toHaveBeenCalledWith(mockStartDate, mockEndDate);
    expect(SpreadsheetService).toHaveBeenCalled();
    expect(mockExportToTemplate).toHaveBeenCalledWith('test-template-id', expect.objectContaining({
      userEmail: mockEmail,
      userName: mockUserName,
      unitPrice: unitPrice,
      totalAmount: 2000
    }));
  });

  it('メールアドレスがない場合にエラーを投げること', () => {
    expect(() => {
      useCase.execute(new Date(), 1000, '田中 太郎', null);
    }).toThrow('User email is required');
  });
});
