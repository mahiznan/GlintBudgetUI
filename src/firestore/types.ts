// Mirrors iOS Transaction.CodingKeys. Field names are camelCase here;
// Firestore document uses snake_case for sub_category, date (Timestamp).
export interface Transaction {
  id: string;
  user_id: string;
  category: string;
  subCategory: string;
  date: Date;
  account: string;
  vendor: string;
  payment: string;
  currency: string;
  notes: string;
  amount: number;
  icon: string;
}

// Mirrors iOS BudgetData
export interface BudgetData {
  name: string;
  emoji: string | null;
  type: string;
  parent: string | null;
}

// Mirrors iOS Currency
export interface Currency {
  name: string;
  code: string;
  symbol: string;
}

// Mirrors iOS Preference (document ID = user uid)
export interface Preference {
  id: string;
  accounts: BudgetData[];
  categories: BudgetData[];
  subCategories: BudgetData[];
  vendors: BudgetData[];
  payments: BudgetData[];
  defaultCurrency: Currency;
  bookmarkedCurrencies: string[];
  defaultEntries: Record<string, string> | null;
  theme?: string; // theme ID: "lime" | "forest" | "ocean" | "amber"
  spendingChartType?: 'bar' | 'line';
  layoutWidth?: 'fixed' | 'full';
}

export type PlannerPeriod = 'weekly' | 'monthly' | 'yearly' | 'custom';
export type PlannerChartView = 'bar' | 'radial';
export type CategoryStatus = 'exceeded' | 'near' | 'ok' | 'no-budget' | 'unplanned';

export interface BudgetPlanner {
  id: string;
  user_id: string;
  name: string;
  description: string;
  currency: string;
  active: boolean;
  archived: boolean;
  period: PlannerPeriod;
  customStart?: Date;
  customEnd?: Date;
  repeatable: boolean;
  filterAccounts: string[];
  filterVendors: string[];
  filterPayments: string[];
  categoryBudgets: Array<{ category: string; amount: number }>;
  chartView: PlannerChartView;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryResult {
  category: string;
  planned: number;
  spent: number;
  remaining: number;
  /** 0–100, capped; 0 when planned === 0 */
  pct: number;
  status: CategoryStatus;
}

export interface PlannerAggregation {
  dateRange: { start: Date; end: Date };
  periodLabel: string;
  isCurrentPeriod: boolean;
  summary: {
    totalPlanned: number;
    totalSpent: number;
    totalRemaining: number;
  };
  categoryResults: CategoryResult[];
  unplannedResults: CategoryResult[];
}
