// Standard library
import fs from 'fs';
import path from 'path';

// Packages
// See https://github.com/WiseLibs/better-sqlite3/issues/887#issuecomment-2587155409
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

// Local
import { users } from './schema.js';

// Create the database connection.
// Doc:
// - https://orm.drizzle.team/docs/get-started-sqlite
// - https://orm.drizzle.team/docs/rqb
export const initializeDatabase = async (dbpath: string) => {
  // Create the directory if it doesn't exist.
  if (!fs.existsSync(path.dirname(dbpath))) {
    fs.mkdirSync(path.dirname(dbpath), { recursive: true });
  }
  const client = new Database(path.join(process.cwd(), dbpath));
  // https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/performance.md
  // https://www.sqlite.org/wal.html
  client.pragma('journal_mode = WAL');
  client.pragma('synchronous = FULL');
  // https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#class-statement
  // https://sqlite.org/lang_corefunc.html#sqlite_version
  const version = client.prepare('SELECT sqlite_version() AS version').raw().get();
  console.log(`Sqlite: ${version}`);

  // High level client.
  const db = drizzle({
    client: client,
    schema: { users },
  });

  // Always run migrations?
  migrate(db, { migrationsFolder: './drizzle' });
  return [db, client] as const;
};
