import { describe, expect, it } from 'vitest';
import {
  getPeriodRange,
  getChartDateRange,
  formatCurrency,
  groupByDay,
  groupByMonth,
  getMondayOf,
  getWeekDays,
  isSameDay,
  isCurrentWeek,
  formatDayHeading,
  dayOfWeekOffset,
  shiftPeriodDate,
  getPeriodLabel,
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

  it('week (past): end = Sunday of that week', () => {
    // 2026-05-17 is Sunday; its week Mon=May11–Sun=May17; May17 < today so end = Sunday May 17
    const { end } = getPeriodRange('week', base);
    expect(end.getDate()).toBe(17); // Sunday May 17
    expect(end.getMonth()).toBe(4);
    expect(end.getHours()).toBe(23);
  });

  it('week (current): end = today not future Sunday', () => {
    const today = new Date();
    const { end } = getPeriodRange('week', today);
    expect(end.getDate()).toBe(today.getDate());
    expect(end.getHours()).toBe(23);
  });

  it('month (past): end = last day of that month', () => {
    const pastMonth = new Date(2026, 2, 15); // March 15, 2026
    const { end } = getPeriodRange('month', pastMonth);
    expect(end.getDate()).toBe(31); // March has 31 days
    expect(end.getMonth()).toBe(2);
    expect(end.getHours()).toBe(23);
  });

  it('month (current): end = today', () => {
    const today = new Date();
    const { end } = getPeriodRange('month', today);
    expect(end.getDate()).toBe(today.getDate());
    expect(end.getMonth()).toBe(today.getMonth());
    expect(end.getHours()).toBe(23);
  });

  it('quarter (past): end = last day of that quarter', () => {
    const pastQ = new Date(2026, 1, 15); // Feb 15, 2026 → Q1; ends March 31
    const { end } = getPeriodRange('quarter', pastQ);
    expect(end.getMonth()).toBe(2); // March
    expect(end.getDate()).toBe(31);
    expect(end.getHours()).toBe(23);
  });

  it('quarter (current): end = today', () => {
    const today = new Date();
    const { end } = getPeriodRange('quarter', today);
    expect(end.getDate()).toBe(today.getDate());
    expect(end.getMonth()).toBe(today.getMonth());
    expect(end.getHours()).toBe(23);
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

describe('getChartDateRange', () => {
  const base = new Date('2026-05-19T12:00:00'); // Tuesday

  it('day: start and end are both the reference date (single day)', () => {
    const { start, end } = getChartDateRange('day', base);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(4); // May
    expect(start.getDate()).toBe(19);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(end.getDate()).toBe(19);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  it('day: produces exactly 1 day-key when bucketed', () => {
    const { start, end } = getChartDateRange('day', base);
    const days: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().slice(0, 10));
    }
    expect(days).toHaveLength(1);
  });

  it('week: start = Monday of current week, end = Sunday', () => {
    // 2026-05-19 is Tuesday → Monday = May 18
    const { start, end } = getChartDateRange('week', base);
    expect(start.getDate()).toBe(18); // Monday May 18
    expect(start.getDay()).toBe(1);   // 1 = Monday
    expect(end.getDate()).toBe(24);   // Sunday May 24
    expect(end.getDay()).toBe(0);     // 0 = Sunday
    expect(end.getHours()).toBe(23);
  });

  it('week: end is Sunday when today is Sunday', () => {
    const sunday = new Date('2026-05-17T12:00:00'); // Sunday
    const { start, end } = getChartDateRange('week', sunday);
    expect(start.getDate()).toBe(11); // Monday May 11
    expect(end.getDate()).toBe(17);   // Sunday May 17
  });

  it('month: start = 1st, end = last day of month for a past month', () => {
    const pastMonth = new Date(2026, 2, 15); // March 15, 2026 (past month)
    const { start, end } = getChartDateRange('month', pastMonth);
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(2); // March
    expect(end.getDate()).toBe(31); // last day of March
    expect(end.getMonth()).toBe(2);
    expect(end.getHours()).toBe(23);
  });

  it('month: end = today for the current month', () => {
    const today = new Date();
    const { start, end } = getChartDateRange('month', today);
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(today.getMonth());
    expect(end.getDate()).toBe(today.getDate());
    expect(end.getMonth()).toBe(today.getMonth());
    expect(end.getHours()).toBe(23);
  });

  it('quarter: start = first day of Q1 (Jan 1), end = last day of Q1 (Mar 31) for a past quarter', () => {
    const pastQ = new Date(2026, 1, 15); // Feb 15, 2026 → Q1 (past quarter)
    const { start, end } = getChartDateRange('quarter', pastQ);
    expect(start.getMonth()).toBe(0); // January
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(2); // March
    expect(end.getDate()).toBe(31);
    expect(end.getHours()).toBe(23);
  });

  it('quarter: end = today for the current quarter', () => {
    const today = new Date();
    const { start, end } = getChartDateRange('quarter', today);
    const q = Math.floor(today.getMonth() / 3);
    expect(start.getMonth()).toBe(q * 3);
    expect(start.getDate()).toBe(1);
    expect(end.getDate()).toBe(today.getDate());
    expect(end.getMonth()).toBe(today.getMonth());
    expect(end.getHours()).toBe(23);
  });

  it('year: start = Jan 1, end = Dec 31', () => {
    const { start, end } = getChartDateRange('year', base);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(11);
    expect(end.getDate()).toBe(31);
    expect(end.getFullYear()).toBe(2026);
  });
});

describe('shiftPeriodDate', () => {
  // May 15, 2026 is a Friday (confirmed: May 17 is Sunday per existing tests)
  const base = new Date(2026, 4, 15, 12, 0, 0);

  it('shifts day by -3', () => {
    const r = shiftPeriodDate('day', -3, base);
    expect(r.getFullYear()).toBe(2026);
    expect(r.getMonth()).toBe(4);
    expect(r.getDate()).toBe(12);
  });

  it('shifts week by -1 (subtracts 7 days)', () => {
    const r = shiftPeriodDate('week', -1, base);
    expect(r.getMonth()).toBe(4);
    expect(r.getDate()).toBe(8); // May 15 - 7 = May 8
  });

  it('shifts month by -1', () => {
    const r = shiftPeriodDate('month', -1, base);
    expect(r.getMonth()).toBe(3); // April
    expect(r.getFullYear()).toBe(2026);
  });

  it('shifts quarter by -1 (subtracts 3 months)', () => {
    const r = shiftPeriodDate('quarter', -1, base);
    expect(r.getMonth()).toBe(1); // February (May - 3 = Feb)
    expect(r.getFullYear()).toBe(2026);
  });

  it('shifts year by -1', () => {
    const r = shiftPeriodDate('year', -1, base);
    expect(r.getFullYear()).toBe(2025);
    expect(r.getMonth()).toBe(4); // still May
  });

  it('returns a copy at offset 0 (not the same object)', () => {
    const r = shiftPeriodDate('month', 0, base);
    expect(r.getMonth()).toBe(4); // May
    expect(r).not.toBe(base);
  });

  it('month shift from month-end does not overflow (Mar 31 → Feb)', () => {
    const mar31 = new Date(2026, 2, 31, 12, 0, 0); // March 31
    const r = shiftPeriodDate('month', -1, mar31);
    expect(r.getMonth()).toBe(1); // February, not March
    expect(r.getFullYear()).toBe(2026);
  });

  it('shifts month by +1 (forward)', () => {
    const r = shiftPeriodDate('month', 1, new Date(2026, 4, 15, 12, 0, 0));
    expect(r.getMonth()).toBe(5); // June
    expect(r.getFullYear()).toBe(2026);
  });
});

describe('getPeriodLabel', () => {
  // May 15, 2026 is a Friday → ISO week Mon May 11 – Sun May 17
  const ref = new Date(2026, 4, 15, 12, 0, 0);

  it('formats day', () => {
    expect(getPeriodLabel('day', ref)).toBe('May 15, 2026');
  });

  it('formats week as Mon – Sun range using en dash', () => {
    // getMondayOf(May 15 Fri) = May 11; Sunday = May 17
    expect(getPeriodLabel('week', ref)).toBe('May 11 – May 17');
  });

  it('formats month', () => {
    expect(getPeriodLabel('month', ref)).toBe('May 2026');
  });

  it('formats quarter', () => {
    // May (month index 4): floor(4/3)+1 = 2
    expect(getPeriodLabel('quarter', ref)).toBe('Q2 2026');
  });

  it('formats year', () => {
    expect(getPeriodLabel('year', ref)).toBe('2026');
  });
});
