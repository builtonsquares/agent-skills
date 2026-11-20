/** Thin wrapper over the Postgres pool. Use $1, $2, ... placeholders and pass values in `params`. */
export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

let pool: Db | undefined;

/** Called once at startup with the real pool. */
export function initDb(impl: Db): void {
  pool = impl;
}

export const db: Db = {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
    if (!pool) {
      return Promise.reject(new Error("db used before initDb()"));
    }
    return pool.query<T>(sql, params);
  },
};
