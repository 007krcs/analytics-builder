import { beforeEach, describe, expect, it } from 'vitest';
import { SqlConnector } from './sql-connector.js';

describe('SqlConnector', () => {
  let sql: SqlConnector;

  beforeEach(async () => {
    sql = new SqlConnector();
    await sql.importDataset('o', [
      { id: 1, region: 'A', amt: 100 },
      { id: 2, region: 'B', amt: 200 },
      { id: 3, region: 'A', amt: 300 },
    ]);
  });

  it('SELECT * returns rows with ALL keys (not empty objects)', async () => {
    const r = await sql.query('SELECT * FROM o');
    expect(r).toHaveLength(3);
    expect(r[0]).toMatchObject({ id: 1, region: 'A', amt: 100 });
    expect(Object.keys(r[0]).sort()).toEqual(['amt', 'id', 'region']);
  });

  it('SELECT * with WHERE preserves all keys on matching rows', async () => {
    const r = await sql.query('SELECT * FROM o WHERE amt > 150');
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ region: 'B', amt: 200 });
  });

  it('SELECT explicit columns still works', async () => {
    const r = await sql.query('SELECT id, region FROM o');
    expect(r[0]).toEqual({ id: 1, region: 'A' });
  });

  it('SELECT with SUM/GROUP BY computes aggregates', async () => {
    const r = await sql.query('SELECT region, SUM(amt) AS total FROM o GROUP BY region');
    expect(r).toHaveLength(2);
    const a = r.find((x) => x.region === 'A');
    const b = r.find((x) => x.region === 'B');
    expect(a?.total).toBe(400);
    expect(b?.total).toBe(200);
  });

  it('rejects subqueries explicitly (instead of silently no-op)', async () => {
    await expect(
      sql.query('SELECT * FROM o WHERE amt > (SELECT AVG(amt) FROM o)')
    ).rejects.toThrow(/subquer/i);
  });

  it('rejects JOIN explicitly', async () => {
    await expect(
      sql.query('SELECT * FROM o JOIN x ON o.id = x.id')
    ).rejects.toThrow(/JOIN/);
  });

  it('rejects multiple statements (no SQL injection vector)', async () => {
    await expect(
      sql.query('SELECT * FROM o; DROP TABLE o;')
    ).rejects.toThrow(/multiple statements/i);
  });

  it('ORDER BY DESC + LIMIT', async () => {
    const r = await sql.query('SELECT * FROM o ORDER BY amt DESC LIMIT 2');
    expect(r.map((x) => x.amt)).toEqual([300, 200]);
  });
});
