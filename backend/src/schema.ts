// Packages
import type { Database } from 'better-sqlite3';
import { sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { Logger } from 'pino';

const timestamps = {
  created_at: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`current_timestamp`),
  updated_at: integer('updated_at', { mode: 'timestamp_ms' }).$onUpdate(() => new Date()),
};

// Docs:
// - https://orm.drizzle.team/docs/column-types/sqlite
// - https://orm.drizzle.team/docs/schemas
// - https://orm.drizzle.team/docs/sql-schema-declaration

// Users table for Google OAuth
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  google_id: text('google_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  given_name: text('given_name'),
  family_name: text('family_name'),
  picture: text('picture'),
  locale: text('locale'),
  verified_email: integer('verified_email', { mode: 'boolean' }).notNull(),
  access_token: text('access_token').notNull(),
  refresh_token: text('refresh_token'),
  expires_at: integer('expires_at', { mode: 'timestamp_ms' }),
  ...timestamps
});

// The environment is based on the schemas.
export type Env = {
  Variables: {
    db: BetterSQLite3Database<{ users: typeof users }>;
    logger: Logger;
    sqlite: Database;
    user: typeof users.$inferSelect;
  };
};
