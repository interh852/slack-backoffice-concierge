// モック化を最初に行う
const mockExecute = jest.fn();
jest.mock('../CommuteExpenseUseCase', () => ({
  CommuteExpenseUseCase: jest.fn(() => ({
    execute: mockExecute
  }))
}));

const mockArchive = jest.fn();
jest.mock('../MonthlyReportArchiverUseCase', () => ({
  MonthlyReportArchiverUseCase: jest.fn(() => ({
    archive: mockArchive
  }))
}));

// GASのグローバル環境を模倣
global.CommuteExpenseUseCase = jest.requireMock('../CommuteExpenseUseCase').CommuteExpenseUseCase;
global.MonthlyReportArchiverUseCase = jest.requireMock('../MonthlyReportArchiverUseCase').MonthlyReportArchiverUseCase;

// その後に require
const { applyCommuteExpenses, archiveMonthlyReports } = require('../main');

describe('Main Entry Point', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applyCommuteExpenses は CommuteExpenseUseCase を通じて処理を完遂すべき', () => {
    const mockDate = new Date(2026, 0, 29);
    const mockUnitPrice = 1000;
    const mockUserName = '田中 太郎';
    const mockUserEmail = 'test@example.com';
    const mockResult = {
      daysCount: 2,
      totalAmount: 2000,
      dates: ['2026-01-10', '2026-01-12'],
      spreadsheetUrl: 'https://example.com/spreadsheet'
    };

    mockExecute.mockReturnValue(mockResult);

    const result = applyCommuteExpenses(mockDate, mockUnitPrice, mockUserName, mockUserEmail);

    expect(global.CommuteExpenseUseCase).toHaveBeenCalled();
    expect(mockExecute).toHaveBeenCalledWith(mockDate, mockUnitPrice, mockUserName, mockUserEmail);
    expect(result).toEqual(mockResult);
  });

  it('archiveMonthlyReports は MonthlyReportArchiverUseCase を通じて処理を完遂すべき', () => {
    archiveMonthlyReports();
    expect(global.MonthlyReportArchiverUseCase).toHaveBeenCalled();
    expect(mockArchive).toHaveBeenCalled();
  });
});
