const { CalendarService } = require('../CalendarService');

// モックの定義
const mockGetEvents = jest.fn();
const mockGetDefaultCalendar = jest.fn();

// グローバルスコープにCalendarAppをモックとして生やす
global.CalendarApp = {
  getDefaultCalendar: mockGetDefaultCalendar,
};

describe('CalendarService', () => {
  let service;
  const mockCalendar = {
    getEvents: mockGetEvents,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDefaultCalendar.mockReturnValue(mockCalendar);
    service = new CalendarService();
  });

  const createMockEvent = (title, date) => ({
    getTitle: () => title,
    getStartTime: () => date,
    isAllDayEvent: () => false,
  });

  it('期間内の「出社」イベントの日数と日付リストを正しく取得できるべき', () => {
    const startDate = new Date(2026, 0, 16);
    const endDate = new Date(2026, 1, 15);

    const events = [
      createMockEvent('出社', new Date(2026, 0, 20)),
      createMockEvent('出社', new Date(2026, 0, 25)),
      createMockEvent('リモート', new Date(2026, 1, 5)),
    ];

    mockGetEvents.mockReturnValue(events);

    const summary = service.getCommuteSummary(startDate, endDate);

    expect(mockGetDefaultCalendar).toHaveBeenCalled();
    expect(mockGetEvents).toHaveBeenCalledWith(startDate, endDate);
    expect(summary.count).toBe(2);
    expect(summary.dates).toEqual(['1/20', '1/25']);
  });
});
