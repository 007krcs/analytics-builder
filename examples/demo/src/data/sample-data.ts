/**
 * Sample sales + HR dataset for the Analytics Builder demo.
 *
 * Contains realistic records across multiple dimensions:
 * - region, country, category, product, salesperson
 * - revenue, units, cost, profit metrics
 * - hire date, department, salary (for HR pivots)
 * - monthly date column for time-series charts
 */

export interface SalesRecord {
  id: number;
  date: string;
  year: number;
  quarter: string;
  month: string;
  region: string;
  country: string;
  category: string;
  product: string;
  salesperson: string;
  channel: string;
  units: number;
  unit_price: number;
  revenue: number;
  cost: number;
  profit: number;
  profit_margin: number;
  customer_satisfaction: number;
  days_to_close: number;
}

export interface EmployeeRecord {
  id: number;
  name: string;
  department: string;
  role: string;
  region: string;
  hire_year: number;
  salary: number;
  bonus: number;
  performance_score: number;
  tenure_years: number;
  is_manager: boolean;
}

const REGIONS = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East'];
const COUNTRIES: Record<string, string[]> = {
  'North America': ['USA', 'Canada', 'Mexico'],
  'Europe': ['UK', 'Germany', 'France', 'Spain', 'Italy'],
  'Asia Pacific': ['Japan', 'Australia', 'Singapore', 'India', 'South Korea'],
  'Latin America': ['Brazil', 'Argentina', 'Chile', 'Colombia'],
  'Middle East': ['UAE', 'Saudi Arabia', 'Israel'],
};
const CATEGORIES = ['Software', 'Hardware', 'Services', 'Support', 'Training'];
const PRODUCTS: Record<string, string[]> = {
  Software: ['Analytics Pro', 'DataSync', 'ReportHub', 'QueryMaster', 'InsightFlow'],
  Hardware: ['Server Pack', 'Workstation Elite', 'NAS Storage', 'GPU Cluster'],
  Services: ['Implementation', 'Migration', 'Custom Dev', 'API Integration'],
  Support: ['Standard Support', 'Premium Support', 'Enterprise SLA'],
  Training: ['Onboarding', 'Admin Cert', 'Developer Cert', 'Power User'],
};
const SALESPERSONS = [
  'Alice Chen', 'Bob Martinez', 'Carol Okafor', 'David Kim', 'Eva Petrov',
  'Frank Nguyen', 'Grace Osei', 'Henry Walsh', 'Iris Tanaka', 'James Obi',
];
const CHANNELS = ['Direct', 'Partner', 'Online', 'Reseller'];
const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'Operations', 'Finance', 'HR', 'Product'];
const ROLES: Record<string, string[]> = {
  Engineering: ['Software Engineer', 'Senior Engineer', 'Staff Engineer', 'Engineering Manager'],
  Sales: ['Account Executive', 'Sales Manager', 'VP Sales', 'Sales Dev Rep'],
  Marketing: ['Marketing Manager', 'Growth Lead', 'Content Strategist'],
  Operations: ['Ops Analyst', 'Operations Manager', 'Program Manager'],
  Finance: ['Finance Analyst', 'Controller', 'CFO'],
  HR: ['HR Generalist', 'Recruiter', 'HR Director'],
  Product: ['Product Manager', 'Senior PM', 'VP Product'],
};

function seed(n: number): number {
  // Simple deterministic pseudo-random based on index
  return Math.abs(Math.sin(n * 9301 + 49297) * 233280) % 1;
}

function pick<T>(arr: T[], n: number): T {
  return arr[Math.floor(seed(n) * arr.length)];
}

/** Generate 1,200 realistic sales records across 3 years */
export function generateSalesData(): SalesRecord[] {
  const records: SalesRecord[] = [];

  for (let i = 0; i < 1200; i++) {
    const year = 2022 + Math.floor(seed(i * 7) * 3); // 2022–2024
    const month = Math.floor(seed(i * 13) * 12) + 1;
    const day = Math.floor(seed(i * 17) * 28) + 1;
    const quarter = `Q${Math.ceil(month / 3)}`;
    const monthStr = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'short' });

    const region = pick(REGIONS, i * 3);
    const country = pick(COUNTRIES[region], i * 5);
    const category = pick(CATEGORIES, i * 7);
    const product = pick(PRODUCTS[category], i * 11);
    const salesperson = pick(SALESPERSONS, i * 13);
    const channel = pick(CHANNELS, i * 17);

    const basePrice = { Software: 4500, Hardware: 8000, Services: 6000, Support: 2000, Training: 1200 }[category] ?? 3000;
    const units = Math.max(1, Math.floor(seed(i * 19) * 20) + 1);
    const unitPrice = Math.round(basePrice * (0.8 + seed(i * 23) * 0.6));
    const revenue = units * unitPrice;
    const costRatio = 0.35 + seed(i * 29) * 0.3;
    const cost = Math.round(revenue * costRatio);
    const profit = revenue - cost;
    const profitMargin = Math.round((profit / revenue) * 1000) / 10;
    const satisfaction = Math.round((3.5 + seed(i * 31) * 1.5) * 10) / 10;
    const daysToClose = Math.floor(seed(i * 37) * 90) + 1;

    records.push({
      id: i + 1,
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      year,
      quarter: `${year} ${quarter}`,
      month: `${year}-${monthStr}`,
      region,
      country,
      category,
      product,
      salesperson,
      channel,
      units,
      unit_price: unitPrice,
      revenue,
      cost,
      profit,
      profit_margin: profitMargin,
      customer_satisfaction: satisfaction,
      days_to_close: daysToClose,
    });
  }

  return records;
}

/** Generate 250 employee records */
export function generateEmployeeData(): EmployeeRecord[] {
  const firstNames = ['Alice', 'Bob', 'Carol', 'David', 'Eva', 'Frank', 'Grace', 'Henry', 'Iris', 'James',
    'Karen', 'Leo', 'Maria', 'Noah', 'Olivia', 'Peter', 'Quinn', 'Rachel', 'Sam', 'Tina'];
  const lastNames = ['Chen', 'Martinez', 'Okafor', 'Kim', 'Petrov', 'Nguyen', 'Osei', 'Walsh', 'Tanaka',
    'Obi', 'Patel', 'Rodriguez', 'Singh', 'Wilson', 'Johnson', 'Lee', 'Brown', 'Davis', 'Taylor', 'Anderson'];

  const records: EmployeeRecord[] = [];

  for (let i = 0; i < 250; i++) {
    const department = pick(DEPARTMENTS, i * 3);
    const roles = ROLES[department] ?? ['Employee'];
    const role = pick(roles, i * 7);
    const region = pick(REGIONS, i * 11);
    const hireYear = 2015 + Math.floor(seed(i * 13) * 10);
    const isManager = role.toLowerCase().includes('manager') || role.toLowerCase().includes('vp') || role.toLowerCase().includes('director');

    const baseSalary: Record<string, number> = {
      Engineering: 120000,
      Sales: 80000,
      Marketing: 85000,
      Operations: 75000,
      Finance: 95000,
      HR: 72000,
      Product: 115000,
    };
    const base = (baseSalary[department] ?? 80000) * (0.8 + seed(i * 17) * 0.8);
    const salary = Math.round(base / 1000) * 1000;
    const bonusPct = (isManager ? 0.15 : 0.08) + seed(i * 19) * 0.1;
    const bonus = Math.round(salary * bonusPct);
    const performance = Math.round((3 + seed(i * 23) * 2) * 10) / 10;
    const tenure = 2024 - hireYear;

    records.push({
      id: i + 1,
      name: `${pick(firstNames, i * 29)} ${pick(lastNames, i * 31)}`,
      department,
      role,
      region,
      hire_year: hireYear,
      salary,
      bonus,
      performance_score: performance,
      tenure_years: tenure,
      is_manager: isManager,
    });
  }

  return records;
}

/** Pre-generated dataset exports */
export const SALES_DATA = generateSalesData();
export const EMPLOYEE_DATA = generateEmployeeData();

/** Summary statistics for use in KPI configs */
export const SALES_STATS = {
  totalRevenue: SALES_DATA.reduce((s, r) => s + r.revenue, 0),
  totalProfit: SALES_DATA.reduce((s, r) => s + r.profit, 0),
  totalUnits: SALES_DATA.reduce((s, r) => s + r.units, 0),
  avgSatisfaction: SALES_DATA.reduce((s, r) => s + r.customer_satisfaction, 0) / SALES_DATA.length,
  avgProfitMargin: SALES_DATA.reduce((s, r) => s + r.profit_margin, 0) / SALES_DATA.length,
  recordCount: SALES_DATA.length,
};
