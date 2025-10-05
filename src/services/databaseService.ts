import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

export interface FileMetadata {
  id?: number;
  fileId: string;
  fileName: string;
  mimeType?: string;
  fileSize?: number;
  tags: string;
  category: string;
  uploadedAt: string;
  uploader: string;
  chatId: string;
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async openDatabase(): Promise<void> {
    try {
      this.db = await SQLite.openDatabase({
        name: 'TeleVault.db',
        location: 'default',
      });
      await this.createTables();
    } catch (error) {
      console.error('Error opening database:', error);
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) return;

    const createFilesTable = `
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fileId TEXT UNIQUE,
        fileName TEXT,
        mimeType TEXT,
        fileSize INTEGER,
        tags TEXT,
        category TEXT,
        uploadedAt TEXT,
        uploader TEXT,
        chatId TEXT
      );
    `;

    const createGroupsTable = `
      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chatId TEXT UNIQUE,
        name TEXT,
        type TEXT
      );
    `;

    try {
      await this.db.executeSql(createFilesTable);
      await this.db.executeSql(createGroupsTable);
    } catch (error) {
      console.error('Error creating tables:', error);
    }
  }

  async insertFile(metadata: FileMetadata): Promise<void> {
    if (!this.db) return;

    const query = `
      INSERT OR REPLACE INTO files (fileId, fileName, mimeType, fileSize, tags, category, uploadedAt, uploader, chatId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    try {
      await this.db.executeSql(query, [
        metadata.fileId,
        metadata.fileName,
        metadata.mimeType,
        metadata.fileSize,
        metadata.tags,
        metadata.category,
        metadata.uploadedAt,
        metadata.uploader,
        metadata.chatId,
      ]);
    } catch (error) {
      console.error('Error inserting file:', error);
    }
  }

  async getFiles(chatId?: string): Promise<FileMetadata[]> {
    if (!this.db) return [];

    let query = 'SELECT * FROM files';
    let params: any[] = [];

    if (chatId) {
      query += ' WHERE chatId = ?';
      params = [chatId];
    }

    query += ' ORDER BY uploadedAt DESC';

    try {
      const results = await this.db.executeSql(query, params);
      const files: FileMetadata[] = [];
      for (let i = 0; i < results[0].rows.length; i++) {
        files.push(results[0].rows.item(i));
      }
      return files;
    } catch (error) {
      console.error('Error getting files:', error);
      return [];
    }
  }

  async searchFiles(searchTerm: string, chatId?: string): Promise<FileMetadata[]> {
    if (!this.db) return [];

    let query = 'SELECT * FROM files WHERE fileName LIKE ? OR tags LIKE ?';
    let params: any[] = [`%${searchTerm}%`, `%${searchTerm}%`];

    if (chatId) {
      query += ' AND chatId = ?';
      params.push(chatId);
    }

    try {
      const results = await this.db.executeSql(query, params);
      const files: FileMetadata[] = [];
      for (let i = 0; i < results[0].rows.length; i++) {
        files.push(results[0].rows.item(i));
      }
      return files;
    } catch (error) {
      console.error('Error searching files:', error);
      return [];
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.executeSql('DELETE FROM files WHERE fileId = ?', [fileId]);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }

  async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

export default new DatabaseService();