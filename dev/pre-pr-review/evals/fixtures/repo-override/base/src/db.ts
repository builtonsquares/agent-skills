import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export interface Db {
  /** Runs one statement. Use $1, $2, ... placeholders and pass the values in `params`. */
  query<T extends pg.QueryResultRow = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

export const db: Db = {
  async query<T extends pg.QueryResultRow>(sql: string, params: unknown[] = []) {
    const result = await pool.query<T>(sql, params);
    return result.rows;
  },
};
