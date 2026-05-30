import type { Transaction } from '../firestore/types';

export type Period = 'day' | 'week' | 'month' | 'quarter' | 'year';

export function getPeriodRange(period: Period, now = new Date()): { start: Date; end: Date } {
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
      const sunday = new Date(start);
      sunday.setDate(start.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      end.setTime(sunday.getTime() <= todayEnd.getTime() ? sunday.getTime() : todayEnd.getTime());
      break;
    }

    case 'month': {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const today = new Date();
      const isCurrentMonth =
        now.getFullYear() === today.getFullYear() && now.getMonth() === today.getMonth();
      if (isCurrentMonth) {
        end.setFullYear(today.getFullYear(), today.getMonth(), today.getDate());
      } else {
        end.setFullYear(now.getFullYear(), now.getMonth() + 1, 0); // last day of month
      }
      end.setHours(23, 59, 59, 999);
      break;
    }

    case 'quarter': {
      const q = Math.floor(start.getMonth() / 3);
      start.setMonth(q * 3, 1);
      start.setHours(0, 0, 0, 0);
      const today = new Date();
      const currentQ = Math.floor(today.getMonth() / 3);
      const isCurrentQuarter = now.getFullYear() === today.getFullYear() && q === currentQ;
      if (isCurrentQuarter) {
        end.setFullYear(today.getFullYear(), today.getMonth(), today.getDate());
      } else {
        end.setFullYear(now.getFullYear(), q * 3 + 3, 0); // last day of quarter's final month
      }
      end.setHours(23, 59, 59, 999);
      break;
    }

    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
  }

  return { start, end };
}

export function getChartDateRange(period: Period, now = new Date()): { start: Date; end: Date } {
  const start = new Date(now);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  switch (period) {
    case 'day':
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

    case 'month': {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const today = new Date();
      const isCurrentMonth =
        now.getFullYear() === today.getFullYear() && now.getMonth() === today.getMonth();
      if (isCurrentMonth) {
        end.setFullYear(today.getFullYear(), today.getMonth(), today.getDate());
      } else {
        end.setFullYear(now.getFullYear(), now.getMonth() + 1, 0); // last day of month
      }
      end.setHours(23, 59, 59, 999);
      break;
    }

    case 'quarter': {
      const q = Math.floor(start.getMonth() / 3);
      start.setMonth(q * 3, 1);
      start.setHours(0, 0, 0, 0);
      const today = new Date();
      const currentQ = Math.floor(today.getMonth() / 3);
      const isCurrentQuarter = now.getFullYear() === today.getFullYear() && q === currentQ;
      if (isCurrentQuarter) {
        end.setFullYear(today.getFullYear(), today.getMonth(), today.getDate());
      } else {
        end.setFullYear(now.getFullYear(), q * 3 + 3, 0);
      }
      end.setHours(23, 59, 59, 999);
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
export function groupByDay(
  txns: Array<Pick<Transaction, 'date' | 'amount'>>,
): Record<string, number> {
  return txns.reduce<Record<string, number>>((acc, t) => {
    const key = localDateStr(t.date);
    acc[key] = (acc[key] ?? 0) + t.amount;
    return acc;
  }, {});
}

// Groups transactions by YYYY-MM, summing amounts
export function groupByMonth(
  txns: Array<Pick<Transaction, 'date' | 'amount'>>,
): Record<string, number> {
  return txns.reduce<Record<string, number>>((acc, t) => {
    const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
    acc[key] = (acc[key] ?? 0) + t.amount;
    return acc;
  }, {});
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateWithYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

export function dayOffset(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function shiftPeriodDate(period: Period, offset: number, now = new Date()): Date {
  const d = new Date(now);
  switch (period) {
    case 'day':
      d.setDate(d.getDate() + offset);
      break;
    case 'week':
      d.setDate(d.getDate() + offset * 7);
      break;
    case 'month':
      d.setDate(1);
      d.setMonth(d.getMonth() + offset);
      break;
    case 'quarter':
      d.setDate(1);
      d.setMonth(d.getMonth() + offset * 3);
      break;
    case 'year':
      d.setFullYear(d.getFullYear() + offset);
      break;
  }
  return d;
}

export function getPeriodLabel(period: Period, referenceDate: Date): string {
  switch (period) {
    case 'day':
      return referenceDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    case 'week': {
      const monday = getMondayOf(referenceDate);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${fmt(monday)} – ${fmt(sunday)}`;
    }
    case 'month':
      return referenceDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    case 'quarter': {
      const q = Math.floor(referenceDate.getMonth() / 3) + 1;
      return `Q${q} ${referenceDate.getFullYear()}`;
    }
    case 'year':
      return String(referenceDate.getFullYear());
  }
}
