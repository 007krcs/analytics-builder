/**
 * Tekivex AI Support — Knowledge Base
 *
 * Comprehensive Q&A covering every feature, how-to, pricing, troubleshooting,
 * and product comparison. Zero API key required.
 */

export interface KbEntry {
  id: string;
  /** Question variations the user might ask */
  triggers: string[];
  /** Keywords used for scoring */
  keywords: string[];
  /** Category for grouping related answers */
  category: Category;
  /** Short title shown as suggestion chip */
  title: string;
  /** Full answer (supports markdown-lite: **bold**, `code`, \n for newlines) */
  answer: string;
  /** Follow-up suggestion chips */
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

export const KNOWLEDGE_BASE: KbEntry[] = [

  // ─── About Tekivex ────────────────────────────────────────────────────────

  {
    id: 'what-is-tekivex',
    triggers: ['what is tekivex', 'tell me about tekivex', 'what does tekivex do', 'who is tekivex', 'tekivex company', 'about tekivex'],
    keywords: ['tekivex', 'company', 'about', 'product', 'platform'],
    category: 'about',
    title: 'What is Tekivex?',
    answer: `**Tekivex** is a next-generation analytics platform company. Our flagship product **Analytix** lets any team — from data analysts to business users — build powerful pivot tables, 26+ chart types, KPI dashboards, and AI-powered insights without writing a single line of code.\n\nBuilt on our open-source **GridStorm** engine, Analytix is:\n• **Free to use** — core features are completely free\n• **Zero-setup** — runs entirely in your browser, no server required\n• **AI-powered** — anomaly detection and insights with no API key\n• **Enterprise-ready** — handles 1M+ rows with virtual scrolling`,
    followUps: ['What features does Analytix have?', 'How do I get started?', 'Is Analytix free?'],
  },

  {
    id: 'what-is-analytix',
    triggers: ['what is analytix', 'what is the product', 'analytix features', 'what can analytix do'],
    keywords: ['analytix', 'features', 'product', 'capabilities', 'platform'],
    category: 'about',
    title: 'What is Analytix?',
    answer: `**Analytix** by Tekivex is a drag-and-drop analytics builder with:\n\n• **Pivot Tables** — drag fields into rows/columns/values, auto-aggregation, grand totals\n• **26+ Chart Types** — bar, line, area, pie, treemap, heatmap, sankey, funnel, gauge, waterfall, box plot, violin, and more\n• **KPI Dashboard** — real-time metric cards with threshold alerts and period-over-period deltas\n• **SQL Query** — query your data with SQL in the browser (no server needed)\n• **AI Insights** — automatic trend detection, anomaly detection, and smart suggestions\n• **Report Scheduler** — build and schedule PDF/Excel reports\n• **Live Canvas** — drag-and-drop dashboard layout with resizable widgets\n• **Cross-Filter** — click any chart or table cell to filter all other views`,
    followUps: ['How do I create a pivot table?', 'How do I create a chart?', 'How does the SQL connector work?'],
  },

  {
    id: 'is-free',
    triggers: ['is it free', 'cost', 'pricing', 'how much', 'free tier', 'paid', 'subscription', 'price'],
    keywords: ['free', 'cost', 'price', 'pricing', 'paid', 'subscription', 'tier', 'plan'],
    category: 'pricing',
    title: 'Pricing & Free Tier',
    answer: `**Analytix is free to use** — the core platform has no cost:\n\n✅ **Free (forever)**\n• All chart types (26+)\n• Pivot tables\n• KPI dashboard\n• SQL connector\n• AI insights\n• Up to 50,000 rows per dataset\n• Export to CSV\n\n💎 **Pro** (coming soon)\n• Unlimited rows\n• PDF/Excel export\n• Report scheduling\n• Collaboration features\n• Priority support\n\n🏢 **Enterprise** (coming soon)\n• SSO/SAML\n• Custom connectors\n• On-premise deployment\n• SLA support\n• White-labelling\n\nNo credit card required to start.`,
    followUps: ['How do I get started?', 'What is the row limit?', 'How do I export data?'],
  },

  // ─── Getting Started ──────────────────────────────────────────────────────

  {
    id: 'getting-started',
    triggers: ['how do i start', 'get started', 'begin', 'first steps', 'how to use', 'tutorial', 'guide', 'quickstart', 'onboarding'],
    keywords: ['start', 'begin', 'guide', 'tutorial', 'getting started', 'first', 'new user', 'how to use'],
    category: 'getting-started',
    title: 'Getting Started',
    answer: `Getting started with Analytix takes under 60 seconds:\n\n**Step 1 — Load your data**\nClick the **Dataset** dropdown in the toolbar and select a dataset. The demo comes with 1,200 sales records pre-loaded.\n\n**Step 2 — Build a Pivot Table**\nIn the **Pivot Builder** tab, drag fields from the left panel:\n• Drag a dimension (e.g. Region) → **Rows**\n• Drag another dimension (e.g. Category) → **Columns**\n• Drag a measure (e.g. Revenue) → **Values**\n\n**Step 3 — Create a Chart**\nClick the **Charts** tab, select a chart type, choose X Axis and Y Axis fields, then click **Apply**.\n\n**Step 4 — Add KPIs**\nClick the **KPIs** tab to see auto-generated KPI cards from your dataset.\n\n**Step 5 — Query with SQL**\nClick the **SQL Query** tab and run:\n\`SELECT region, SUM(revenue) FROM sales GROUP BY region\``,
    followUps: ['How do I drag and drop fields?', 'How do I create a pivot table?', 'What chart types are available?'],
  },

  {
    id: 'import-data',
    triggers: ['import data', 'upload csv', 'load data', 'add data', 'my own data', 'upload file', 'connect data', 'data source', 'how to load'],
    keywords: ['import', 'upload', 'csv', 'data', 'load', 'file', 'connect', 'source', 'dataset'],
    category: 'data',
    title: 'How to Import Your Data',
    answer: `You can load your own data into Analytix in several ways:\n\n**Option 1 — CSV Import**\nClick the **Import** button in the Pivot Builder toolbar. Select a \`.csv\` file — Analytix auto-detects column types (dimensions vs measures).\n\n**Option 2 — SQL Query**\nUse the **SQL Query** tab to load data:\n\`\`\`sql\n-- Results become a new dataset you can use in charts\nSELECT * FROM your_uploaded_table\n\`\`\`\n\n**Option 3 — API (developer)**\n\`\`\`js\nengine.loadDataset('my-data', 'My Dataset', rows);\n\`\`\`\n\n**Supported formats:** CSV, JSON arrays, TSV\n**Max rows:** 50,000 (free tier) / unlimited (Pro)\n\n💡 Tip: Column names become field names in the field panel automatically.`,
    followUps: ['What file formats are supported?', 'What is the row limit?', 'How do I use the SQL connector?'],
  },

  // ─── Drag and Drop ────────────────────────────────────────────────────────

  {
    id: 'drag-drop',
    triggers: ["drag and drop", "drag drop", "can't drag", "drag fields", "drop zone", "how to drag", "dragging not working", "field panel", "drag field"],
    keywords: ['drag', 'drop', 'field', 'zone', 'rows', 'columns', 'values', 'pivot', 'panel'],
    category: 'drag-drop',
    title: 'How Drag-and-Drop Works',
    answer: `Analytix uses a visual drag-and-drop interface:\n\n**Field Panel (left sidebar)**\nShows all columns in your dataset — split into **Dimensions** (text/category) and **Measures** (numbers).\n\n**How to drag:**\n1. Click and hold any field in the left panel\n2. Drag it to one of the drop zones: **Rows**, **Columns**, or **Values**\n3. Release to drop it\n\n**On touch/mobile:**\nPress and hold a field for ~200ms, then drag it to the zone.\n\n**Remove a field:**\nClick the **✕** on any chip inside a drop zone.\n\n**Change aggregation:**\nClick a value chip in the **Values** zone — a dropdown lets you choose Sum, Average, Count, Min, Max.\n\n**Keyboard (accessible):**\nTab to a field → press **Enter** or **Space** to start drag mode.`,
    followUps: ['Why is drag-and-drop not working?', 'How do I remove a field?', 'How do I change aggregation?'],
  },

  {
    id: 'drag-not-working',
    triggers: ["drag not working", "can't drag", "dragging doesn't work", "drop not working", "field won't move", "drag issue", "stuck", "drag problem"],
    keywords: ['drag', 'not working', 'broken', 'stuck', 'issue', 'problem', 'fix', 'cant drag'],
    category: 'troubleshooting',
    title: "Drag-and-Drop Not Working?",
    answer: `If drag-and-drop isn't working, here are the most common fixes:\n\n**1. Dataset not loaded**\nMake sure a dataset is selected in the toolbar dropdown. The field panel is empty without data.\n\n**2. Touch device**\nOn phones/tablets, press and **hold for 200ms** before dragging — this prevents accidental drags.\n\n**3. Browser zoom**\nReset browser zoom to 100% (Ctrl+0 / Cmd+0). Extreme zoom levels can offset drop targets.\n\n**4. Try refreshing**\nHard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac).\n\n**5. Supported browsers**\nAnalytix works best in Chrome, Edge, Firefox, and Safari 15+. Internet Explorer is not supported.\n\nStill stuck? Contact support at **support@tekivex.com**`,
    followUps: ['How do I load data?', 'What browsers are supported?', 'How do I contact support?'],
  },

  // ─── Pivot Tables ─────────────────────────────────────────────────────────

  {
    id: 'pivot-table',
    triggers: ['pivot table', 'how to create pivot', 'pivot builder', 'rows columns values', 'cross tab', 'cross tabulation', 'pivot config'],
    keywords: ['pivot', 'table', 'rows', 'columns', 'values', 'aggregation', 'cross', 'tabulation'],
    category: 'pivot',
    title: 'How to Create a Pivot Table',
    answer: `Building a pivot table in Analytix:\n\n**1. Open Pivot Builder tab**\nClick **Pivot Table** in the workspace tabs.\n\n**2. Drag fields into zones**\n• **Rows** — categories shown as row labels (e.g. Region)\n• **Columns** — categories split into column groups (e.g. Product Category)\n• **Values** — numbers to aggregate (e.g. Revenue, Units)\n\n**3. Change aggregation**\nClick any chip in the Values zone → choose from:\n\`sum\` \`average\` \`count\` \`min\` \`max\` \`median\`\n\n**4. Show/hide Grand Total**\nToggle the **Show totals** checkbox below the drop zones.\n\n**5. Multiple value fields**\nDrag multiple measures into Values — each gets its own column group.\n\n**Example:** Region (Rows) × Category (Columns) → Revenue Sum gives a 5×5 matrix of totals instantly.`,
    followUps: ['Why are pivot values showing —?', 'How do I change aggregation?', 'Can I add multiple value fields?'],
  },

  {
    id: 'pivot-aggregation',
    triggers: ['change aggregation', 'sum average count', 'how to average', 'aggregation function', 'median pivot', 'min max pivot'],
    keywords: ['aggregation', 'sum', 'average', 'count', 'min', 'max', 'median', 'function', 'change'],
    category: 'pivot',
    title: 'Changing Aggregation Functions',
    answer: `To change how values are aggregated in the pivot table:\n\n1. Look at the **Values** drop zone\n2. Click the chip for the measure you want to change (e.g. "Revenue")\n3. A dropdown appears with options:\n   • **Sum** — adds all values (default for measures)\n   • **Average** — mean of values\n   • **Count** — number of records\n   • **Count Distinct** — unique values only\n   • **Min** — smallest value\n   • **Max** — largest value\n   • **Median** — middle value\n4. Select your aggregation — the table refreshes instantly\n\n💡 You can have multiple value fields with **different** aggregations (e.g. Revenue as Sum + Units as Count).`,
    followUps: ['How do I add multiple value fields?', 'How do I create a pivot table?'],
  },

  {
    id: 'pivot-dashes',
    triggers: ['showing dashes', 'pivot showing —', 'empty values pivot', 'null values', 'missing data pivot', 'values not showing'],
    keywords: ['dash', 'empty', 'null', 'missing', 'values', 'not showing', '—', 'blank'],
    category: 'troubleshooting',
    title: "Pivot Showing '—' Values",
    answer: `If your pivot table shows **—** (dashes) instead of numbers:\n\n**Cause 1: Wrong field in Values**\nMake sure you've dragged a **Measure** (numeric column — shown with blue icon) into Values, not a Dimension.\n\n**Cause 2: No matching data**\nIf a combination of Row + Column has no records, it correctly shows —.\n\n**Cause 3: Multiple value fields mismatch**\nWith 2+ value fields, column keys include an index suffix internally. This is handled automatically in v2.0+.\n\n**Quick fix:**\n1. Remove all fields from all zones\n2. Re-add: one dimension to Rows, one to Columns, one measure to Values\n3. Check it shows numbers — then add more fields\n\nIf still showing dashes, ensure your data is loaded (check the row count in the toolbar).`,
    followUps: ['How do I create a pivot table?', 'How do I load data?'],
  },

  // ─── Charts ───────────────────────────────────────────────────────────────

  {
    id: 'chart-types',
    triggers: ['chart types', 'what charts', 'available charts', 'list charts', 'all chart types', 'which charts', 'chart options'],
    keywords: ['chart', 'types', 'available', 'list', 'all', 'options', 'kinds'],
    category: 'charts',
    title: 'Available Chart Types',
    answer: `Analytix supports **26 chart types** across 6 categories:\n\n📊 **Comparison**\nBar, Horizontal Bar, Waterfall, Gauge, Radar, Polar Area, Combo Chart\n\n📈 **Trend**\nLine, Smooth Line, Area, Stacked Area, Calendar Heatmap\n\n🥧 **Part-of-Whole**\nPie, Donut, Sunburst, Treemap, 100% Stacked Bar\n\n⚡ **Relationship**\nScatter Plot, Bubble Chart, Heatmap\n\n📉 **Distribution**\nHistogram, Box Plot, Violin Plot\n\n🔀 **Flow**\nFunnel Chart, Sankey Diagram\n\nAll chart types require selecting an **X Axis** field and a **Y Axis (Value)** field. Some types like Sankey and Heatmap also require a **Group Field**.`,
    followUps: ['How do I create a chart?', 'How do I use Sankey diagram?', 'What is a heatmap?'],
  },

  {
    id: 'create-chart',
    triggers: ['create chart', 'make chart', 'build chart', 'how to chart', 'add chart', 'chart tutorial', 'new chart'],
    keywords: ['create', 'make', 'build', 'chart', 'how to', 'add', 'new'],
    category: 'charts',
    title: 'How to Create a Chart',
    answer: `Creating a chart in Analytix:\n\n1. **Open the Charts tab** — click **Charts** in the workspace\n2. **Select a chart type** — scroll the left panel and click any chart type (they're grouped by category)\n3. **Set X Axis** — choose a dimension (e.g. Region, Month, Category)\n4. **Set Y Axis** — choose a measure (e.g. Revenue, Units Sold)\n5. **Optional: Group Field** — for Sankey, Heatmap, and Sunburst charts\n6. **Click Apply** — the chart renders in the preview panel\n\n💡 **Tips:**\n• Line and area charts auto-aggregate by X field — select a date field for time-series\n• Smooth Line adds bezier curves for a polished look\n• Combo Chart uses the first series as bars and the rest as lines\n• Waterfall requires a cumulative numeric field (e.g. monthly profit/loss)\n• For zoom/pan on line charts, use the **Brush** slider that appears at the bottom`,
    followUps: ['Why is my chart showing 1,200 bars?', 'How do I use the Sankey diagram?', 'What chart types are available?'],
  },

  {
    id: 'chart-too-many-bars',
    triggers: ['too many bars', 'chart looks messy', 'chart noise', '1200 bars', 'chart not readable', 'chart overcrowded', 'bars too small', 'chart data wrong'],
    keywords: ['too many', 'bars', 'messy', 'noisy', 'overcrowded', '1200', 'readable', 'aggregate'],
    category: 'troubleshooting',
    title: 'Chart Showing Too Many Data Points',
    answer: `If your chart shows hundreds of tiny bars or a noisy spike chart:\n\n**The cause:** You selected a high-cardinality column as X Axis (e.g. a column with unique values per row like "Transaction ID" or "Date with timestamp").\n\n**Fix — Use a category column:**\nChange X Axis to a low-cardinality dimension:\n• ✅ **Region** (5 values) → 5 clean bars\n• ✅ **Category** (5 values) → 5 bars\n• ✅ **Month** (12 values) → 12 bars\n• ❌ **Transaction ID** (1,200 unique) → 1,200 bars\n\n**Fix — For date-based charts:**\nUse a **Month** or **Quarter** column instead of raw date strings.\n\n**Fix — For line/area charts with dates:**\nSelect the **Date** column (YYYY-MM-DD format) as X Axis — Analytix aggregates by date automatically.\n\nThe aggregation happens per unique X value, so choosing the right X field is key.`,
    followUps: ['How do I create a chart?', 'How does the calendar heatmap work?'],
  },

  {
    id: 'sankey-chart',
    triggers: ['sankey', 'sankey diagram', 'flow chart', 'flow diagram', 'how to sankey', 'sankey not working', 'sankey empty'],
    keywords: ['sankey', 'flow', 'diagram', 'source', 'target', 'group field'],
    category: 'charts',
    title: 'Using the Sankey Diagram',
    answer: `The **Sankey Diagram** shows flow between categories. It requires **two fields**:\n\n**Setup:**\n1. Select chart type: **Sankey Diagram**\n2. **X Axis (Source)** — origin categories (e.g. Region)\n3. **Group Field (Target)** — destination categories (e.g. Category)\n4. **Y Axis (Value)** — the flow volume (e.g. Revenue)\n5. Click **Apply**\n\n**Example:** Region → Category → Revenue shows how sales flow from each region into each product category.\n\n⚠️ **Common issue:** If the chart shows a setup message, you haven't selected a Group Field yet. Both source AND target fields are required.\n\n💡 The source and target fields must be different columns — using the same column for both won't produce any links.`,
    followUps: ['What chart types need a Group Field?', 'How do I create a chart?'],
  },

  {
    id: 'heatmap-chart',
    triggers: ['heatmap', 'heat map', 'how to heatmap', 'heatmap empty', 'heatmap one cell', 'matrix chart'],
    keywords: ['heatmap', 'heat', 'map', 'matrix', 'color', 'intensity', 'group field', 'y axis'],
    category: 'charts',
    title: 'Using the Heatmap',
    answer: `The **Heatmap** displays a matrix of values as color intensity. It requires **two category fields**:\n\n**Setup:**\n1. Select chart type: **Heatmap**\n2. **X Axis** — horizontal categories (e.g. Region → columns)\n3. **Group Field** — vertical categories (e.g. Category → rows)\n4. **Y Axis (Value)** — the value determining color intensity (e.g. Revenue)\n5. Click **Apply**\n\n**Color scale:** Low values = blue, high values = red.\n\n⚠️ **Common issue:** If you see only one cell, you haven't selected a Group Field for the Y axis rows. Both X Axis AND Group Field are required.\n\n💡 **Calendar Heatmap** is different — it uses a date field for X Axis and shows a full year calendar grid. Select your "Date" column as X Axis for the calendar view.`,
    followUps: ['How do I use the Calendar Heatmap?', 'What chart types need a Group Field?'],
  },

  {
    id: 'calendar-heatmap',
    triggers: ['calendar heatmap', 'calendar chart', 'calendar view', 'date heatmap', 'daily heatmap', 'github contribution'],
    keywords: ['calendar', 'heatmap', 'date', 'daily', 'weekly', 'month', 'year'],
    category: 'charts',
    title: 'Calendar Heatmap',
    answer: `The **Calendar Heatmap** shows daily values as a GitHub-style contribution chart.\n\n**Setup:**\n1. Select chart type: **Calendar Heatmap**\n2. **X Axis** — select your **date column** (must be YYYY-MM-DD format)\n3. **Y Axis (Value)** — the daily metric (e.g. Revenue, Units)\n4. Click **Apply**\n\nThe chart renders a full calendar grid with darker green = higher values.\n\n⚠️ **Common issue:** If you see only day labels (S,M,T,W,T,F,S) but no colored cells, your X Axis is set to a non-date column (e.g. "Region"). Switch X Axis to your date column.\n\n**Supported date formats:** YYYY-MM-DD, MM/DD/YYYY, ISO 8601\n\n💡 The chart automatically groups multiple records per day by summing them.`,
    followUps: ['How do I create a chart?', 'How does the Heatmap work?'],
  },

  // ─── KPI Dashboard ────────────────────────────────────────────────────────

  {
    id: 'kpi-dashboard',
    triggers: ['kpi', 'kpi dashboard', 'metric cards', 'key performance', 'kpi not showing', 'no kpis configured', 'kpi setup', 'kpi empty'],
    keywords: ['kpi', 'dashboard', 'metric', 'card', 'performance', 'indicator', 'threshold', 'target'],
    category: 'kpi',
    title: 'KPI Dashboard',
    answer: `The **KPI Dashboard** shows metric cards that auto-compute from your dataset.\n\n**When you load a dataset with a sales schema**, Analytix auto-generates 4 KPI cards:\n• **Total Revenue** — sum of revenue column\n• **Total Profit** — sum of profit column\n• **Avg Customer Satisfaction** — average score\n• **Units Sold** — total unit count\n\n**Each card shows:**\n• Current metric value (formatted)\n• Status color: 🟢 Good / 🟡 Warning / 🔴 Critical\n• **↑/↓ Delta** — period-over-period percentage change\n• Sparkline trend\n\n**To configure custom KPIs (developer):**\n\`\`\`js\nengine.addKpiConfig({\n  id: 'my-kpi',\n  title: 'Monthly Revenue',\n  columnId: 'revenue',\n  aggregation: 'sum',\n  threshold: { warning: 50000, critical: 30000 }\n});\n\`\`\``,
    followUps: ['How do I set KPI thresholds?', 'What does the delta arrow mean?', 'How do I export KPI data?'],
  },

  {
    id: 'kpi-thresholds',
    triggers: ['kpi threshold', 'kpi color', 'kpi red yellow green', 'warning threshold', 'critical threshold', 'kpi status', 'kpi alert'],
    keywords: ['threshold', 'warning', 'critical', 'color', 'alert', 'red', 'green', 'yellow', 'status'],
    category: 'kpi',
    title: 'KPI Thresholds & Status Colors',
    answer: `KPI cards use **threshold values** to determine status color:\n\n🟢 **Green (Good)** — value is above the warning threshold\n🟡 **Yellow (Warning)** — value is between critical and warning\n🔴 **Red (Critical)** — value is below the critical threshold\n⚪ **Grey (Neutral)** — no threshold configured\n\n**Configuring thresholds:**\n\`\`\`js\nengine.addKpiConfig({\n  id: 'revenue-kpi',\n  columnId: 'revenue',\n  aggregation: 'sum',\n  threshold: {\n    warning: 800000,    // below this = yellow\n    critical: 600000,   // below this = red\n    target: 1000000,    // your goal\n    comparisonType: 'greater_is_better'\n  }\n});\n\`\`\`\n\nFor metrics where **lower is better** (e.g. error rate, churn):\n\`comparisonType: 'lower_is_better'\`\n\nThresholds auto-scale when Analytix generates them from your dataset (set to 80% and 60% of total).`,
    followUps: ['What is the KPI delta arrow?', 'How do I configure KPIs?'],
  },

  // ─── SQL Connector ────────────────────────────────────────────────────────

  {
    id: 'sql-connector',
    triggers: ['sql', 'sql query', 'sql connector', 'query data', 'write sql', 'database query', 'select from', 'group by', 'sql syntax', 'sql not working'],
    keywords: ['sql', 'query', 'select', 'from', 'where', 'group by', 'order by', 'database', 'connector'],
    category: 'sql',
    title: 'SQL Query Connector',
    answer: `The **SQL Query** tab lets you query your loaded datasets using SQL — entirely in your browser, no server needed.\n\n**Supported SQL syntax:**\n\`\`\`sql\nSELECT region, SUM(revenue) AS total, COUNT(*) AS deals\nFROM sales\nWHERE region = 'Europe' OR revenue > 50000\nGROUP BY region\nORDER BY total DESC\nLIMIT 10\n\`\`\`\n\n**Supported features:**\n• \`SELECT\` with aliases (AS)\n• \`FROM\` your loaded dataset name\n• \`WHERE\` with =, !=, >, <, >=, <=, LIKE\n• \`AND\` / \`OR\` conditions\n• \`GROUP BY\` single or multiple columns\n• \`ORDER BY col ASC/DESC\`\n• \`LIMIT n\`\n• Aggregate functions: \`SUM\`, \`COUNT\`, \`AVG\`, \`MIN\`, \`MAX\`\n• \`COUNT(*)\` for total rows\n\n**Shortcut:** Press **Ctrl+Enter** (Cmd+Enter on Mac) to run the query.`,
    followUps: ['What datasets can I query?', 'How do I use aggregate functions?', 'Can I export SQL results?'],
  },

  {
    id: 'sql-tables',
    triggers: ['sql table name', 'what table name', 'dataset name sql', 'from clause', 'table in sql', 'which table'],
    keywords: ['table', 'name', 'dataset', 'from', 'clause', 'sql'],
    category: 'sql',
    title: 'SQL Table Names',
    answer: `In the SQL connector, **table names match your dataset IDs**:\n\n**Pre-loaded datasets in the demo:**\n• \`sales\` — 1,200 sales records\n• \`employees\` — 250 employee records\n\n**Example queries:**\n\`\`\`sql\n-- Sales by region\nSELECT region, SUM(revenue) as total FROM sales GROUP BY region;\n\n-- Top 5 salespersons\nSELECT salesperson, SUM(revenue) as rev FROM sales GROUP BY salesperson ORDER BY rev DESC LIMIT 5;\n\n-- Employee count by department\nSELECT department, COUNT(*) as headcount FROM employees GROUP BY department;\n\`\`\`\n\n**Custom datasets:** When you import your own data, use the name you assigned it.\n\`\`\`js\nengine.loadDataset('my-orders', 'My Orders', rows);\n// SQL table name is: my-orders (or use the dataset ID)\n\`\`\``,
    followUps: ['How do I write a SQL query?', 'How do I import my own data?'],
  },

  // ─── AI Insights ──────────────────────────────────────────────────────────

  {
    id: 'ai-insights',
    triggers: ['ai insights', 'anomaly detection', 'trend detection', 'auto insights', 'smart suggestions', 'ai analysis', 'machine learning', 'pattern detection'],
    keywords: ['ai', 'insight', 'anomaly', 'trend', 'pattern', 'detection', 'smart', 'automatic', 'analysis', 'machine learning'],
    category: 'ai-insights',
    title: 'AI Insights Engine',
    answer: `The **AI Insights** tab automatically analyzes your dataset without any API key:\n\n🔍 **What it detects:**\n• **Trends** — growing or declining metrics over time\n• **Anomalies** — outliers using Z-score and IQR methods\n• **Correlations** — relationships between numeric columns\n• **Segments** — high-value clusters in your data\n• **Forecasts** — simple linear extrapolation\n\n**Example insights generated:**\n*"Revenue in North America grew 23% over the last 3 quarters"*\n*"5 transactions with revenue > 3 standard deviations above mean detected"*\n*"Strong positive correlation (0.87) between units and revenue"*\n\n**How it works:**\n100% pure TypeScript statistics — no AI API, no data leaves your browser. Uses Z-score anomaly detection, linear regression for trends, and Pearson correlation.\n\n**Smart Suggestions** appear as chips below the insights — click them to auto-configure a chart for the insight.`,
    followUps: ['Is my data sent to any server?', 'How accurate is anomaly detection?', 'How do I use AI insights?'],
  },

  {
    id: 'data-privacy',
    triggers: ['data privacy', 'data security', 'is my data safe', 'data sent to server', 'where is data stored', 'gdpr', 'data protection', 'privacy policy'],
    keywords: ['privacy', 'security', 'data', 'safe', 'server', 'stored', 'gdpr', 'protection', 'browser'],
    category: 'about',
    title: 'Data Privacy & Security',
    answer: `**Your data never leaves your browser** — Analytix is fully client-side:\n\n✅ **No server processing** — all analysis runs in JavaScript in your browser\n✅ **No data uploads** — CSV imports stay in browser memory (sessionStorage)\n✅ **No AI API calls** — insights use pure statistics, no external AI service\n✅ **No tracking** — we don't collect your data or query patterns\n✅ **GDPR-friendly** — nothing is persisted to our servers\n\n**What IS stored locally:**\n• Browser localStorage: saved chart configurations (optional)\n• Browser memory: loaded datasets (cleared on page refresh)\n\n**Enterprise customers** can deploy Analytix on-premise for complete data sovereignty.\n\nFor our full privacy policy: **privacy@tekivex.com**`,
    followUps: ['Is Analytix GDPR compliant?', 'Can I deploy on-premise?', 'How do I contact support?'],
  },

  // ─── Reports ──────────────────────────────────────────────────────────────

  {
    id: 'report-scheduler',
    triggers: ['report', 'schedule report', 'report scheduler', 'report builder', 'pdf report', 'excel export', 'scheduled export', 'automated report'],
    keywords: ['report', 'schedule', 'pdf', 'excel', 'export', 'builder', 'automated', 'cron', 'interval'],
    category: 'reports',
    title: 'Report Scheduler',
    answer: `The **Report Scheduler** tab lets you configure automated report delivery:\n\n**Schedule types:**\n• **Interval** — every N milliseconds (e.g. 3600000 = hourly)\n• **Cron expression** — e.g. \`0 8 * * 1\` (Monday 8am)\n• **One-time** — ISO timestamp for a single delivery\n\n**Output formats:**\n• PDF — full dashboard snapshot\n• Excel (CSV) — tabular data export\n\n**Example — Weekly Monday 8am PDF:**\n\`\`\`js\nconst report = new ReportBuilder('weekly-sales', 'Weekly Sales')\n  .addPivot(pivotConfig)\n  .addChart(chartConfig)\n  .addKpiSummary(kpiConfigs)\n  .schedule({ type: 'cron', cron: '0 8 * * 1', formats: ['pdf', 'excel'] })\n  .build();\n\`\`\`\n\n**Common cron expressions:**\n• \`0 9 * * 1-5\` — weekdays at 9am\n• \`0 0 1 * *\` — first day of each month\n• \`0 8 * * 1\` — every Monday 8am`,
    followUps: ['How do I export to PDF?', 'What cron expressions are valid?', 'How do I use the report builder API?'],
  },

  {
    id: 'export-data',
    triggers: ['export', 'download data', 'export csv', 'export pdf', 'export excel', 'download chart', 'save report'],
    keywords: ['export', 'download', 'csv', 'pdf', 'excel', 'save', 'report', 'output'],
    category: 'export',
    title: 'Exporting Data & Reports',
    answer: `Several export options are available in Analytix:\n\n📊 **Chart Builder toolbar:**\n• **PDF** button — exports current chart as PDF (Pro feature, preview available)\n• **Excel** button — exports underlying data as CSV\n\n📋 **Pivot table:**\nRight-click any cell → Copy → paste into Excel\n\n🗄️ **SQL Query:**\nQuery results can be copied or exported to CSV\n\n📄 **Report Scheduler:**\nConfigure scheduled PDF/Excel exports with the full report builder\n\n**Developer API:**\n\`\`\`js\n// Export pivot data as CSV\nconst csv = engine.exportDataset('sales', 'csv');\n\n// Schedule PDF report\nengine.scheduleReport(reportConfig);\n\`\`\`\n\n💡 Full PDF export with charts and KPIs is available in the **Pro** tier (coming soon).`,
    followUps: ['How do I schedule a report?', 'Is PDF export free?', 'How do I export SQL results?'],
  },

  // ─── Live Canvas ──────────────────────────────────────────────────────────

  {
    id: 'live-canvas',
    triggers: ['live canvas', 'dashboard canvas', 'canvas layout', 'dashboard builder', 'widget', 'drag dashboard', 'layout builder'],
    keywords: ['canvas', 'dashboard', 'layout', 'widget', 'drag', 'resize', 'live'],
    category: 'about',
    title: 'Live Canvas Dashboard',
    answer: `The **Live Canvas** tab is a free-form dashboard builder:\n\n**Features:**\n• Drag widgets anywhere on a grid canvas\n• Resize widgets by dragging corners\n• Add multiple chart types as separate widgets\n• KPI cards + pivot tables + charts on the same canvas\n• Real-time updates when underlying data changes\n\n**Pre-built widgets in the demo:**\n• Revenue by Region (bar chart)\n• Monthly Trend (line chart)\n• KPI summary cards\n\n**Adding widgets (developer API):**\n\`\`\`js\ncanvasEngine.addWidget({\n  id: 'my-chart',\n  type: 'chart',\n  chartConfig: myChartConfig,\n  x: 0, y: 0,\n  width: 6, height: 4\n});\n\`\`\`\n\n💡 The canvas uses a 12-column grid system. Width 12 = full width, Width 6 = half width.`,
    followUps: ['How do I add a widget?', 'How do I resize widgets?', 'How does cross-filtering work?'],
  },

  {
    id: 'cross-filter',
    triggers: ['cross filter', 'crossfilter', 'filter charts', 'click to filter', 'linked charts', 'interactive filter', 'filter by clicking'],
    keywords: ['cross', 'filter', 'crossfilter', 'linked', 'interactive', 'click', 'drill'],
    category: 'about',
    title: 'Cross-Filtering',
    answer: `**Cross-filtering** lets you click any data point to instantly filter all other charts and tables:\n\n**How it works:**\n1. Click a bar in a chart (e.g. "Europe" in a bar chart)\n2. All other charts and the pivot table filter to show only European data\n3. Click the same element again (or click empty space) to clear the filter\n\n**Visual indicator:** The blue **active filters** badge in the Pivot Builder toolbar shows how many cross-filters are active.\n\n**Supported interactions:**\n• Click a pie/donut slice\n• Click a bar/column\n• Click a heatmap cell\n• Click a map region (coming soon)\n\n**Developer setup:**\n\`\`\`jsx\n// Wrap your components in CrossFilterProvider\n<CrossFilterProvider>\n  <MyChart />\n  <MyPivotTable />\n</CrossFilterProvider>\n\`\`\``,
    followUps: ['How do I clear a filter?', 'How do I use the pivot table?'],
  },

  // ─── Integrations ─────────────────────────────────────────────────────────

  {
    id: 'react-integration',
    triggers: ['react', 'react integration', 'use in react', 'react component', 'react hook', 'install react', 'npm install react'],
    keywords: ['react', 'component', 'hook', 'integration', 'install', 'npm', 'package'],
    category: 'integrations',
    title: 'React Integration',
    answer: `Analytix provides a full **React adapter** (\`@gridstorm/analytix-react\`):\n\n**Install:**\n\`\`\`bash\nnpm install @gridstorm/analytix-react @gridstorm/analytix-core\n# or\npnpm add @gridstorm/analytix-react @gridstorm/analytix-core\n\`\`\`\n\n**Basic usage:**\n\`\`\`jsx\nimport { AnalyticsBuilder, useAnalyticsEngine } from '@gridstorm/analytix-react';\n\nfunction App() {\n  const { engine, loadDataset } = useAnalyticsEngine();\n\n  useEffect(() => {\n    loadDataset('sales', 'Sales Data', myRows);\n  }, []);\n\n  return (\n    <AnalyticsBuilder\n      engine={engine}\n      initialDataset={engine.getDataset('sales')}\n    />\n  );\n}\n\`\`\`\n\n**Available hooks:** \`useAnalyticsEngine\`, \`useKpi\`, \`usePivot\`, \`useDataset\`\n\n**Available components:** \`AnalyticsBuilder\`, \`KpiCard\`, \`KpiDashboard\`, \`PivotTable\`, \`ChartBuilder\`, \`SqlEditor\``,
    followUps: ['How do I use Vue adapter?', 'How do I use Svelte adapter?', 'Where is the API documentation?'],
  },

  {
    id: 'vue-integration',
    triggers: ['vue', 'vue integration', 'vue composable', 'vue 3', 'use in vue', 'vue adapter'],
    keywords: ['vue', 'composable', 'vue3', 'integration', 'adapter'],
    category: 'integrations',
    title: 'Vue 3 Integration',
    answer: `Analytix provides a **Vue 3 adapter** (\`@gridstorm/analytix-vue\`) with composables:\n\n**Install:**\n\`\`\`bash\nnpm install @gridstorm/analytix-vue @gridstorm/analytix-core vue\n\`\`\`\n\n**Composables:**\n\`\`\`js\nimport { useAnalyticsEngine, useKpi, usePivot } from '@gridstorm/analytix-vue';\n\nexport default {\n  setup() {\n    const { engine } = useAnalyticsEngine();\n    const kpiResult = useKpi(engine, kpiConfig);\n    const pivotResult = usePivot(engine, pivotConfig);\n    return { engine, kpiResult, pivotResult };\n  }\n};\n\`\`\`\n\n**Note:** The Vue adapter is currently in **beta**. The core engine (\`@gridstorm/analytix-core\`) works framework-agnostic — you can use it with Vue's reactive system directly.\n\nFull Vue component library coming in v2.0.`,
    followUps: ['How do I use the React adapter?', 'How do I use Svelte adapter?'],
  },

  {
    id: 'svelte-integration',
    triggers: ['svelte', 'svelte integration', 'svelte store', 'svelte adapter', 'use in svelte'],
    keywords: ['svelte', 'store', 'integration', 'adapter', 'svelte4', 'svelte5'],
    category: 'integrations',
    title: 'Svelte Integration',
    answer: `Analytix provides a **Svelte adapter** (\`@gridstorm/analytix-svelte\`) with readable stores:\n\n**Install:**\n\`\`\`bash\nnpm install @gridstorm/analytix-svelte @gridstorm/analytix-core svelte\n\`\`\`\n\n**Usage:**\n\`\`\`js\nimport { createKpiStore, createPivotStore } from '@gridstorm/analytix-svelte';\n\nconst kpiStore = createKpiStore(engine, kpiConfig);\nconst pivotStore = createPivotStore(engine, pivotConfig);\n\`\`\`\n\n**In template:**\n\`\`\`svelte\n<script>\n  import { createKpiStore } from '@gridstorm/analytix-svelte';\n  const kpi = createKpiStore(engine, config);\n</script>\n\n{#if $kpi}\n  <p>Value: {$kpi.value}</p>\n{/if}\n\`\`\`\n\nCompatible with **Svelte 4** and **Svelte 5**. Full Svelte component library coming soon.`,
    followUps: ['How do I use the React adapter?', 'How do I use Vue adapter?'],
  },

  // ─── Troubleshooting ──────────────────────────────────────────────────────

  {
    id: 'performance',
    triggers: ['slow', 'performance', 'loading slow', 'lag', 'takes too long', 'how many rows', 'row limit', 'large dataset', 'performance tips'],
    keywords: ['slow', 'performance', 'loading', 'lag', 'rows', 'limit', 'large', 'dataset', 'speed'],
    category: 'troubleshooting',
    title: 'Performance & Row Limits',
    answer: `Analytix is optimized for large datasets using **virtual scrolling** and **batched processing**:\n\n**Recommended row limits:**\n• **Optimal:** < 100,000 rows — instant response\n• **Good:** 100k – 500k rows — < 2s query time\n• **Large:** 500k – 1M rows — ~5s, use pagination\n• **Very large:** > 1M rows — use SQL aggregation first\n\n**Performance tips:**\n1. **Pre-aggregate with SQL** — \`SELECT region, SUM(revenue) FROM sales GROUP BY region\` reduces 1M rows to 5\n2. **Use pagination** — set \`maxRows={1000}\` on PivotTable component\n3. **Avoid high-cardinality X axis** — select Region (5 values) not Transaction ID (1M values)\n4. **Filter first** — add WHERE clauses in SQL to reduce data before charting\n5. **Chrome/Edge recommended** — best V8 performance for large JS workloads\n\n**Free tier:** 50,000 rows per dataset\n**Pro tier:** Unlimited rows`,
    followUps: ['How do I use the SQL connector?', 'How do I import large datasets?'],
  },

  {
    id: 'browser-support',
    triggers: ['browser support', 'supported browsers', 'internet explorer', 'safari', 'firefox', 'chrome', 'mobile browser', 'which browser'],
    keywords: ['browser', 'chrome', 'firefox', 'safari', 'edge', 'internet explorer', 'support', 'compatible'],
    category: 'troubleshooting',
    title: 'Browser Compatibility',
    answer: `**Supported browsers:**\n\n✅ **Chrome** 90+ — Recommended (best performance)\n✅ **Edge** 90+ — Full support\n✅ **Firefox** 88+ — Full support\n✅ **Safari** 15+ — Full support (iOS 15+ for touch drag)\n✅ **Samsung Internet** 14+ — Full support\n\n⚠️ **Limited support:**\n• Safari 13-14 — works but no drag-and-drop\n• Chrome Android — full support including touch\n\n❌ **Not supported:**\n• Internet Explorer (any version)\n• Opera Mini\n• UC Browser\n\n**Mobile browsers:**\n• iOS Safari 15+: Full support with touch drag (200ms hold)\n• Chrome Android: Full support\n• Samsung Internet: Full support\n\nFor the best experience on mobile, use Chrome or Safari in landscape orientation.`,
    followUps: ['How do I use touch drag-and-drop?', 'What are the mobile features?'],
  },

  {
    id: 'contact-support',
    triggers: ['contact support', 'help', 'support email', 'bug report', 'report issue', 'human support', 'talk to person', 'contact us', 'feedback'],
    keywords: ['contact', 'support', 'help', 'email', 'bug', 'report', 'issue', 'human', 'person'],
    category: 'troubleshooting',
    title: 'Contact Support',
    answer: `We're here to help! Reach the Tekivex team:\n\n📧 **Email:** support@tekivex.com\n🐛 **Bug reports:** github.com/007krcs/analytics-builder/issues\n💬 **Community:** community.tekivex.com (coming soon)\n📖 **Documentation:** docs.tekivex.com (coming soon)\n\n**Response times:**\n• Free tier: 3–5 business days\n• Pro tier: Next business day\n• Enterprise: 4-hour SLA\n\n**Before contacting support, try:**\n1. Check this AI assistant for quick answers\n2. Hard refresh: Ctrl+Shift+R / Cmd+Shift+R\n3. Check the browser console for error messages (F12)\n4. Try in an incognito/private window\n\nWhen filing a bug, please include: browser version, steps to reproduce, and any console errors.`,
    followUps: ['How do I report a bug?', 'What is the SLA for enterprise?'],
  },

  // ─── Comparison ───────────────────────────────────────────────────────────

  {
    id: 'vs-tableau',
    triggers: ['vs tableau', 'compared to tableau', 'better than tableau', 'tableau alternative', 'tableau vs analytix', 'replace tableau'],
    keywords: ['tableau', 'compared', 'alternative', 'better', 'vs', 'replace'],
    category: 'comparison',
    title: 'Analytix vs Tableau',
    answer: `**Analytix vs Tableau:**\n\n| Feature | Analytix | Tableau |\n|---|---|---|\n| Price | **Free** | $75/user/month |\n| Setup | **Browser, instant** | Desktop install required |\n| Data privacy | **100% client-side** | Data sent to Tableau servers |\n| Customization | **Full source access** | Limited |\n| Developer API | **Full TypeScript SDK** | REST API only |\n| AI insights | **Built-in, free** | Tableau Ask Data ($$$) |\n| SQL connector | **In-browser** | Requires DB connection |\n| Embedding | **npm package** | Complex licensing |\n\n**When to choose Tableau:** You need enterprise governance, Salesforce integration, or large team collaboration.\n\n**When to choose Analytix:** You want fast setup, developer control, zero data egress, or to embed analytics in your product.`,
    followUps: ['Analytix vs Power BI?', 'Is Analytix open source?', 'What are the enterprise features?'],
  },

  {
    id: 'vs-powerbi',
    triggers: ['vs power bi', 'power bi alternative', 'compared to power bi', 'better than power bi', 'power bi vs'],
    keywords: ['power bi', 'powerbi', 'microsoft', 'compared', 'alternative', 'vs'],
    category: 'comparison',
    title: 'Analytix vs Power BI',
    answer: `**Analytix vs Power BI:**\n\n| Feature | Analytix | Power BI |\n|---|---|---|\n| Price | **Free** | $10/user/month |\n| Setup | **Browser, instant** | Windows app or web |\n| Embedding | **Open npm package** | Complex embed licensing |\n| Dev experience | **TypeScript SDK** | M Language / DAX |\n| Mobile | **Responsive design** | Power BI Mobile app |\n| On-premise | **Yes (enterprise)** | Power BI Report Server |\n| Custom visuals | **Plugin marketplace** | App source |\n| Open source | **Core is open source** | Proprietary |\n\n**When to choose Power BI:** Deep Microsoft ecosystem integration, existing Azure infrastructure, non-technical business users.\n\n**When to choose Analytix:** Developer-first workflow, embedding analytics in your SaaS product, zero vendor lock-in.`,
    followUps: ['Analytix vs Tableau?', 'Is Analytix open source?'],
  },

  {
    id: 'open-source',
    triggers: ['open source', 'github', 'source code', 'license', 'mit license', 'contribute', 'fork', 'open core'],
    keywords: ['open', 'source', 'github', 'license', 'mit', 'contribute', 'fork', 'code'],
    category: 'about',
    title: 'Open Source & Licensing',
    answer: `Analytix uses an **open-core model**:\n\n🔓 **Open Source (MIT License)**\n• \`@gridstorm/analytix-core\` — engine, types, store\n• \`@gridstorm/analytix-chart-engine\` — all 26 chart transformers\n• \`@gridstorm/analytix-pivot-engine\` — pivot computation\n• \`@gridstorm/analytix-react\` — React components\n• \`@gridstorm/analytix-kpi-engine\` — KPI computation\n• \`@gridstorm/analytix-insight-engine\` — AI insights\n\n🔐 **Commercial (enterprise license)**\n• Real-time collaboration (Yjs CRDT)\n• PDF report designer\n• Delta Lake / Parquet connector\n• White-label licensing\n\n**GitHub:** github.com/007krcs/analytics-builder\n\n**Contributing:**\n1. Fork the repository\n2. Create a feature branch\n3. Submit a Pull Request\n\nWe welcome contributions! See CONTRIBUTING.md for guidelines.`,
    followUps: ['How do I contribute?', 'What is the enterprise pricing?', 'Contact support'],
  },

  // ─── API / Developer ──────────────────────────────────────────────────────

  {
    id: 'api-docs',
    triggers: ['api', 'api documentation', 'developer docs', 'sdk', 'typescript api', 'how to use api', 'code example', 'developer guide'],
    keywords: ['api', 'docs', 'documentation', 'sdk', 'typescript', 'developer', 'code', 'example'],
    category: 'integrations',
    title: 'Developer API & SDK',
    answer: `**Analytix TypeScript SDK** — full type-safe API:\n\n**Core engine:**\n\`\`\`ts\nimport { AnalyticsEngine } from '@gridstorm/analytix-core';\n\nconst engine = new AnalyticsEngine();\nengine.loadDataset('sales', 'Sales', rows);\nconst ds = engine.getDataset('sales');\n\`\`\`\n\n**Pivot computation:**\n\`\`\`ts\nimport { computePivot } from '@gridstorm/analytix-pivot-engine';\nconst result = computePivot(dataset, {\n  rowFields: ['region'],\n  columnFields: ['category'],\n  valueFields: [{ columnId: 'revenue', aggregation: 'sum' }]\n});\n\`\`\`\n\n**Chart data:**\n\`\`\`ts\nimport { prepareChartData } from '@gridstorm/analytix-chart-engine';\nconst data = prepareChartData(chartConfig, rows, dataset);\n\`\`\`\n\n**Full documentation:** docs.tekivex.com\n**TypeScript types:** Fully typed, works with strict mode`,
    followUps: ['How do I install Analytix?', 'How do I use with React?', 'Where is the GitHub repo?'],
  },
];

// ─── Category metadata ────────────────────────────────────────────────────────

export const CATEGORY_META: Record<Category, { label: string; icon: string }> = {
  'getting-started': { label: 'Getting Started', icon: '🚀' },
  'pivot':           { label: 'Pivot Tables', icon: '⊞' },
  'charts':          { label: 'Charts', icon: '📊' },
  'kpi':             { label: 'KPI Dashboard', icon: '📈' },
  'sql':             { label: 'SQL Query', icon: '🗄️' },
  'reports':         { label: 'Reports', icon: '📄' },
  'ai-insights':     { label: 'AI Insights', icon: '🤖' },
  'drag-drop':       { label: 'Drag & Drop', icon: '✋' },
  'data':            { label: 'Data & Import', icon: '💾' },
  'export':          { label: 'Export', icon: '⬇️' },
  'integrations':    { label: 'Integrations', icon: '🔌' },
  'pricing':         { label: 'Pricing', icon: '💰' },
  'troubleshooting': { label: 'Troubleshooting', icon: '🔧' },
  'about':           { label: 'About Tekivex', icon: '🏢' },
  'comparison':      { label: 'Comparisons', icon: '⚖️' },
};

/** Suggested starter questions shown in empty chat */
export const STARTER_QUESTIONS = [
  'What is Tekivex?',
  'How do I create a pivot table?',
  'What chart types are available?',
  'How does the SQL connector work?',
  'Is Analytix free?',
  'How do I drag and drop fields?',
  'How does the KPI dashboard work?',
  'How do I import my data?',
];
