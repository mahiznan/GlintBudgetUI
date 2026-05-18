import { describe, expect, it } from 'vitest';
import {
  getPeriodRange,
  formatCurrency,
  groupByDay,
  groupByMonth,
  getMondayOf,
  getWeekDays,
  isSameDay,
  isCurrentWeek,
  formatDayHeading,
  dayOfWeekOffset,
} from './dateUtils';

describe('getPeriodRange', () => {
  const base = new Date('2026-05-17T12:00:00');

  it('day: start = 00:00, end = 23:59:59.999 of today', () => {
    const { start, end } = getPeriodRange('day', base);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
  });

  it('week: start = Monday of current week', () => {
    const { start } = getPeriodRange('week', base);
    // 2026-05-17 is a Sunday; Monday = 2026-05-11
    expect(start.getDate()).toBe(11);
    expect(start.getMonth()).toBe(4); // May = 4
  });

  it('month: start = first of current month', () => {
    const { start } = getPeriodRange('month', base);
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(4);
    expect(start.getFullYear()).toBe(2026);
  });

  it('quarter: start = first of current quarter', () => {
    const { start } = getPeriodRange('quarter', base);
    // May is Q2 → starts April 1
    expect(start.getMonth()).toBe(3); // April
    expect(start.getDate()).toBe(1);
  });

  it('year: start = Jan 1 of current year', () => {
    const { start } = getPeriodRange('year', base);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
    expect(start.getFullYear()).toBe(2026);
  });
});

describe('formatCurrency', () => {
  it('formats with symbol and 2 decimal places', () => {
    expect(formatCurrency(1234.5, '₹')).toBe('₹1,234.50');
  });
  it('handles zero', () => {
    expect(formatCurrency(0, '$')).toBe('$0.00');
  });
});

describe('groupByDay', () => {
  it('returns counts keyed by YYYY-MM-DD', () => {
    const txns = [
      { date: new Date('2026-05-17'), amount: 100 },
      { date: new Date('2026-05-17'), amount: 200 },
      { date: new Date('2026-05-16'), amount: 50 },
    ];
    const result = groupByDay(txns);
    expect(result['2026-05-17']).toBe(300);
    expect(result['2026-05-16']).toBe(50);
  });
});

describe('groupByMonth', () => {
  it('returns totals keyed by YYYY-MM', () => {
    const txns = [
      { date: new Date('2026-05-17'), amount: 100 },
      { date: new Date('2026-04-10'), amount: 200 },
    ];
    const result = groupByMonth(txns);
    expect(result['2026-05']).toBe(100);
    expect(result['2026-04']).toBe(200);
  });
});

describe('getMondayOf', () => {
  it('returns Monday when given a Wednesday', () => {
    const wed = new Date(2026, 4, 20); // May 20, 2026 is a Wednesday
    const monday = getMondayOf(wed);
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(18);
  });

  it('returns the previous Monday when given a Sunday', () => {
    const sun = new Date(2026, 4, 24); // May 24, 2026 is a Sunday
    const monday = getMondayOf(sun);
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(18);
  });

  it('returns the same day when given a Monday', () => {
    const mon = new Date(2026, 4, 18); // May 18, 2026 is a Monday
    const monday = getMondayOf(mon);
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(18);
  });

  it('normalises time to midnight', () => {
    const d = new Date(2026, 4, 20, 15, 30, 0);
    const monday = getMondayOf(d);
    expect(monday.getHours()).toBe(0);
    expect(monday.getMinutes()).toBe(0);
  });
});

describe('getWeekDays', () => {
  it('returns 7 dates starting from the given Monday', () => {
    const monday = new Date(2026, 4, 18);
    const days = getWeekDays(monday);
    expect(days).toHaveLength(7);
    expect(days[0]!.getDate()).toBe(18);
    expect(days[6]!.getDate()).toBe(24);
  });

  it('returns dates in ascending order', () => {
    const monday = new Date(2026, 4, 18);
    const days = getWeekDays(monday);
    for (let i = 1; i < 7; i++) {
      expect(days[i]!.getTime()).toBeGreaterThan(days[i - 1]!.getTime());
    }
  });
});

describe('isSameDay', () => {
  it('returns true for same date at different times', () => {
    const a = new Date(2026, 4, 18, 9, 0);
    const b = new Date(2026, 4, 18, 22, 0);
    expect(isSameDay(a, b)).toBe(true);
  });

  it('returns false for consecutive dates', () => {
    const a = new Date(2026, 4, 18);
    const b = new Date(2026, 4, 19);
    expect(isSameDay(a, b)).toBe(false);
  });
});

describe('isCurrentWeek', () => {
  it("returns true for this week's Monday", () => {
    expect(isCurrentWeek(getMondayOf(new Date()))).toBe(true);
  });

  it("returns false for last week's Monday", () => {
    const lastMonday = getMondayOf(new Date());
    lastMonday.setDate(lastMonday.getDate() - 7);
    expect(isCurrentWeek(lastMonday)).toBe(false);
  });
});

describe('formatDayHeading', () => {
  it('includes weekday, day number, and month', () => {
    const d = new Date(2026, 4, 18); // Monday May 18
    const result = formatDayHeading(d);
    expect(result).toMatch(/Monday/);
    expect(result).toMatch(/18/);
    expect(result).toMatch(/May/);
  });
});

describe('dayOfWeekOffset', () => {
  it('returns 0 for Monday (getDay=1)', () => {
    const mon = new Date(2026, 4, 18); // Monday
    expect(dayOfWeekOffset(mon)).toBe(0);
  });

  it('returns 6 for Sunday (getDay=0)', () => {
    const sun = new Date(2026, 4, 24); // Sunday
    expect(dayOfWeekOffset(sun)).toBe(6);
  });

  it('returns 4 for Friday (getDay=5)', () => {
    const fri = new Date(2026, 4, 22); // Friday
    expect(dayOfWeekOffset(fri)).toBe(4);
  });
});
