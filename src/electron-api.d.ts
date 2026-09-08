export {};

type DatabaseQueryResult = {
  rows: Record<string, unknown>[];
  rowCount: number | null;
};

declare global {
  interface Window {
    electronAPI: {
      database: {
        isReady(): Promise<boolean>;
        query(text: string, values?: unknown[]): Promise<DatabaseQueryResult>;
      };
    };
  }
}