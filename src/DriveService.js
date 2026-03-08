/**
 * Google Drive操作に関するサービス
 */
class DriveService {
  /**
   * パス（スラッシュ区切り）からフォルダを取得する
   * @param {string} path フォルダパス (例: "Folder/SubFolder")
   * @param {GoogleAppsScript.Drive.Folder} [startFolder] 開始フォルダ（省略時はルートから検索）
   * @returns {GoogleAppsScript.Drive.Folder} フォルダオブジェクト
   * @throws {Error} フォルダが見つからない場合
   */
  getFolderFromPath(path, startFolder) {
    const parts = path.split('/');
    let currentFolder = startFolder || null;

    for (const part of parts) {
      if (!part) continue;

      let folderIterator;
      if (!currentFolder) {
        // ルート（共有ドライブやマイドライブ直下）から検索
        folderIterator = DriveApp.getFoldersByName(part);
      } else {
        // 現在のフォルダ内から検索
        folderIterator = currentFolder.getFoldersByName(part);
      }

      if (folderIterator.hasNext()) {
        currentFolder = folderIterator.next();
      } else {
        // 存在しない場合はエラー
        const currentPath = currentFolder ? currentFolder.getName() : 'Root';
        throw new Error(`Folder "${part}" not found in "${currentPath}"`);
      }
    }

    return currentFolder;
  }
}

// Node.js環境でのテスト用
if (typeof module !== 'undefined') {
  module.exports = { DriveService };
}
