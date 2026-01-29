export interface CommuteRecord {
  applicationDate: Date;
  userEmail: string;
  targetMonth: string;
  unitPrice: number;
  daysCount: number;
  totalAmount: number;
  dateList: string;
}

export class SpreadsheetService {
  constructor(
    private readonly spreadsheetId: string,
    private readonly sheetName: string
  ) {}

  /**
   * スプレッドシートにレコードを保存します。
   * @param record 保存するレコード
   */
  saveRecord(record: CommuteRecord): void {
    const spreadsheet = SpreadsheetApp.openById(this.spreadsheetId);
    const sheet = spreadsheet.getSheetByName(this.sheetName);
    
    if (!sheet) {
      throw new Error(`Sheet "${this.sheetName}" not found in spreadsheet ${this.spreadsheetId}`);
    }

    sheet.appendRow([
      record.applicationDate,
      record.userEmail,
      record.targetMonth,
      record.unitPrice,
      record.daysCount,
      record.totalAmount,
      record.dateList
    ]);
  }
}
