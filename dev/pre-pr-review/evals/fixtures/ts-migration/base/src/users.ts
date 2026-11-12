import pg from "pg";
import { config } from "./config.js";

const pool = new pg.Pool({ connectionString: config.databaseUrl });

export interface User {
  id: number;
  email: string;
  displayName: string;
}

export interface Credentials {
  id: number;
  passwordHash: string;
}

export async function findUserById(id: number): Promise<User | null> {
  const { rows } = await pool.query<User>(
    'SELECT id, email, display_name AS "displayName" FROM users WHERE id = $1',
    [id],
  );
  return rows[0] ?? null;
}

export async function findCredentialsByEmail(email: string): Promise<Credentials | null> {
  const { rows } = await pool.query<Credentials>(
    'SELECT id, password_hash AS "passwordHash" FROM users WHERE email = $1',
    [email],
  );
  return rows[0] ?? null;
}
