import type { ReactNode } from 'react';
import CategoryBars from './CategoryBars';
import CategoryDonut from './CategoryDonut';
import TransactionChip from './TransactionChip';
import { LOGIN_CATEGORIES, LOGIN_TOTAL } from './demoData';

export interface Slide {
  id: string;
  eyebrow?: string;
  render: () => ReactNode;
}

const BENEFITS = [
  { icon: '🔍', title: 'See where money disappears' },
  { icon: '✅', title: 'Feel in control every day' },
  { icon: '📈', title: 'Build wealth — no spreadsheets' },
  { icon: '📸', title: 'Snap a receipt, done' },
];

/** The five onboarding slides, ported from the iOS app. */
export const SLIDES: Slide[] = [
  {
    id: 'hook',
    eyebrow: 'Welcome',
    render: () => (
      <>
        <h1 className="login-h1">
          See your money
          <br />
          <span className="login-grad-text">in a new light.</span>
        </h1>
        <p className="login-lead">
          GlintBudget turns everyday spending into clarity you can feel.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <TransactionChip emoji="☕" label="Coffee" amount="-$4.20" />
          <TransactionChip emoji="🚇" label="Metro" amount="-$2.75" />
          <TransactionChip emoji="💰" label="Salary" amount="+$3,200" positive />
        </div>
      </>
    ),
  },
  {
    id: 'intelligence',
    eyebrow: 'Intelligence',
    render: () => (
      <>
        <h1 className="login-h1">Smart by default.</h1>
        <p className="login-lead">
          Auto-categorized transactions and insights you actually understand.
        </p>
        <div className="mt-7 flex max-w-md flex-col gap-3">
          <div className="login-glass flex items-center justify-between px-5 py-4">
            <span>🍴 Dining</span>
            <b className="text-[#4ecdc4]">↑ 12% this week</b>
          </div>
          <div className="login-glass flex items-center justify-between px-5 py-4">
            <span>You saved this month</span>
            <span className="text-2xl font-extrabold text-[#8bc34a]">$2,300</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <span className="login-pill">🛒 Groceries</span>
            <span className="login-pill">🚆 Transport</span>
            <span className="login-pill">💡 Bills</span>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'analytics',
    eyebrow: 'Analytics',
    render: () => (
      <>
        <h1 className="login-h1">
          Your spending,
          <br />
          <span className="login-grad-text">beautifully clear.</span>
        </h1>
        <p className="login-lead">Live reports that make every dollar visible.</p>
        <div className="login-glass mt-7 p-7">
          <div className="flex flex-wrap items-center gap-10">
            <CategoryDonut data={LOGIN_CATEGORIES} total={LOGIN_TOTAL} />
            <CategoryBars data={LOGIN_CATEGORIES} />
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'superpowers',
    eyebrow: 'Why GlintBudget',
    render: () => (
      <>
        <h1 className="login-h1">
          Your money <span className="login-grad-text">superpowers.</span>
        </h1>
        <div className="mt-8 grid max-w-2xl grid-cols-1 gap-3.5 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <div key={b.title} className="login-glass flex items-center gap-4 p-5">
              <span className="login-benefit-ic" aria-hidden="true">
                {b.icon}
              </span>
              <span className="font-bold">{b.title}</span>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'launch',
    render: () => (
      <div className="text-center">
        <div className="text-5xl" aria-hidden="true">
          ✨
        </div>
        <h1 className="login-h1 mt-3">
          Ready when <span className="login-grad-text">you are.</span>
        </h1>
        <p className="login-lead mx-auto">
          Your financial universe is one click away — sign in to begin.
        </p>
      </div>
    ),
  },
];
