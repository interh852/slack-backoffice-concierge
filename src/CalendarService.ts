import { COMMUTE_KEYWORD } from './Constants';

export class CalendarService {
  /**
   * 指定された期間内の「出社」日数をカウントします。
   * @param startDate 期間開始日
   * @param endDate 期間終了日
   * @returns 出社日数（重複は除外）
   */
  countCommuteDays(startDate: Date, endDate: Date): number {
    const calendar = CalendarApp.getDefaultCalendar();
    const events = calendar.getEvents(startDate, endDate);
    
    // 日付を一意に識別するためのセット
    const commuteDates = new Set<string>();

    events.forEach(event => {
      if (event.getTitle().includes(COMMUTE_KEYWORD)) {
        const date = event.getStartTime();
        // 時間部分を切り捨てて「YYYY-MM-DD」形式の文字列にする
        const dateString = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        commuteDates.add(dateString);
      }
    });

    return commuteDates.size;
  }
}
