import type { CategoryDatum } from './demoData';

interface Props {
  data: CategoryDatum[];
}

/** Horizontal category spend bars, widths relative to the largest category. */
export default function CategoryBars({ data }: Props) {
  const max = Math.max(...data.map((d) => d.amount), 1);
  return (
    <ul className="flex min-w-[240px] flex-1 flex-col gap-3">
      {data.map((d) => (
        <li key={d.name} className="flex items-center gap-3 text-sm">
          <span className="w-24 text-slate-400">
            {d.emoji} {d.name}
          </span>
          <span className="login-bar-track">
            <span className="login-bar-fill" style={{ width: `${(d.amount / max) * 100}%` }} />
          </span>
          <b>${d.amount}</b>
        </li>
      ))}
    </ul>
  );
}
