/**
 * Emit hand-rolled declaration files for @tekivex/ai-support.
 * We skip tsc/tsup dts because the knowledge-base template literals
 * contain inline backticks that confuse esbuild's DTS emitter.
 */
import { writeFileSync, mkdirSync } from 'fs';

const dts = `export interface KbEntry {
  id: string;
  triggers: string[];
  keywords: string[];
  category: Category;
  title: string;
  answer: string;
  followUps?: string[];
}

export type Category =
  | 'getting-started'
  | 'pivot'
  | 'charts'
  | 'kpi'
  | 'sql'
  | 'reports'
  | 'ai-insights'
  | 'drag-drop'
  | 'data'
  | 'export'
  | 'integrations'
  | 'pricing'
  | 'troubleshooting'
  | 'about'
  | 'comparison';

export declare const KNOWLEDGE_BASE: KbEntry[];

export declare function searchKnowledgeBase(
  query: string,
  options?: { maxResults?: number; threshold?: number }
): KbEntry[];

export declare function getByCategory(category: Category): KbEntry[];

export declare function getById(id: string): KbEntry | undefined;
`;

mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.d.ts', dts);
writeFileSync('dist/index.d.cts', dts);
console.log('DTS files written.');
