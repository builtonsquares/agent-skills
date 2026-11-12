/** Thin wrapper over the Postgres pool. Use $1, $2, ... placeholders and pass values in `params`. */
export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

export declare const db: Db;
