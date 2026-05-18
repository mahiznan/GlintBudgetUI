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
  theme?: string;  // theme ID: "lime" | "forest" | "ocean" | "amber"
}
