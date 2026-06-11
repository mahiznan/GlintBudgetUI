interface Props {
  emoji: string;
  label: string;
  amount: string;
  positive?: boolean;
}

/** A frosted transaction chip used on the hook slide (e.g. "☕ Coffee -$4.20"). */
export default function TransactionChip({ emoji, label, amount, positive = false }: Props) {
  return (
    <span className="login-chip">
      <span aria-hidden="true">{emoji}</span>
      <span>{label}</span>
      <b className={positive ? 'text-[#8bc34a]' : 'text-slate-400'}>{amount}</b>
    </span>
  );
}
