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
var STATE_WAITING_FOR_FARE_CONFIRMATION = 'WAITING_FOR_FARE_CONFIRMATION';

// カードアクションに関する定数
var ACTION_REUSE_FARE_YES = 'reuse_fare_yes';
var ACTION_REUSE_FARE_NO = 'reuse_fare_no';

// 交通費計算に関する定数
var COMMUTE_UNIT_PRICE = 1000;

// 設定用スプレッドシート（モデルやプロンプトの管理用）
var CONFIG_SHEET_NAME = '情報';

// 保存先フォルダのパス
var EXPORT_FOLDER_PATH = 'backoffice-concierge/通勤費';

// テンプレートのセル番地
var TEMPLATE_CELLS = {
  USER_NAME: 'A2',
  PASS_STATUS: 'B2',
  ONE_WAY_COST: 'D2',
  DAYS_COUNT: 'E2',
  TOTAL_AMOUNT: 'F2',
  DATE_LIST: 'G2',
};

/**
 * 設定用スプレッドシートIDを取得する
 * @returns {string} スプレッドシートID
 */
function getSpreadsheetId() {
  if (typeof PropertiesService === 'undefined' || !PropertiesService.getScriptProperties()) {
    return '';
  }
  return PropertiesService.getScriptProperties().getProperty('COMMUTE_EXPENSE_SPREDSHEET') || '';
}

/**
 * テンプレートスプレッドシートIDを取得する
 * @returns {string} テンプレートスプレッドシートID
 */
function getTemplateSpreadsheetId() {
  if (typeof PropertiesService === 'undefined' || !PropertiesService.getScriptProperties()) {
    return '';
  }
  return PropertiesService.getScriptProperties().getProperty('COMMUTE_TEMPLATE_SPREADSHEET') || '';
}

// Node.js環境でのテスト用
if (typeof module !== 'undefined') {
  module.exports = {
    CLOSING_DAY,
    START_DAY,
    COMMUTE_KEYWORD,
    CHAT_KEYWORD,
    STATE_KEY_PREFIX,
    STATE_WAITING_FOR_AMOUNT,
    STATE_WAITING_FOR_FARE_CONFIRMATION,
    ACTION_REUSE_FARE_YES,
    ACTION_REUSE_FARE_NO,
    COMMUTE_UNIT_PRICE,
    CONFIG_SHEET_NAME,
    EXPORT_FOLDER_PATH,
    TEMPLATE_CELLS,
    getSpreadsheetId,
    getTemplateSpreadsheetId,
  };
}
