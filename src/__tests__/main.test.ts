import { calculateAndSaveCommuteExpenses } from '../main';
import * as PeriodCalculator from '../PeriodCalculator';
import { CalendarService } from '../CalendarService';
import { SpreadsheetService } from '../SpreadsheetService';

// モック化
jest.mock('../PeriodCalculator');
jest.mock('../CalendarService');
jest.mock('../SpreadsheetService');

// GASのSessionモック
const mockGetActiveUser = jest.fn();
const mockGetEmail = jest.fn();
(global as any).Session = {
  getActiveUser: mockGetActiveUser,
};

describe('Main Script Integration', () => {
  const mockCalendarServiceInstance = {
    getCommuteSummary: jest.fn(),
  };
  const mockSpreadsheetServiceInstance = {
    saveRecord: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (CalendarService as jest.Mock).mockImplementation(() => mockCalendarServiceInstance);
    (SpreadsheetService as jest.Mock).mockImplementation(() => mockSpreadsheetServiceInstance);
    mockGetActiveUser.mockReturnValue({ getEmail: mockGetEmail });
  });

  it('メインフローが正しく連携して実行されるべき', () => {
    // データ準備
    const mockEmail = 'test@example.com';
    const mockDate = new Date(2026, 0, 29); // 1月29日
    const mockStartDate = new Date(2025, 11, 16);
    const mockEndDate = new Date(2026, 0, 15);
    const mockDaysCount = 2;
    const mockDates = ['2026-01-20', '2026-01-25'];

    // モックの挙動設定
    mockGetEmail.mockReturnValue(mockEmail);
    
    (PeriodCalculator.getSettlementPeriod as jest.Mock).mockReturnValue({
      startDate: mockStartDate,
      endDate: mockEndDate,
    });
    mockCalendarServiceInstance.getCommuteSummary.mockReturnValue({
      count: mockDaysCount,
      dates: mockDates
    });

    // 実行
    calculateAndSaveCommuteExpenses(mockDate);

    // 検証
    expect(mockGetActiveUser).toHaveBeenCalled();
    expect(mockGetEmail).toHaveBeenCalled();
    
    expect(PeriodCalculator.getSettlementPeriod).toHaveBeenCalledWith(mockDate);
    
    expect(CalendarService).toHaveBeenCalled();
    expect(mockCalendarServiceInstance.getCommuteSummary).toHaveBeenCalledWith(mockStartDate, mockEndDate);

    expect(SpreadsheetService).toHaveBeenCalled();
    expect(mockSpreadsheetServiceInstance.saveRecord).toHaveBeenCalledWith({
      applicationDate: mockDate,
      userEmail: mockEmail,
      targetMonth: expect.any(String), // '2026-01'
      unitPrice: expect.any(Number),
      daysCount: mockDaysCount,
      totalAmount: expect.any(Number),
      dateList: '2026-01-20, 2026-01-25', // カンマ区切りになっていることを検証
    });
  });
});
