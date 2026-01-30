const main = require('../main');
// 実際のクラスを読み込む
const { CalendarService } = require('../CalendarService');
const { SpreadsheetService } = require('../SpreadsheetService');
const PeriodCalculator = require('../PeriodCalculator');

// jest.mock は使用しない！
// 代わりに GAS のグローバルオブジェクトをモック化する

// CalendarApp モック
const mockGetEvents = jest.fn();
const mockGetDefaultCalendar = jest.fn().mockReturnValue({
  getEvents: mockGetEvents
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

// PeriodCalculator はロジックなのでモックせず実物を動かしてもいいが、
// テストの安定性のためここだけ jest.spyOn で日付計算を固定してもいい。
// 今回は日付計算もロジックの一部として結合テストする。

const mockGetActiveUser = jest.fn();
const mockGetEmail = jest.fn();
global.Session = {
  getActiveUser: mockGetActiveUser,
};

describe('Main Script Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActiveUser.mockReturnValue({ getEmail: mockGetEmail });
  });

  const createMockEvent = (title, date) => ({
    getTitle: () => title,
    getStartTime: () => date,
  });

  it('メインフローが正しく連携して実行されるべき', () => {
    const mockEmail = 'test@example.com';
    const mockDate = new Date(2026, 0, 29); // 1月29日 -> 期間: 2025/12/16 - 2026/01/15
    
    // テストデータ
    // 期間内のイベントを用意
    const events = [
      createMockEvent('出社', new Date(2026, 0, 10)), // 1/10
      createMockEvent('出社', new Date(2026, 0, 12)), // 1/12
    ];

    mockGetEmail.mockReturnValue(mockEmail);
    mockGetEvents.mockReturnValue(events);

    main.calculateAndSaveCommuteExpenses(mockDate);

    // GAS API が正しく呼ばれたか検証
    expect(mockGetActiveUser).toHaveBeenCalled();
    
    // カレンダー取得
    expect(mockGetDefaultCalendar).toHaveBeenCalled();
    expect(mockGetEvents).toHaveBeenCalledWith(
      new Date(2025, 11, 16), // startDate
      new Date(2026, 0, 15)   // endDate
    );

    // スプレッドシート保存
    expect(mockOpenById).toHaveBeenCalledWith(expect.any(String)); // IDは定数なのでanyで
    expect(mockGetSheetByName).toHaveBeenCalledWith(expect.any(String));
    
    expect(mockAppendRow).toHaveBeenCalledWith([
      mockDate,
      mockEmail,
      '2026-01', // targetMonth
      1000,      // unitPrice
      2,         // daysCount
      2000,      // totalAmount
      '2026-01-10, 2026-01-12' // dateList
    ]);
  });
});
