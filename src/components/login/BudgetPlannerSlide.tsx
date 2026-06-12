interface BudgetEntry {
  emoji: string;
  name: string;
  spent: number;
  budget: number;
}

const BUDGET_ENTRIES: BudgetEntry[] = [
  { emoji: '🛒', name: 'Groceries', spent: 350, budget: 500 },
  { emoji: '💡', name: 'Bills', spent: 180, budget: 250 },
  { emoji: '🍽', name: 'Dining', spent: 260, budget: 300 },
  { emoji: '🛍', name: 'Shopping', spent: 155, budget: 150 },
];

const TOTAL_SPENT = BUDGET_ENTRIES.reduce((s, e) => s + e.spent, 0); // 945
const TOTAL_BUDGET = BUDGET_ENTRIES.reduce((s, e) => s + e.budget, 0); // 1200

function barGradient(entry: BudgetEntry): string {
  const pct = entry.spent / entry.budget;
  if (pct >= 1) return 'linear-gradient(90deg, #f87171, #dc2626)';
  if (pct >= 0.8) return 'linear-gradient(90deg, #f97316, #fb923c)';
  return 'linear-gradient(90deg, #4caf50, #8bc34a)';
}

function barWidth(entry: BudgetEntry): string {
  return `${Math.min((entry.spent / entry.budget) * 100, 100)}%`;
}

export default function BudgetPlannerSlide() {
  return (
    <>
      <h1 className="login-h1">
        Plan your spend.
        <br />
        <span className="login-grad-text">Own every dollar.</span>
      </h1>

      <p className="login-lead">
        Set category budgets and watch GlintBudget keep you on track — automatically.
      </p>

      <div className="login-glass mx-auto mt-7 inline-block p-6 text-left w-full max-w-md">
        <p
          style={{
            fontSize: '10px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--login-muted)',
            marginBottom: '12px',
          }}
        >
          Monthly Budget
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {BUDGET_ENTRIES.map((entry) => (
            <div key={entry.name}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  marginBottom: '5px',
                  color: 'var(--login-fg)',
                }}
              >
                <span>
                  {entry.emoji} {entry.name}
                </span>
                <span style={{ color: 'var(--login-muted)' }}>
                  ${entry.spent} / ${entry.budget}
                </span>
              </div>
              <div
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: '4px',
                  height: '8px',
                }}
              >
                <div
                  style={{
                    background: barGradient(entry),
                    width: barWidth(entry),
                    height: '8px',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: '14px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
          }}
        >
          <span style={{ color: 'var(--login-muted)' }}>
            Total: ${TOTAL_SPENT} / ${TOTAL_BUDGET}
          </span>
          <span style={{ color: '#8bc34a', fontWeight: 600 }}>
            ${TOTAL_BUDGET - TOTAL_SPENT} remaining
          </span>
        </div>
      </div>

      {/* Colour legend */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          marginTop: '14px',
          flexWrap: 'wrap',
          fontSize: '11px',
          color: 'var(--login-muted)',
        }}
      >
        {[
          { label: 'On track', bg: 'linear-gradient(90deg,#4caf50,#8bc34a)' },
          { label: 'Nearing limit', bg: 'linear-gradient(90deg,#f97316,#fb923c)' },
          { label: 'Over budget', bg: 'linear-gradient(90deg,#f87171,#dc2626)' },
        ].map(({ label, bg }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span
              aria-hidden="true"
              style={{
                width: '9px',
                height: '9px',
                borderRadius: '2px',
                background: bg,
                display: 'inline-block',
              }}
            />
            {label}
          </span>
        ))}
      </div>
    </>
  );
}
