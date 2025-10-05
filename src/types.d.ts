declare module 'react-native-sqlite-storage' {
  export interface SQLiteDatabase {
    executeSql: (sql: string, params?: any[]) => Promise<[any]>;
    close: () => Promise<void>;
  }

  export interface SQLiteOpenDatabaseOptions {
    name: string;
    location: string;
  }

  export function openDatabase(options: SQLiteOpenDatabaseOptions): Promise<SQLiteDatabase>;
  export function enablePromise(enabled: boolean): void;
}