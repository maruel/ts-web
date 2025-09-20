// Packages
import { describe, expect, it } from 'vitest';

// Local
import { initializeDatabase } from '../src/database';

describe('db test', () => {
  it('works', async () => {
    const [db, sqlite] = await initializeDatabase('unittest.db');
    try {
      // Assert schema.
      const cols: string[] = [];
      sqlite.prepare('PRAGMA table_info(users)').raw().all().forEach((e: unknown[]) => { cols.push(e[1] as string); });
      expect(cols).toStrictEqual(['id', 'prompt', 'created_at', 'updated_at']);
    } finally {
      sqlite.close();
    }
  });
});
