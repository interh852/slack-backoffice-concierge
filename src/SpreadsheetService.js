if (typeof module !== 'undefined') {
  const { TEMPLATE_CELLS, EXPORT_FOLDER_PATH } = require('./Constants');
}

/**
 * スプレッドシート操作に関するサービス
 */
function SpreadsheetService() {}

/**
 * テンプレートをコピーしてデータを流し込む
 */
SpreadsheetService.prototype.exportToTemplate = function (templateId, data) {
  var templateFile = DriveApp.getFileById(templateId);

  // 保存先フォルダの取得（なければ作成）
  var folderPath = typeof EXPORT_FOLDER_PATH !== 'undefined' ? EXPORT_FOLDER_PATH : 'backoffice-concierge/通勤費';
  var folder = this._getOrCreateFolder(folderPath);

  // ファイル名の生成
  var fileName = '通勤費精算_' + data.targetMonth + '_' + data.userName;

  // コピー作成
  var newFile = templateFile.makeCopy(fileName, folder);
  var spreadsheet = SpreadsheetApp.openById(newFile.getId());
  var sheet = spreadsheet.getSheets()[0];

  // データの流し込み
  var cells = typeof TEMPLATE_CELLS !== 'undefined' ? TEMPLATE_CELLS : {};
  if (cells.USER_NAME) sheet.getRange(cells.USER_NAME).setValue(data.userName);
  if (cells.TOTAL_AMOUNT) sheet.getRange(cells.TOTAL_AMOUNT).setValue(data.totalAmount);
  if (cells.DAYS_COUNT) sheet.getRange(cells.DAYS_COUNT).setValue(data.daysCount);
  if (cells.DATE_LIST) sheet.getRange(cells.DATE_LIST).setValue(data.dateList);

  return spreadsheet.getUrl();
};

/**
 * 先月の片道運賃を取得する
 */
SpreadsheetService.prototype.getLastMonthFare = function (targetMonth, userName) {
  console.log('Searching for last month fare. Month: ' + targetMonth + ' User: ' + userName);

  var query = "title contains '通勤費精算_" + targetMonth + "' and title contains '" + userName + "' and trashed = false";
  var files = DriveApp.searchFiles(query);

  if (files.hasNext()) {
    var file = files.next();
    console.log('Opening file: ' + file.getName() + ' ID: ' + file.getId());
    var spreadsheet = SpreadsheetApp.open(file);
    var sheet = spreadsheet.getSheets()[0];

    var cells = typeof TEMPLATE_CELLS !== 'undefined' ? TEMPLATE_CELLS : {};
    var fare = sheet.getRange(cells.ONE_WAY_COST || 'D2').getValue();

    if (fare && typeof fare === 'number') {
      console.log('Fare found: ' + fare);
      return fare;
    }
  }

  console.log('Last month file not found with query: ' + query);
  return null;
};

/**
 * サイト名のマッピング情報を取得する
 * @param {string} spreadsheetId 設定用スプレッドシートID
 * @returns {Object} { id: displayName } のマッピングオブジェクト
 */
SpreadsheetService.prototype.getSiteNameMap = function (spreadsheetId) {
  if (!spreadsheetId) return {};

  try {
    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    var sheet = spreadsheet.getSheetByName('monthly_daily');
    if (!sheet) return {};

    var values = sheet.getDataRange().getValues();
    var map = {};

    // 1行目はヘッダーと想定し、2行目から読み込む
    for (var i = 1; i < values.length; i++) {
      var id = values[i][0]; // A列: nikaho1
      var displayName = values[i][1]; // B列: にかほ1
      if (id && displayName) {
        map[id.toString().trim()] = displayName.toString().trim();
      }
    }

    return map;
  } catch (e) {
    console.error('Failed to get site name map: ' + e.message);
    return {};
  }
};

/**
 * パスからフォルダを取得または作成する
 * @private
 */
SpreadsheetService.prototype._getOrCreateFolder = function (path) {
  var parts = path.split('/');
  var currentFolder = DriveApp.getRootFolder();

  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    if (!part) continue;

    var folders = currentFolder.getFoldersByName(part);
    if (folders.hasNext()) {
      currentFolder = folders.next();
    } else {
      currentFolder = currentFolder.createFolder(part);
    }
  }

  return currentFolder;
};

if (typeof module !== 'undefined') {
  module.exports = { SpreadsheetService };
}
