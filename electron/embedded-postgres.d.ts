declare module 'embedded-postgres' {
  import type { Client, QueryResult } from 'pg';

  type EmbeddedPostgresOptions = {
    databaseDir: string;
    user?: string;
    password?: string;
    port?: number;
    persistent?: boolean;
  };

  export default class EmbeddedPostgres {
    constructor(options: EmbeddedPostgresOptions);
    initialise(): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    createDatabase(databaseName: string): Promise<void>;
    dropDatabase(databaseName: string): Promise<void>;
    getPgClient(database?: string, host?: string): Client & {
      query(text: string, values?: unknown[]): Promise<QueryResult<Record<string, unknown>>>;
    };
  }
}