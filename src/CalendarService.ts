import { COMMUTE_KEYWORD } from './Constants';

export interface CommuteSummary {
  count: number;
  dates: string[];
}

export class CalendarService {
  /**
   * 指定された期間内の「出社」イベントを集計します。
   * @param startDate 期間開始日
   * @param endDate 期間終了日
   * @returns 出社日数と日付リスト（重複は除外）
   */
  getCommuteSummary(startDate: Date, endDate: Date): CommuteSummary {
    const calendar = CalendarApp.getDefaultCalendar();
    const events = calendar.getEvents(startDate, endDate);
    
    // 日付を一意に識別するためのセット
    const commuteDates = new Set<string>();

    events.forEach(event => {
      if (event.getTitle().includes(COMMUTE_KEYWORD)) {
        const date = event.getStartTime();
        // 時間部分を切り捨てて「YYYY-MM-DD」形式の文字列にする
        const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        commuteDates.add(dateString);
      }
    });

    // 日付順にソートして配列にする
    const sortedDates = Array.from(commuteDates).sort();

    return {
      count: sortedDates.length,
      dates: sortedDates
    };
  }
}
