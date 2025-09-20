// Standard library
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Packages
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { csrf } from 'hono/csrf';
import { languageDetector } from 'hono/language';
import { prettyJSON } from 'hono/pretty-json';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';
// pino-http is a CommonJS module.
import { createRequire } from 'module';
import type { Logger } from 'pino';
const require = createRequire(import.meta.url);
const pinoHttp = require('pino-http');

// Local
import { uploadApp } from './api.js';
import { authApp } from './auth.js';
import { listeningPort } from './config.js';
import { initializeDatabase } from './database.js';
import type { Env } from './schema.js';

const root_resources = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const root_data = '..';
const uploadRoot = path.join(root_data, 'uploads', 'audio');

const app = new Hono<Env>({ strict: true });
// https://hono.dev/docs/middleware/builtin/csrf
app.use(csrf());
// https://hono.dev/docs/middleware/builtin/language
app.use(languageDetector({ supportedLanguages: ['en', 'fr'], fallbackLanguage: 'en' }));
// https://hono.dev/docs/middleware/builtin/pretty-json
app.use(prettyJSON());
// https://hono.dev/docs/middleware/builtin/request-id
app.use('*', requestId());
// https://hono.dev/docs/middleware/builtin/secure-headers
app.use(secureHeaders());

// We'll initialize these in the start function and set them here
let dbInstance: Env['Variables']['db'] | null = null;
let sqliteInstance: Env['Variables']['sqlite'] | null = null;

app.use('*', async (c, next) => {
  (c.env as { incoming: { id: string }; outgoing: unknown }).incoming.id = c.var.requestId;
  await new Promise<void>((resolve) => {
    pinoHttp()((c.env as { incoming: unknown; outgoing: unknown }).incoming, (c.env as { incoming: unknown; outgoing: unknown }).outgoing, () => resolve());
  });
  c.set('logger', (c.env as { incoming: { log: Logger } }).incoming.log);
  await next();
});

app.use('*', async (c, next) => {
  if (dbInstance) {
    c.set('db', dbInstance);
  }
  if (sqliteInstance) {
    c.set('sqlite', sqliteInstance);
  }
  await next();
});


// ---------- routes ----------
// Static content that is served by Caddy in production.
app.get('/', async (c) => {
  c.var.logger.info('Serving frontend index.html');
  const htmlPath = path.join(root_resources, 'public', 'index.html');
  const html = await fs.readFile(htmlPath, 'utf8');
  return c.html(html);
});
app.use('/assets/*', serveStatic({
  root: path.join(root_resources, '..', 'backend', 'public', 'assets'),
  rewriteRequestPath: (path) => path.replace(/^\/assets/, '')
}));
// End of static content.

// Authentication routes
app.route('/auth', authApp);

// API routes
app.route('/api', uploadApp);

const start = async () => {
  const host = process.env['HOST'] || '127.0.0.1';
  const dbpath = process.env['DATABASE_PATH'] || path.join(root_data, 'database', 'wapidou.db');

  await fs.mkdir(uploadRoot, { recursive: true });

  const [db, sqlite] = await initializeDatabase(dbpath);
  // Set the instances for the middleware
  dbInstance = db;
  sqliteInstance = sqlite;

  const server = serve({
    fetch: app.fetch,
    port: listeningPort,
    hostname: host,
  }, (info) => {
    console.log(`Server listening on http://${info.address}:${info.port}`);
  });
  process.on('SIGINT', () => {
    server.close();
    sqlite.close();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    server.close((err) => {
      sqlite.close();
      if (err) {
        console.error(err);
        process.exit(1);
      }
      process.exit(0);
    });
  });
};

start();
