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
    const mockResult = {
      daysCount: 2,
      totalAmount: 2000,
      dates: ['2026-01-10', '2026-01-12'],
      spreadsheetUrl: 'https://example.com/spreadsheet'
    };

    mockExecute.mockReturnValue(mockResult);

    const result = applyCommuteExpenses(mockDate, mockUnitPrice);

    // UseCase が正しく呼ばれたか検証
    expect(CommuteExpenseUseCase).toHaveBeenCalled();
    expect(mockExecute).toHaveBeenCalledWith(mockDate, mockUnitPrice);

    // UseCase が正しく機能した結果として、戻り値を検証
    expect(result).toEqual({
      daysCount: 2,
      totalAmount: 2000,
      dates: ['2026-01-10', '2026-01-12'],
      spreadsheetUrl: 'https://example.com/spreadsheet'
    });
  });
});
