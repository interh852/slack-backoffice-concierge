import { CalendarService } from '../CalendarService';

// Google Apps Scriptの型定義がローカルにはないので、モック用のインターフェースを定義
interface GoogleCalendarEvent {
  getTitle(): string;
  getStartTime(): Date;
  isAllDayEvent(): boolean;
}

// CalendarAppのモック
const mockGetEvents = jest.fn();
const mockGetDefaultCalendar = jest.fn();

// グローバルスコープにCalendarAppをモックとして生やす
(global as any).CalendarApp = {
  getDefaultCalendar: mockGetDefaultCalendar,
};

describe('CalendarService', () => {
  let service: CalendarService;
  const mockCalendar = {
    getEvents: mockGetEvents,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDefaultCalendar.mockReturnValue(mockCalendar);
    service = new CalendarService();
  });

  const createMockEvent = (title: string, date: Date): GoogleCalendarEvent => ({
    getTitle: () => title,
    getStartTime: () => date,
    isAllDayEvent: () => false,
  });

  it('期間内の「出社」イベントの日数を正しくカウントできるべき', () => {
    const startDate = new Date(2026, 0, 16); // 1月16日
    const endDate = new Date(2026, 1, 15);   // 2月15日

    const events = [
      createMockEvent('出社', new Date(2026, 0, 20)), // 1/20
      createMockEvent('出社', new Date(2026, 0, 25)), // 1/25
      createMockEvent('リモート', new Date(2026, 1, 5)), // 2/5 (対象外)
    ];

    mockGetEvents.mockReturnValue(events);

    const count = service.countCommuteDays(startDate, endDate);

    expect(mockGetDefaultCalendar).toHaveBeenCalled();
    expect(mockGetEvents).toHaveBeenCalledWith(startDate, endDate);
    expect(count).toBe(2);
  });

  it('同日に複数の「出社」イベントがあっても1日としてカウントするべき', () => {
    const startDate = new Date(2026, 0, 16);
    const endDate = new Date(2026, 1, 15);

    const events = [
      createMockEvent('出社', new Date(2026, 0, 20, 10, 0)), // 1/20 10:00
      createMockEvent('出社', new Date(2026, 0, 20, 18, 0)), // 1/20 18:00 (重複)
    ];

    mockGetEvents.mockReturnValue(events);

    const count = service.countCommuteDays(startDate, endDate);

    expect(count).toBe(1);
  });

  it('「出社」という文字列を含まないイベントは無視するべき', () => {
    const startDate = new Date(2026, 0, 16);
    const endDate = new Date(2026, 1, 15);

    const events = [
      createMockEvent('会議', new Date(2026, 0, 20)),
      createMockEvent('ランチ', new Date(2026, 0, 21)),
    ];

    mockGetEvents.mockReturnValue(events);

    const count = service.countCommuteDays(startDate, endDate);

    expect(count).toBe(0);
  });
});
