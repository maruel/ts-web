// Packages
import { Hono } from 'hono';

// Local
import { authJSONMiddleware } from './auth.js';
import { sendEmailNotification } from './email.js';
import type { Env } from './schema.js';

// Shared types
import type { DBTestApiResponse, } from 'shared';

export const uploadApp = new Hono<Env>();

uploadApp.get('/db/testing', authJSONMiddleware, async (c) => {
  // Context:
  // https://hono.dev/docs/api/context
  console.log(c.var);
  // https://hono.dev/docs/api/request
  console.log(c.req.method, c.req.url, c.req.header());
  console.log(c.res);

  // Low level Sqlite:
  // https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#class-statement
  // https://sqlite.org/lang_corefunc.html#sqlite_version
  const version = c.var.sqlite.prepare('SELECT sqlite_version() AS version').raw().get() as string[];
  // https://www.sqlite.org/pragma.html#pragma_table_list
  const tables = c.var.sqlite.prepare('PRAGMA table_list').raw().all();

  // Get current user from context
  const user = c.get('user');

  // Send email notification to the user
  try {
    await sendEmailNotification(
      user.email,
      'Database Test Access Notification',
      `Hello ${user.name},\n\nYou have accessed the database testing endpoint at ${new Date().toISOString()}.\n\nThis is an automated notification for security purposes.\n\nBest regards,\nThe Unknown name Team`,
      `<p>Hello ${user.name},</p>
<p>You have accessed the database testing endpoint at ${new Date().toISOString()}.</p>
<p>This is an automated notification for security purposes.</p>
<p>Best regards,<br>The Unknown name Team</p>`
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    c.var.logger.error(`Failed to send email notification: ${errorMessage}`);
  }

  const response: DBTestApiResponse = {
    sqlite_version: version,
    tables: tables,
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  };

  return c.json(response);
});
