/**
 * Internal types for pivot-engine computation.
 */

import type { CellValue } from '@gridstorm/analytix-core';

/** A group key is the concatenation of dimension values */
export type GroupKey = string;

/** A bucket of raw values accumulated during grouping */
export interface ValueBucket {
  values: number[];
  count: number;
  rawValues: CellValue[];
}

/** Internal accumulator: groupKey → valueBucket[] (one per value field) */
export type GroupAccumulator = Map<GroupKey, ValueBucket[]>;

/** Delimiter used to compose group keys from dimension values */
export const GROUP_KEY_DELIMITER = '\x00';

/** Compose a group key from dimension values */
export function makeGroupKey(values: CellValue[]): GroupKey {
  return values.map((v) => (v == null ? '__null__' : String(v))).join(GROUP_KEY_DELIMITER);
}

/** Split a group key back into individual dimension values */
export function splitGroupKey(key: GroupKey): string[] {
  return key.split(GROUP_KEY_DELIMITER);
}
