import { describe, expect, it } from 'vitest';
import { detectSegments } from './segment-detector.js';
import type { Dataset } from '@gridstorm/analytix-core';

function mkDataset(): Dataset {
  const rows = [];
  for (let i = 0; i < 300; i++) {
    rows.push({
      category: ['A', 'B', 'C'][i % 3],
      region:   ['East', 'West', 'South'][i % 3],
      tier:     ['Bronze', 'Silver', 'Gold'][i % 3],
      extra1:   ['X', 'Y', 'Z'][i % 3],
      revenue:  100 + i,
      cost:     50 + i / 2,
      margin:   10 + i / 10,
    });
  }
  return {
    id: 't', name: 't', rows,
    columns: [
      { id: 'category', displayName: 'Category', type: 'string',  dimensional: true,  aggregatable: false, nullable: false },
      { id: 'region',   displayName: 'Region',   type: 'string',  dimensional: true,  aggregatable: false, nullable: false },
      { id: 'tier',     displayName: 'Tier',     type: 'string',  dimensional: true,  aggregatable: false, nullable: false },
      { id: 'extra1',   displayName: 'Extra',    type: 'string',  dimensional: true,  aggregatable: false, nullable: false },
      { id: 'revenue',  displayName: 'Revenue',  type: 'number',  dimensional: false, aggregatable: true,  nullable: false },
      { id: 'cost',     displayName: 'Cost',     type: 'number',  dimensional: false, aggregatable: true,  nullable: false },
      { id: 'margin',   displayName: 'Margin',   type: 'number',  dimensional: false, aggregatable: true,  nullable: false },
    ],
  } as Dataset;
}

describe('Segment detector', () => {
  it('uses displayName, never emits the string "undefined" in narrative text', () => {
    const insights = detectSegments(mkDataset());
    expect(insights.length).toBeGreaterThan(0);
    for (const i of insights) {
      expect(i.title).not.toMatch(/undefined/);
      expect(i.description).not.toMatch(/undefined/);
    }
  });

  it('falls back to id when displayName is missing', () => {
    const ds = mkDataset();
    // strip displayNames to simulate a user-built Dataset
    ds.columns.forEach((c) => { (c as { displayName?: string }).displayName = undefined; });
    const insights = detectSegments(ds);
    expect(insights[0].title).toContain('category');
    expect(insights[0].description).not.toMatch(/undefined/);
  });

  it('caps to first 2 dims and 2 nums by default', () => {
    const used = new Set<string>();
    for (const ins of detectSegments(mkDataset())) {
      for (const c of ins.affectedColumns ?? []) used.add(c);
    }
    const dims = [...used].filter((c) => ['category','region','tier','extra1'].includes(c));
    const nums = [...used].filter((c) => ['revenue','cost','margin'].includes(c));
    expect(dims.length).toBeLessThanOrEqual(2);
    expect(nums.length).toBeLessThanOrEqual(2);
  });

  it('respects custom caps and emits warnings via onWarning', () => {
    const warnings: string[] = [];
    detectSegments(mkDataset(), { maxDims: 1, maxNums: 1, onWarning: (m) => warnings.push(m) });
    expect(warnings.some((w) => /dimension/.test(w))).toBe(true);
    expect(warnings.some((w) => /numeric/.test(w))).toBe(true);
  });

  it('does not warn when caps are not exceeded', () => {
    const ds = mkDataset();
    ds.columns = ds.columns.filter((c) => ['category', 'revenue'].includes(c.id));
    const warnings: string[] = [];
    detectSegments(ds, { onWarning: (m) => warnings.push(m) });
    expect(warnings).toHaveLength(0);
  });
});
