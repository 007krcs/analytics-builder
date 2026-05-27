import { describe, expect, it } from 'vitest';
import { inferSchema, SAMPLE_SIZE } from './schema-inferrer.js';

describe('Schema inferrer', () => {
  it('exports SAMPLE_SIZE = 1000 (README contract)', () => {
    expect(SAMPLE_SIZE).toBe(1000);
  });

  it('classifies a type that flips beyond the OLD 100-row cap but inside the new 1000', () => {
    // First 200 rows numeric, next 600 rows string → still ambiguous within 1000 sample
    const rows = [];
    for (let i = 0; i < 200; i++) rows.push({ col_a: i });
    for (let i = 200; i < 800; i++) rows.push({ col_a: 'STR_' + i });
    const cols = inferSchema(rows);
    const a = cols.find((c) => c.id === 'col_a')!;
    // With sampling 1000, the string majority should win
    expect(a.type).toBe('string');
  });

  it('still infers number for a homogeneous numeric column', () => {
    const rows = Array.from({ length: 500 }, (_, i) => ({ v: i }));
    const cols = inferSchema(rows);
    expect(['number', 'integer', 'float']).toContain(cols[0].type);
  });

  it('infers ISO date columns', () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ d: `2024-01-${String((i % 28) + 1).padStart(2, '0')}` }));
    const cols = inferSchema(rows);
    expect(['date', 'datetime']).toContain(cols[0].type);
  });
});
