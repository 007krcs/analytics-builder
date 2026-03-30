/**
 * Plugin Marketplace — Registry of available Analytix plugins.
 *
 * Provides a typed catalog of community and official plugins with
 * search and filter capabilities.
 */

export interface MarketplacePlugin {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  tier: 'free' | 'pro' | 'enterprise';
  category: 'chart' | 'connector' | 'transform' | 'export';
  downloadUrl?: string;
  previewImageUrl?: string;
  tags: string[];
  installs: number;
  rating: number; // 0-5
}

export const MARKETPLACE_PLUGINS: MarketplacePlugin[] = [
  // ── Chart plugins ─────────────────────────────────────────────────────────
  {
    id: 'chart-echarts',
    name: 'ECharts Renderer',
    description: 'Apache ECharts integration with 30+ chart types including sunburst, themeRiver, and parallel coordinates.',
    author: 'Analytix Team',
    version: '1.2.0',
    tier: 'free',
    category: 'chart',
    tags: ['echarts', 'visualization', 'charts', 'sunburst', 'parallel'],
    installs: 12400,
    rating: 4.8,
  },
  {
    id: 'chart-d3-advanced',
    name: 'D3 Advanced Charts',
    description: 'Force-directed graphs, chord diagrams, and network visualizations powered by D3.js v7.',
    author: 'DataViz Labs',
    version: '2.0.1',
    tier: 'pro',
    category: 'chart',
    tags: ['d3', 'network', 'graph', 'chord', 'force-directed'],
    installs: 8750,
    rating: 4.6,
  },
  {
    id: 'chart-mapbox',
    name: 'Mapbox GL Charts',
    description: 'Geospatial visualizations: choropleth maps, heatmaps, point clusters, and route animations.',
    author: 'GeoAnalytics Inc.',
    version: '1.0.4',
    tier: 'pro',
    category: 'chart',
    tags: ['maps', 'geospatial', 'mapbox', 'choropleth', 'heatmap'],
    installs: 6200,
    rating: 4.5,
  },
  {
    id: 'chart-gantt',
    name: 'Gantt & Timeline',
    description: 'Project timeline and Gantt chart renderer with milestone markers, dependencies, and critical path highlighting.',
    author: 'ProjectViz',
    version: '0.9.2',
    tier: 'pro',
    category: 'chart',
    tags: ['gantt', 'timeline', 'project', 'milestones'],
    installs: 4100,
    rating: 4.3,
  },
  {
    id: 'chart-3d-surface',
    name: '3D Surface & Scatter',
    description: 'WebGL-accelerated 3D surface plots, scatter plots, and bar charts using Three.js.',
    author: 'ThreeViz',
    version: '0.7.0',
    tier: 'enterprise',
    category: 'chart',
    tags: ['3d', 'webgl', 'surface', 'scatter', 'threejs'],
    installs: 2800,
    rating: 4.2,
  },
  {
    id: 'chart-sparklines',
    name: 'Sparklines Pro',
    description: 'Inline micro-charts for KPI cards: line sparklines, bar sparklines, win/loss charts, and bullet graphs.',
    author: 'Analytix Team',
    version: '1.5.0',
    tier: 'free',
    category: 'chart',
    tags: ['sparkline', 'kpi', 'micro-chart', 'inline', 'bullet'],
    installs: 18600,
    rating: 4.9,
  },

  // ── Connector plugins ──────────────────────────────────────────────────────
  {
    id: 'connector-postgres',
    name: 'PostgreSQL Connector',
    description: 'Live query against PostgreSQL via REST proxy. Supports parameterized queries, row-level security, and schema introspection.',
    author: 'Analytix Team',
    version: '2.1.0',
    tier: 'pro',
    category: 'connector',
    tags: ['postgresql', 'database', 'sql', 'live-data'],
    installs: 9300,
    rating: 4.7,
  },
  {
    id: 'connector-bigquery',
    name: 'Google BigQuery',
    description: 'Connect to BigQuery datasets. Streaming results with progress, cost estimator, and query history.',
    author: 'CloudData Co.',
    version: '1.3.2',
    tier: 'enterprise',
    category: 'connector',
    tags: ['bigquery', 'google', 'cloud', 'data-warehouse'],
    installs: 5700,
    rating: 4.5,
  },
  {
    id: 'connector-websocket',
    name: 'WebSocket Live Feed',
    description: 'Stream real-time data via WebSocket into any chart or KPI. Supports JSON and NDJSON framing with automatic reconnect.',
    author: 'Analytix Team',
    version: '1.0.0',
    tier: 'free',
    category: 'connector',
    tags: ['websocket', 'real-time', 'streaming', 'live'],
    installs: 7800,
    rating: 4.6,
  },
  {
    id: 'connector-rest-api',
    name: 'REST API Connector',
    description: 'Fetch and auto-parse JSON from any REST endpoint. Supports pagination, auth headers, and incremental refresh.',
    author: 'Analytix Team',
    version: '1.8.0',
    tier: 'free',
    category: 'connector',
    tags: ['rest', 'api', 'json', 'http', 'fetch'],
    installs: 22100,
    rating: 4.8,
  },
  {
    id: 'connector-snowflake',
    name: 'Snowflake Connector',
    description: 'Query Snowflake data warehouses directly. Warehouse scaling controls, query cost preview, and result caching.',
    author: 'DataCloud Partners',
    version: '1.1.0',
    tier: 'enterprise',
    category: 'connector',
    tags: ['snowflake', 'data-warehouse', 'cloud', 'enterprise'],
    installs: 3400,
    rating: 4.4,
  },

  // ── Transform plugins ──────────────────────────────────────────────────────
  {
    id: 'transform-ml-forecast',
    name: 'ML Forecasting',
    description: 'Time-series forecasting using ARIMA, Exponential Smoothing, and Prophet-style algorithms. Confidence intervals included.',
    author: 'MLDataworks',
    version: '0.6.1',
    tier: 'enterprise',
    category: 'transform',
    tags: ['forecasting', 'ml', 'arima', 'time-series', 'prediction'],
    installs: 3100,
    rating: 4.3,
  },
  {
    id: 'transform-nlp-tags',
    name: 'NLP Text Tagger',
    description: 'Classify and tag free-text columns using zero-shot NLP (runs in WASM — no API key needed).',
    author: 'TextAnalytics',
    version: '0.4.0',
    tier: 'pro',
    category: 'transform',
    tags: ['nlp', 'text', 'classification', 'tagging', 'wasm'],
    installs: 2400,
    rating: 4.1,
  },
  {
    id: 'transform-geo-enricher',
    name: 'Geo Enricher',
    description: 'Reverse-geocode lat/lon columns to region/city, calculate haversine distances, and cluster by proximity.',
    author: 'GeoAnalytics Inc.',
    version: '1.2.0',
    tier: 'pro',
    category: 'transform',
    tags: ['geo', 'geocoding', 'distance', 'cluster', 'location'],
    installs: 4800,
    rating: 4.5,
  },

  // ── Export plugins ─────────────────────────────────────────────────────────
  {
    id: 'export-pdf-branded',
    name: 'Branded PDF Export',
    description: 'Export dashboards and pivot tables to PDF with custom branding, headers, footers, and page breaks.',
    author: 'Analytix Team',
    version: '2.0.0',
    tier: 'pro',
    category: 'export',
    tags: ['pdf', 'export', 'branding', 'print'],
    installs: 11200,
    rating: 4.7,
  },
  {
    id: 'export-excel-advanced',
    name: 'Excel Advanced Export',
    description: 'Export to .xlsx with conditional formatting, pivot tables, charts embedded in worksheets, and named ranges.',
    author: 'Analytix Team',
    version: '1.6.0',
    tier: 'pro',
    category: 'export',
    tags: ['excel', 'xlsx', 'export', 'spreadsheet'],
    installs: 14500,
    rating: 4.8,
  },
  {
    id: 'export-email-digest',
    name: 'Email Digest',
    description: 'Schedule automated email reports with embedded charts and KPI summaries via SendGrid, Postmark, or SMTP.',
    author: 'ReportMailer',
    version: '1.0.3',
    tier: 'enterprise',
    category: 'export',
    tags: ['email', 'schedule', 'digest', 'sendgrid', 'smtp'],
    installs: 3600,
    rating: 4.4,
  },
];

/**
 * Search the plugin marketplace by query string and optional category filter.
 *
 * @param query     Free-text search (matches name, description, tags)
 * @param category  Optional category filter
 * @returns         Matching plugins sorted by installs descending
 */
export function searchPlugins(
  query: string,
  category?: string
): MarketplacePlugin[] {
  const q = query.trim().toLowerCase();

  return MARKETPLACE_PLUGINS
    .filter((p) => {
      if (category && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)) ||
        p.author.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => b.installs - a.installs);
}
