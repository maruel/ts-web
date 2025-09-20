// Packages
import type { Config } from 'drizzle-kit';

const dbpath = process.env['DATABASE_PATH'];
console.log(`Using database ${dbpath}`);

export default {
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: dbpath,
  },
} satisfies Config;
