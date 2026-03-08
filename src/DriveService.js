/**
 * Google Drive操作に関するサービス
 */
class DriveService {
  /**
   * パス（スラッシュ区切り）からフォルダを取得する
   * @param {string} path フォルダパス (例: "Folder/SubFolder")
   * @param {GoogleAppsScript.Drive.Folder} [startFolder] 開始フォルダ（省略時はマイドライブルート）
   * @param {boolean} [createIfMissing=false] フォルダが存在しない場合に作成するかどうか
   * @returns {GoogleAppsScript.Drive.Folder} フォルダオブジェクト
   * @throws {Error} フォルダが見つからない場合 (createIfMissing=false時)
   */
  getFolderFromPath(path, startFolder, createIfMissing = false) {
    const parts = path.split('/');
    // startFolderがなければルートフォルダを明示的に取得し、グローバル検索を回避する
    let currentFolder = startFolder || DriveApp.getRootFolder();

    for (const part of parts) {
      if (!part) continue;

      const folderIterator = currentFolder.getFoldersByName(part);

      if (folderIterator.hasNext()) {
        currentFolder = folderIterator.next();
      } else {
        if (createIfMissing) {
          // 存在しない場合は作成
          currentFolder = currentFolder.createFolder(part);
        } else {
          const currentPath = currentFolder.getName ? currentFolder.getName() : 'Root';
          throw new Error(`Folder "${part}" not found in "${currentPath}"`);
        }
      }
    }

    return currentFolder;
  }

  /**
   * getFolderFromPath のエイリアス（後方互換性のため）
   * @deprecated getFolderFromPath を使用してください
   */
  getOrCreateFolderFromPath(path, startFolder) {
    return this.getFolderFromPath(path, startFolder, true);
  }
}

// Node.js環境でのテスト用
if (typeof module !== 'undefined') {
  module.exports = { DriveService };
}
