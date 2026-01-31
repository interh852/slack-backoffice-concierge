const main = require('../main');
// UseCaseの実装はモックせず、そのまま使う（結合テスト）
// ただし、内部で呼ばれる GAS API はモックする

// GASのグローバルオブジェクトモック
const mockGetActiveUser = jest.fn();
const mockGetEmail = jest.fn();
global.Session = {
  getActiveUser: mockGetActiveUser,
};

// CalendarApp モック
const mockGetEvents = jest.fn();
const mockGetDefaultCalendar = jest.fn().mockReturnValue({
  getEvents: mockGetEvents,
});
global.CalendarApp = {
  getDefaultCalendar: mockGetDefaultCalendar,
};

// SpreadsheetApp モック
const mockAppendRow = jest.fn();
const mockGetSheetByName = jest.fn().mockReturnValue({
  appendRow: mockAppendRow,
});
const mockOpenById = jest.fn().mockReturnValue({
  getSheetByName: mockGetSheetByName,
});
global.SpreadsheetApp = {
  openById: mockOpenById,
};

describe('Main Entry Point', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActiveUser.mockReturnValue({ getEmail: mockGetEmail });
  });

  const createMockEvent = (title, date) => ({
    getTitle: () => title,
    getStartTime: () => date,
  });

  it('applyCommuteExpenses は CommuteExpenseUseCase を通じて処理を完遂すべき', () => {
    const mockEmail = 'test@example.com';
    const mockDate = new Date(2026, 0, 29);
    const mockUnitPrice = 1000;
    
    // テストデータ
    const events = [
      createMockEvent('出社', new Date(2026, 0, 10)),
      createMockEvent('出社', new Date(2026, 0, 12)),
    ];

    mockGetEmail.mockReturnValue(mockEmail);
    mockGetEvents.mockReturnValue(events);

    const result = main.applyCommuteExpenses(mockDate, mockUnitPrice);

    // UseCase が正しく機能した結果として、戻り値を検証
    expect(result).toEqual({
      daysCount: 2,
      totalAmount: 2000,
      dates: ['2026-01-10', '2026-01-12']
    });

    // 内部のAPI呼び出しも検証（統合テストとして）
    expect(mockGetDefaultCalendar).toHaveBeenCalled();
    expect(mockGetEvents).toHaveBeenCalled();
    expect(mockAppendRow).toHaveBeenCalledWith([
      mockDate,
      mockEmail,
      '2026-01',
      mockUnitPrice,
      2,
      2000,
      '2026-01-10, 2026-01-12'
    ]);
  });
});