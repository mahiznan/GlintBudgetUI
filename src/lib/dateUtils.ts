import type { Transaction } from '../firestore/types';

export type Period = 'day' | 'week' | 'month' | 'quarter' | 'year';

export function getPeriodRange(
  period: Period,
  now = new Date(),
): { start: Date; end: Date } {
  const start = new Date(now);
  const end = new Date(now);

  // Normalize end to 23:59:59.999
  end.setHours(23, 59, 59, 999);

  switch (period) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      break;

    case 'week': {
      // ISO week: Monday = 1, Sunday = 0
      const day = start.getDay(); // 0 = Sunday
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      break;
    }

    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;

    case 'quarter': {
      const q = Math.floor(start.getMonth() / 3);
      start.setMonth(q * 3, 1);
      start.setHours(0, 0, 0, 0);
      break;
    }

    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
  }

  return { start, end };
}

export function getChartDateRange(
  period: Period,
  now = new Date(),
): { start: Date; end: Date } {
  const start = new Date(now);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  switch (period) {
    case 'day':
      start.setDate(start.getDate() - 14);
      start.setHours(0, 0, 0, 0);
      break;

    case 'week': {
      const day = start.getDay(); // 0 = Sunday
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      const sunday = new Date(start);
      sunday.setDate(start.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return { start, end: sunday };
    }

    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;

    case 'quarter': {
      const q = Math.floor(start.getMonth() / 3);
      start.setMonth(q * 3, 1);
      start.setHours(0, 0, 0, 0);
      break;
    }

    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
}

export function filterByPeriod(
  txns: Transaction[],
  period: Period,
  now = new Date(),
): Transaction[] {
  const { start, end } = getPeriodRange(period, now);
  return txns.filter((t) => t.date >= start && t.date <= end);
}

export function filterToday(txns: Transaction[], now = new Date()): Transaction[] {
  return filterByPeriod(txns, 'day', now);
}

export function formatCurrency(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Groups transactions by YYYY-MM-DD, summing amounts
export function groupByDay(txns: Array<Pick<Transaction, 'date' | 'amount'>>): Record<string, number> {
  return txns.reduce<Record<string, number>>((acc, t) => {
    const key = localDateStr(t.date);
    acc[key] = (acc[key] ?? 0) + t.amount;
    return acc;
  }, {});
}

// Groups transactions by YYYY-MM, summing amounts
export function groupByMonth(txns: Array<Pick<Transaction, 'date' | 'amount'>>): Record<string, number> {
  return txns.reduce<Record<string, number>>((acc, t) => {
    const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
    acc[key] = (acc[key] ?? 0) + t.amount;
    return acc;
  }, {});
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function todayStart(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getMondayOf(d: Date): Date {
  const result = new Date(d);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

export function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isCurrentWeek(monday: Date): boolean {
  return isSameDay(monday, getMondayOf(new Date()));
}

export function formatDayHeading(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function dayOfWeekOffset(d: Date): number {
  return d.getDay() === 0 ? 6 : d.getDay() - 1;
}
