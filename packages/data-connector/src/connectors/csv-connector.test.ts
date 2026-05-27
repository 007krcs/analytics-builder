import { describe, expect, it } from 'vitest';
import { parseCsvString, parseCsvRecords } from './csv-connector.js';

describe('CSV connector — RFC 4180 compliance', () => {
  it('parses a basic comma-separated file', () => {
    const ds = parseCsvString('name,age\nalice,30\nbob,42\n', { id: 't', name: 't' });
    expect(ds.rows).toHaveLength(2);
    expect(ds.rows[0]).toMatchObject({ name: 'alice', age: 30 });
    expect(ds.rows[1]).toMatchObject({ name: 'bob', age: 42 });
  });

  it('handles a UTF-8 BOM at start of file', () => {
    const ds = parseCsvString('﻿name,value\nA,1\n', { id: 't', name: 't' });
    expect(ds.columns[0].id).toBe('name');
    expect(ds.rows).toHaveLength(1);
  });

  it('preserves quoted fields containing embedded newlines', () => {
    const ds = parseCsvString('name,bio\n"Bob","line1\nline2"\n', { id: 't', name: 't' });
    expect(ds.rows).toHaveLength(1);
    expect(ds.rows[0].bio).toBe('line1\nline2');
  });

  it('preserves CRLF and quoted CRLF', () => {
    const ds = parseCsvString('name,bio\r\n"Bob","l1\r\nl2"\r\n', { id: 't', name: 't' });
    expect(ds.rows).toHaveLength(1);
    expect(ds.rows[0].bio).toBe('l1\r\nl2');
  });

  it('un-escapes doubled quotes ("") to a single "', () => {
    const ds = parseCsvString('name,quote\nAlice,"She said ""hi"""\n', { id: 't', name: 't' });
    expect(ds.rows[0].quote).toBe('She said "hi"');
  });

  it('handles a quoted multi-newline cell without leaking into following rows', () => {
    const csv = 'name,bio\n"Alice","l1\nl2\nl3"\n"Bob","x"\n';
    const ds = parseCsvString(csv, { id: 't', name: 't' });
    expect(ds.rows).toHaveLength(2);
    expect(ds.rows[0].bio).toBe('l1\nl2\nl3');
    expect(ds.rows[1].bio).toBe('x');
  });

  it('auto-detects tab delimiter', () => {
    const ds = parseCsvString('name\tvalue\nA\t1\nB\t2\n', { id: 't', name: 't' });
    expect(ds.columns).toHaveLength(2);
    expect(ds.rows).toHaveLength(2);
  });

  it('auto-detects semicolon delimiter', () => {
    const ds = parseCsvString('name;value\nA;1\n', { id: 't', name: 't' });
    expect(ds.columns).toHaveLength(2);
  });

  it('parseCsvRecords handles an unterminated final row (no trailing newline)', () => {
    const records = parseCsvRecords('a,b\n1,2', ',');
    expect(records).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('handles an empty CSV gracefully', () => {
    const ds = parseCsvString('', { id: 't', name: 't' });
    expect(ds.rows).toEqual([]);
  });
});
