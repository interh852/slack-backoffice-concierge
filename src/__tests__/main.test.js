// モック化を最初に行う
const mockExecute = jest.fn();
jest.mock('../CommuteExpenseUseCase', () => ({
  CommuteExpenseUseCase: jest.fn(() => ({
    execute: mockExecute
  }))
}));

// その後に require
const { applyCommuteExpenses } = require('../main');
const { CommuteExpenseUseCase } = require('../CommuteExpenseUseCase');

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

    // UseCase が正しく呼ばれたか検証
    expect(CommuteExpenseUseCase).toHaveBeenCalled();
    expect(mockExecute).toHaveBeenCalledWith(mockDate, mockUnitPrice, mockUserName, mockUserEmail);

    // 戻り値の検証
    expect(result).toEqual(mockResult);
  });
});
