/**
 * Google Drive操作に関するサービス
 */
class DriveService {
  /**
   * パス（スラッシュ区切り）からフォルダを取得または作成する
   * @param {string} path フォルダパス (例: "Folder/SubFolder")
   * @param {GoogleAppsScript.Drive.Folder} [startFolder] 開始フォルダ（省略時はルートから検索）
   * @returns {GoogleAppsScript.Drive.Folder} 最終的なフォルダオブジェクト
   */
  getOrCreateFolderFromPath(path, startFolder) {
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
        // 存在しない場合は作成
        if (!currentFolder) {
          currentFolder = DriveApp.createFolder(part);
        } else {
          currentFolder = currentFolder.createFolder(part);
        }
      }
    }

    return currentFolder;
  }
}

// Node.js環境でのテスト用
if (typeof module !== 'undefined') {
  module.exports = { DriveService };
}
