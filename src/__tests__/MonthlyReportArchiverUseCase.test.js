const { MonthlyReportArchiverUseCase } = require('../MonthlyReportArchiverUseCase');

describe('MonthlyReportArchiverUseCase', () => {
  let useCase;

  beforeEach(() => {
    useCase = new MonthlyReportArchiverUseCase();
  });

  describe('extractSiteName', () => {
    it('表題の先頭の[]からサイト名を抽出できる', () => {
      const subject = '[SITE_A] 月次日報レポート';
      const fileName = 'DailySummary.pdf';
      expect(useCase.extractSiteName(subject, fileName)).toBe('SITE_A');
    });

    it('ファイル名の先頭のアンダースコア前までをサイト名として抽出できる', () => {
      const subject = '月次日報レポート';
      const fileName = 'SITE_B_DailySummary.pdf';
      expect(useCase.extractSiteName(subject, fileName)).toBe('SITE_B');
    });

    it('表題もファイル名も[]がある場合、表題を優先する', () => {
      const subject = '[SITE_C] 月次日報レポート';
      const fileName = 'SITE_D_DailySummary.pdf';
      expect(useCase.extractSiteName(subject, fileName)).toBe('SITE_C');
    });

    it('どちらからも抽出できない場合はデフォルト名を返す', () => {
      const subject = '月次日報レポート';
      const fileName = 'DailySummary.pdf';
      expect(useCase.extractSiteName(subject, fileName)).toBe('Unknown');
    });
  });
});
