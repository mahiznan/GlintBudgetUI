import type { CategoryDatum } from './demoData';

const SEGMENT_COLORS = ['#4caf50', '#8bc34a', '#4ecdc4', '#7fb069', '#a8d08d'];

interface Props {
  data: CategoryDatum[];
  total: number;
}

/** Donut chart drawn with a CSS conic-gradient — no charting library. */
export default function CategoryDonut({ data, total }: Props) {
  const sum = data.reduce((acc, d) => acc + d.amount, 0) || 1;
  const stops = data
    .map((d, i) => {
      const before = data.slice(0, i).reduce((acc, x) => acc + x.amount, 0);
      const start = (before / sum) * 100;
      const end = ((before + d.amount) / sum) * 100;
      return `${SEGMENT_COLORS[i % SEGMENT_COLORS.length]} ${start}% ${end}%`;
    })
    .join(', ');

  return (
    <div
      className="login-donut"
      style={{ background: `conic-gradient(${stops})` }}
      role="img"
      aria-label={`Spending breakdown, total $${total.toLocaleString()}`}
    >
      <div className="login-donut-center">
        <div>
          <div className="text-xs text-slate-400">Total</div>
          <div className="text-2xl font-extrabold">${total.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
