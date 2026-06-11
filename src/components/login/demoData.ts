export interface CategoryDatum {
  name: string;
  emoji: string;
  amount: number;
}

/** Static showcase data for the analytics slide (mirrors iOS OnboardingDemoData). */
export const LOGIN_CATEGORIES: CategoryDatum[] = [
  { name: 'Groceries', emoji: '🛒', amount: 420 },
  { name: 'Dining', emoji: '🍽', amount: 260 },
  { name: 'Bills', emoji: '💡', amount: 240 },
  { name: 'Transport', emoji: '🚆', amount: 180 },
  { name: 'Shopping', emoji: '🛍', amount: 150 },
];

export const LOGIN_TOTAL = LOGIN_CATEGORIES.reduce((sum, c) => sum + c.amount, 0); // 1250
