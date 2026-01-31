/**
 * プロジェクト全体で使用する定数定義
 */

// 精算期間に関する定数
var CLOSING_DAY = 15;
var START_DAY = 16;

// カレンダー検索に関する定数
var COMMUTE_KEYWORD = '出社';

// チャットボットに関する定数
var CHAT_KEYWORD = '通勤費';

// 会話状態に関する定数
var STATE_KEY_PREFIX = 'state_';
var STATE_WAITING_FOR_AMOUNT = 'WAITING_FOR_AMOUNT';

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
    CHAT_KEYWORD,
    STATE_KEY_PREFIX,
    STATE_WAITING_FOR_AMOUNT,
    COMMUTE_UNIT_PRICE,
    SPREADSHEET_ID,
    SHEET_NAME,
  };
}
