/**
 * Schema Inferrer — Auto-detect column types from sample rows.
 * Samples first 100 rows, returns Column definitions with confidence scores.
 */

import type { Column, ColumnType, Row } from '@gridstorm/analytix-core';

const SAMPLE_SIZE = 100;

interface InferredColumn extends Column {
  /** 0-1 confidence in the inferred type */
  typeConfidence: number;
}

// ── Date format patterns ─────────────────────────────────────────────────────

const DATE_PATTERNS: Array<{ regex: RegExp; label: string }> = [
  { regex: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,       label: 'ISO datetime' },
  { regex: /^\d{4}-\d{2}-\d{2}$/,                          label: 'ISO date' },
  { regex: /^\d{2}\/\d{2}\/\d{4}$/,                        label: 'US date' },
  { regex: /^\d{2}\.\d{2}\.\d{4}$/,                        label: 'EU date' },
  { regex: /^\d{4}\/\d{2}\/\d{2}$/,                        label: 'JP date' },
  { regex: /^[A-Za-z]+ \d{1,2},? \d{4}$/,                 label: 'Long date' },
];

// ── Numeric format patterns ──────────────────────────────────────────────────

const CURRENCY_PREFIX = /^[$€£¥₹]/;
const PERCENTAGE_SUFFIX = /\d%$/;

function isDate(v: string): boolean {
  return DATE_PATTERNS.some((p) => p.regex.test(v.trim()));
}

function isNumeric(v: string): boolean {
  const stripped = v.replace(/[$€£¥₹,_%]/g, '').trim();
  return stripped !== '' && !isNaN(Number(stripped));
}

function isBoolean(v: string): boolean {
  return /^(true|false|yes|no|1|0)$/i.test(v.trim());
}

function inferSingleValue(v: string): ColumnType | null {
  if (!v || v === '' || v === 'null' || v === 'NULL' || v === 'N/A') return null;
  if (isBoolean(v))                   return 'boolean';
  if (isDate(v))                       return v.includes('T') ? 'datetime' : 'date';
  if (PERCENTAGE_SUFFIX.test(v))       return 'percentage';
  if (CURRENCY_PREFIX.test(v))         return 'currency';
  if (isNumeric(v)) {
    const n = Number(v.replace(/[$€£¥₹,_%]/g, '').trim());
    return Number.isInteger(n) ? 'integer' : 'float';
  }
  return 'string';
}

export function inferSchema(rows: Row[]): InferredColumn[] {
  if (rows.length === 0) return [];

  const sample = rows.slice(0, SAMPLE_SIZE);
  const keys   = Object.keys(sample[0]);

  return keys.map((key): InferredColumn => {
    const typeCounts = new Map<ColumnType | null, number>();
    let nullCount = 0;

    for (const row of sample) {
      const raw = row[key];
      if (raw === null || raw === undefined) {
        nullCount++;
        continue;
      }

      let inferred: ColumnType | null;
      if (typeof raw === 'boolean')   inferred = 'boolean';
      else if (raw instanceof Date)   inferred = 'datetime';
      else if (typeof raw === 'number') inferred = Number.isInteger(raw) ? 'integer' : 'float';
      else inferred = inferSingleValue(String(raw));

      typeCounts.set(inferred, (typeCounts.get(inferred) ?? 0) + 1);
    }

    // Find the majority type
    let bestType: ColumnType = 'string';
    let bestCount = 0;
    for (const [type, count] of typeCounts) {
      if (type !== null && count > bestCount) {
        bestType = type;
        bestCount = count;
      }
    }

    const nonNull = sample.length - nullCount;
    const confidence = nonNull > 0 ? bestCount / nonNull : 0;

    // Coerce numeric sub-types: prefer 'float' over 'integer' if both exist
    const hasFloat   = (typeCounts.get('float')   ?? 0) > 0;
    const hasInteger = (typeCounts.get('integer')  ?? 0) > 0;
    if (hasFloat && hasInteger) bestType = 'float';

    const displayName = key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const aggregatable = ['number', 'integer', 'float', 'currency', 'percentage'].includes(bestType);
    const dimensional  = ['string', 'boolean', 'date', 'datetime'].includes(bestType);

    return {
      id:            key,
      displayName,
      type:          bestType,
      aggregatable,
      dimensional,
      nullable:      nullCount > 0,
      typeConfidence: confidence,
    };
  });
}

/** Coerce a raw string value to the target ColumnType */
export function coerceValue(raw: unknown, type: ColumnType): unknown {
  if (raw === null || raw === undefined || raw === '' || raw === 'N/A' || raw === 'NULL') return null;

  const s = String(raw).trim();

  switch (type) {
    case 'boolean':
      return /^(true|yes|1)$/i.test(s);

    case 'integer':
      return parseInt(s.replace(/[^0-9-]/g, ''), 10) || null;

    case 'float':
    case 'number':
      return parseFloat(s.replace(/[^0-9.-]/g, '')) || null;

    case 'currency': {
      const n = parseFloat(s.replace(/[$€£¥₹,\s]/g, ''));
      return isNaN(n) ? null : n;
    }

    case 'percentage': {
      const n = parseFloat(s.replace(/%/g, ''));
      return isNaN(n) ? null : n;
    }

    case 'date':
    case 'datetime': {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d.toISOString();
    }

    default:
      return s;
  }
}
