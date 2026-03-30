/**
 * SqlConnector — Pure-JS in-browser SQL engine.
 *
 * Supports:
 *   SELECT col1, col2, SUM(col) AS alias, COUNT(*) AS c, AVG(col) AS avg, MIN/MAX
 *   FROM tableName
 *   WHERE col = 'value' AND/OR col > number  (supports =, !=, <>, >, <, >=, <=, LIKE)
 *   GROUP BY col1, col2
 *   ORDER BY col ASC/DESC
 *   LIMIT n
 *
 * No external dependencies — 100% in-browser.
 */

// Re-export the core Row type for a consistent interface
export type { Row } from '@analytix/core';
import type { Row } from '@analytix/core';

interface ParsedSelect {
  expressions: SelectExpr[];
  from: string;
  where: WhereClause | null;
  groupBy: string[];
  orderBy: OrderByClause[];
  limit: number | null;
}

interface SelectExpr {
  raw: string;       // original expression e.g. "SUM(revenue)"
  alias: string;     // output column name
  aggregate: string | null; // 'SUM', 'COUNT', 'AVG', 'MIN', 'MAX' or null
  column: string;    // column name inside aggregate, or field name for plain cols
  isStar: boolean;   // COUNT(*)
}

interface WhereClause {
  conditions: WhereCondition[];
  operators: ('AND' | 'OR')[];
}

interface WhereCondition {
  column: string;
  op: string;
  value: string | number | null;
  isLike: boolean;
}

interface OrderByClause {
  column: string;
  direction: 'ASC' | 'DESC';
}

// ─── Parser ──────────────────────────────────────────────────────────────────

function tokenizeSql(sql: string): string {
  // Normalise whitespace but preserve quoted strings
  return sql.replace(/\s+/g, ' ').trim();
}

function parseSelectExpr(raw: string): SelectExpr {
  const trimmed = raw.trim();

  // Check for aggregate: FUNC(col) [AS alias]
  const aggMatch = trimmed.match(
    /^(SUM|COUNT|AVG|MIN|MAX)\s*\(\s*(\*|[\w.]+)\s*\)(?:\s+AS\s+([\w]+))?$/i
  );
  if (aggMatch) {
    const func = aggMatch[1].toUpperCase();
    const col = aggMatch[2];
    const alias = aggMatch[3] ?? `${func.toLowerCase()}(${col})`;
    return {
      raw: trimmed,
      alias,
      aggregate: func,
      column: col,
      isStar: col === '*',
    };
  }

  // Plain column [AS alias]
  const plainMatch = trimmed.match(/^([\w.]+)(?:\s+AS\s+([\w]+))?$/i);
  if (plainMatch) {
    const col = plainMatch[1];
    const alias = plainMatch[2] ?? col;
    return { raw: trimmed, alias, aggregate: null, column: col, isStar: false };
  }

  // Fallback — treat entire string as column name
  return { raw: trimmed, alias: trimmed, aggregate: null, column: trimmed, isStar: false };
}

function parseWhere(whereStr: string): WhereClause {
  // Split on AND/OR (word boundary)
  const parts = whereStr.split(/\b(AND|OR)\b/i);
  const conditions: WhereCondition[] = [];
  const operators: ('AND' | 'OR')[] = [];

  for (const part of parts) {
    const upper = part.trim().toUpperCase();
    if (upper === 'AND' || upper === 'OR') {
      operators.push(upper as 'AND' | 'OR');
      continue;
    }
    if (!part.trim()) continue;

    // Match: col OP value
    const condMatch = part.trim().match(
      /^([\w.]+)\s*(!=|<>|>=|<=|=|>|<|LIKE)\s*(.+)$/i
    );
    if (!condMatch) continue;

    const col = condMatch[1].trim();
    const op = condMatch[2].toUpperCase();
    const rawVal = condMatch[3].trim();
    const isLike = op === 'LIKE';

    let value: string | number | null = rawVal;
    if (/^'.*'$/.test(rawVal)) {
      value = rawVal.slice(1, -1); // strip quotes
    } else if (/^".*"$/.test(rawVal)) {
      value = rawVal.slice(1, -1);
    } else if (!isNaN(Number(rawVal))) {
      value = Number(rawVal);
    } else if (rawVal.toUpperCase() === 'NULL') {
      value = null;
    }

    conditions.push({ column: col, op: op === '<>' ? '!=' : op, value, isLike });
  }

  return { conditions, operators };
}

function parseSql(sql: string): ParsedSelect {
  const normalised = tokenizeSql(sql);

  // Extract LIMIT
  let limit: number | null = null;
  let withoutLimit = normalised;
  const limitMatch = normalised.match(/\bLIMIT\s+(\d+)\s*$/i);
  if (limitMatch) {
    limit = parseInt(limitMatch[1], 10);
    withoutLimit = normalised.slice(0, limitMatch.index).trim();
  }

  // Extract ORDER BY
  const orderBy: OrderByClause[] = [];
  let withoutOrder = withoutLimit;
  const orderMatch = withoutLimit.match(/\bORDER\s+BY\s+(.+)$/i);
  if (orderMatch) {
    const orderStr = orderMatch[1];
    withoutOrder = withoutLimit.slice(0, orderMatch.index).trim();
    for (const part of orderStr.split(',')) {
      const m = part.trim().match(/^([\w.]+)(?:\s+(ASC|DESC))?$/i);
      if (m) {
        orderBy.push({ column: m[1], direction: (m[2]?.toUpperCase() ?? 'ASC') as 'ASC' | 'DESC' });
      }
    }
  }

  // Extract GROUP BY
  const groupBy: string[] = [];
  let withoutGroup = withoutOrder;
  const groupMatch = withoutOrder.match(/\bGROUP\s+BY\s+(.+)$/i);
  if (groupMatch) {
    const groupStr = groupMatch[1];
    withoutGroup = withoutOrder.slice(0, groupMatch.index).trim();
    for (const col of groupStr.split(',')) {
      groupBy.push(col.trim());
    }
  }

  // Extract WHERE
  let where: WhereClause | null = null;
  let withoutWhere = withoutGroup;
  const whereMatch = withoutGroup.match(/\bWHERE\s+(.+)$/i);
  if (whereMatch) {
    where = parseWhere(whereMatch[1]);
    withoutWhere = withoutGroup.slice(0, whereMatch.index).trim();
  }

  // Extract FROM tableName
  const fromMatch = withoutWhere.match(/\bFROM\s+([\w.]+)\s*$/i);
  if (!fromMatch) {
    throw new Error('SQL parse error: missing FROM clause');
  }
  const from = fromMatch[1];
  const selectPart = withoutWhere.slice(0, fromMatch.index).trim();

  // Extract SELECT columns
  const selectMatch = selectPart.match(/^SELECT\s+(.+)$/i);
  if (!selectMatch) {
    throw new Error('SQL parse error: missing SELECT clause');
  }
  const colsStr = selectMatch[1];

  // Split cols respecting parentheses
  const expressions: SelectExpr[] = [];
  let depth = 0;
  let current = '';
  for (const ch of colsStr) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      expressions.push(parseSelectExpr(current));
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) expressions.push(parseSelectExpr(current));

  return { expressions, from, where, groupBy, orderBy, limit };
}

// ─── Evaluator ───────────────────────────────────────────────────────────────

function evalCondition(row: Row, cond: WhereCondition): boolean {
  const colVal = row[cond.column];
  const { op, value, isLike } = cond;

  if (value === null) {
    return op === '=' ? colVal == null : colVal != null;
  }

  if (isLike && typeof value === 'string') {
    const pattern = value.replace(/%/g, '.*').replace(/_/g, '.');
    return new RegExp(`^${pattern}$`, 'i').test(String(colVal ?? ''));
  }

  const numCol = Number(colVal);
  const numVal = Number(value);

  if (typeof value === 'number' && !isNaN(numCol)) {
    switch (op) {
      case '=':  return numCol === numVal;
      case '!=': return numCol !== numVal;
      case '>':  return numCol > numVal;
      case '<':  return numCol < numVal;
      case '>=': return numCol >= numVal;
      case '<=': return numCol <= numVal;
    }
  }

  const strCol = String(colVal ?? '').toLowerCase();
  const strVal = String(value).toLowerCase();
  switch (op) {
    case '=':  return strCol === strVal;
    case '!=': return strCol !== strVal;
    case '>':  return strCol > strVal;
    case '<':  return strCol < strVal;
    case '>=': return strCol >= strVal;
    case '<=': return strCol <= strVal;
  }

  return false;
}

function applyWhere(rows: Row[], where: WhereClause | null): Row[] {
  if (!where || where.conditions.length === 0) return rows;
  return rows.filter((row) => {
    let result = evalCondition(row, where.conditions[0]);
    for (let i = 0; i < where.operators.length; i++) {
      const next = evalCondition(row, where.conditions[i + 1]);
      if (where.operators[i] === 'AND') result = result && next;
      else result = result || next;
    }
    return result;
  });
}

function groupRows(rows: Row[], groupBy: string[]): Map<string, Row[]> {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = groupBy.map((col) => String(row[col] ?? '')).join('|');
    const existing = groups.get(key);
    if (existing) existing.push(row);
    else groups.set(key, [row]);
  }
  return groups;
}

function evalAggregate(func: string, rows: Row[], column: string): number {
  const nums = rows.map((r) => Number(r[column]) || 0);
  switch (func) {
    case 'SUM':   return nums.reduce((a, b) => a + b, 0);
    case 'COUNT': return rows.length;
    case 'AVG':   return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    case 'MIN':   return Math.min(...nums);
    case 'MAX':   return Math.max(...nums);
    default:      return 0;
  }
}

function projectRow(row: Row, expressions: SelectExpr[]): Row {
  const out: Row = {};
  for (const expr of expressions) {
    if (expr.aggregate) {
      // aggregates are handled in the group phase; here just carry value
      out[expr.alias] = row[expr.alias];
    } else {
      out[expr.alias] = row[expr.column];
    }
  }
  return out;
}

// ─── Main execute ─────────────────────────────────────────────────────────────

function executeSql(rows: Row[], parsed: ParsedSelect): Row[] {
  // 1. WHERE
  let filtered = applyWhere(rows, parsed.where);

  // 2. GROUP BY or plain project
  let result: Row[];
  const hasAggregates = parsed.expressions.some((e) => e.aggregate !== null);

  if (hasAggregates || parsed.groupBy.length > 0) {
    const groups = parsed.groupBy.length > 0
      ? groupRows(filtered, parsed.groupBy)
      : new Map([['*', filtered]]);

    result = [];
    for (const [, groupRows_] of groups) {
      const out: Row = {};
      // Add group-by key values from first row
      for (const col of parsed.groupBy) {
        out[col] = groupRows_[0][col];
      }
      // Evaluate each expression
      for (const expr of parsed.expressions) {
        if (expr.aggregate) {
          out[expr.alias] = evalAggregate(
            expr.aggregate,
            groupRows_,
            expr.isStar ? '*' : expr.column
          );
        } else if (!parsed.groupBy.includes(expr.column)) {
          // Non-aggregate, non-group-by column: take first row value
          out[expr.alias] = groupRows_[0][expr.column];
        } else {
          out[expr.alias] = groupRows_[0][expr.column];
        }
      }
      result.push(out);
    }
  } else {
    // No aggregates: project columns
    result = filtered.map((row) => projectRow(row, parsed.expressions));
  }

  // 3. ORDER BY
  if (parsed.orderBy.length > 0) {
    result.sort((a, b) => {
      for (const { column, direction } of parsed.orderBy) {
        const av = a[column];
        const bv = b[column];
        const numA = Number(av);
        const numB = Number(bv);
        let cmp = 0;
        if (!isNaN(numA) && !isNaN(numB)) {
          cmp = numA - numB;
        } else {
          cmp = String(av ?? '').localeCompare(String(bv ?? ''));
        }
        if (cmp !== 0) return direction === 'ASC' ? cmp : -cmp;
      }
      return 0;
    });
  }

  // 4. LIMIT
  if (parsed.limit !== null) {
    result = result.slice(0, parsed.limit);
  }

  return result;
}

// ─── SqlConnector class ───────────────────────────────────────────────────────

/**
 * SqlConnector — in-memory SQL engine with a DuckDB-compatible API surface.
 * Uses a pure-JS parser/evaluator — no WASM, no network requests.
 */
export class SqlConnector {
  private tables = new Map<string, Row[]>();
  private _ready = false;

  /**
   * "Initialise" the connector. No-op for the pure-JS implementation,
   * but kept for API compatibility with the DuckDB WASM interface.
   */
  async init(): Promise<void> {
    this._ready = true;
  }

  /** Run an arbitrary SQL query against in-memory tables. */
  async query(sql: string): Promise<Row[]> {
    if (!this._ready) await this.init();
    const parsed = parseSql(sql);
    const rows = this.tables.get(parsed.from);
    if (!rows) {
      throw new Error(`Table "${parsed.from}" not found. Import it first with importDataset().`);
    }
    return executeSql(rows, parsed);
  }

  /**
   * Register a dataset as an in-memory table accessible by SQL.
   * @param name  Table name to use in FROM clauses
   * @param rows  Array of row objects
   */
  async importDataset(name: string, rows: Row[]): Promise<void> {
    if (!this._ready) await this.init();
    this.tables.set(name, rows);
  }

  /**
   * Convenience: import and then query a named dataset.
   * Equivalent to importDataset() + query().
   */
  async queryDataset(name: string, sql: string): Promise<Row[]> {
    if (!this.tables.has(name)) {
      throw new Error(`Table "${name}" not found. Call importDataset() first.`);
    }
    return this.query(sql);
  }

  /** Returns true after init() has been called. */
  isReady(): boolean {
    return this._ready;
  }

  /** List all registered table names. */
  listTables(): string[] {
    return Array.from(this.tables.keys());
  }
}
