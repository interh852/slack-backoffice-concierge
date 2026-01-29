import { getSettlementPeriod } from './PeriodCalculator';
import { CalendarService } from './CalendarService';
import { SpreadsheetService } from './SpreadsheetService';
import { COMMUTE_UNIT_PRICE, SPREADSHEET_ID, SHEET_NAME } from './Constants';

/**
 * 交通費を計算してスプレッドシートに保存するメイン関数
 * @param baseDate 基準日（テスト用、通常は省略して現在日時を使用）
 */
export function calculateAndSaveCommuteExpenses(baseDate: Date = new Date()): void {
  const userEmail = Session.getActiveUser().getEmail();
  
  // 1. 精算期間の計算
  const period = getSettlementPeriod(baseDate);
  
  // 2. カレンダーから出社情報を集計
  const calendarService = new CalendarService();
  const summary = calendarService.getCommuteSummary(period.startDate, period.endDate);
  
  // 3. 金額計算
  const totalAmount = summary.count * COMMUTE_UNIT_PRICE;
  
  // 対象月の文字列生成 (例: "2026-01")
  // 締め日が15日なので、endDateの月が対象月となる
  const targetYear = period.endDate.getFullYear();
  const targetMonth = period.endDate.getMonth() + 1;
  const targetMonthStr = `${targetYear}-${targetMonth.toString().padStart(2, '0')}`;
  
  // 4. スプレッドシートに保存
  const spreadsheetService = new SpreadsheetService(SPREADSHEET_ID, SHEET_NAME);
  spreadsheetService.saveRecord({
    applicationDate: baseDate,
    userEmail: userEmail,
    targetMonth: targetMonthStr,
    unitPrice: COMMUTE_UNIT_PRICE,
    daysCount: summary.count,
    totalAmount: totalAmount,
    dateList: summary.dates.join(', ') // 日付リストをカンマ区切り文字列に変換
  });
}
