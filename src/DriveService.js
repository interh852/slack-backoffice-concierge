/**
 * Google Drive操作に関するサービス
 */
class DriveService {
  /**
   * パス（スラッシュ区切り）からフォルダを取得または作成する
   * @param {string} path フォルダパス (例: "Root/Folder/SubFolder")
   * @returns {GoogleAppsScript.Drive.Folder} 最終的なフォルダオブジェクト
   */
  getOrCreateFolderFromPath(path) {
    const parts = path.split('/');
    let currentFolder = null;

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
          // ルートに作成（通常はDriveApp.createFolder(part)だが、共有ドライブの場合は権限に注意）
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
