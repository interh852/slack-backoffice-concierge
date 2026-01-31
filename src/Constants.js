/**
 * プロジェクト全体で使用する定数定義
 */

// 精算期間に関する定数
var CLOSING_DAY = 15;
var START_DAY = 16;

// カレンダー検索に関する定数
var COMMUTE_KEYWORD = '出社';

// 交通費計算に関する定数
var COMMUTE_UNIT_PRICE = 1000;

// スプレッドシート設定
var SPREADSHEET_ID = '1La-fkJ0eSCmqC7DYaMATyCSXt2gRQUUqvTROH2mkdgM';
var SHEET_NAME = 'シート1';

// Node.js環境でのテスト用
if (typeof module !== 'undefined') {
  module.exports = {
    CLOSING_DAY,
    START_DAY,
    COMMUTE_KEYWORD,
    COMMUTE_UNIT_PRICE,
    SPREADSHEET_ID,
    SHEET_NAME,
  };
}
