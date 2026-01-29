export interface SettlementPeriod {
  startDate: Date;
  endDate: Date;
}

const CLOSING_DAY = 15;
const START_DAY = 16;

/**
 * 15日締めサイクルに基づいて精算期間を計算します。
 * 精算期間は、締切日に対応する前月16日から当月15日までとなります。
 *
 * @param baseDate 計算の基準となる日付。
 * @returns 直近で締められた期間の開始日と終了日。
 */
export function getSettlementPeriod(baseDate: Date): SettlementPeriod {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const day = baseDate.getDate();

  let endYear = year;
  let endMonth = month;

  if (day <= CLOSING_DAY) {
    // 今日が締め日以前の場合、直近の締め期間は前月の15日に終了しています。
    endMonth -= 1;
  }
  // 今日が締め日より後の場合、直近の締め期間は当月の15日に終了しています。

  const endDate = new Date(endYear, endMonth, CLOSING_DAY);
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, START_DAY);

  return { startDate, endDate };
}
