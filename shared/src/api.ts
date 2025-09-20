import type { User } from './auth.js';

export interface DBTestApiResponse {
  sqlite_version: string[];
  tables: unknown[];
  user: Pick<User, 'id' | 'name' | 'email'>;
}

