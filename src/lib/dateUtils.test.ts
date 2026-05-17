import { describe, expect, it } from 'vitest';
import {
  getPeriodRange,
  formatCurrency,
  groupByDay,
  groupByMonth,
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
