# @gridstorm/analytix-sql-connector

In-browser SQL engine for [Analytics Studio](https://analytics.tekivex.com) — SELECT, WHERE, GROUP BY, JOIN, and ORDER BY with no server required.

## Install

```bash
npm install @gridstorm/analytix-core @gridstorm/analytix-sql-connector
```

## Quick Start

```ts
import { SqlConnector } from '@gridstorm/analytix-sql-connector';

const sql = new SqlConnector();

sql.register('sales', salesDataset);
sql.register('products', productsDataset);

const result = await sql.query(`
  SELECT p.category, SUM(s.revenue) as total
  FROM sales s
  JOIN products p ON s.product_id = p.id
  WHERE s.year = 2024
  GROUP BY p.category
  ORDER BY total DESC
`);
```

## Supported SQL

- `SELECT` with aliases and expressions
- `WHERE` with AND / OR / NOT
- `GROUP BY` with aggregate functions (SUM, COUNT, AVG, MIN, MAX)
- `JOIN` (inner), `LEFT JOIN`
- `ORDER BY` with ASC / DESC
- `LIMIT` / `OFFSET`
- Subqueries

## Links

- [Live Demo](https://analytics.tekivex.com)
- [GitHub](https://github.com/007krcs/analytics-builder)

## License

MIT © [Tekivex](https://tekivex.com)
