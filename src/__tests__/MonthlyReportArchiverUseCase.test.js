const { MonthlyReportArchiverUseCase } = require('../MonthlyReportArchiverUseCase');

describe('MonthlyReportArchiverUseCase', () => {
  let useCase;

  beforeEach(() => {
    useCase = new MonthlyReportArchiverUseCase();
  });

  describe('extractSiteName', () => {
    it('表題の先頭のスペース区切りからサイト名を抽出できる', () => {
      const subject = 'nikaho1 月次日報レポート 2026-02';
      expect(useCase.extractSiteName(subject)).toBe('nikaho1');
    });

    it('サイト名が含まれない（表題が期待と異なる）場合はUnknownを返す', () => {
      // サイト名がなく「月次日報レポート」から始まる場合など
      const subject = '月次日報レポート 2026-02';
      expect(useCase.extractSiteName(subject)).toBe('Unknown');
    });
  });
});
