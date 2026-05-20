interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  return (
    <header className="flex items-center border-b border-white/50 bg-white/75 backdrop-blur-md px-6 py-3">
      <h1 className="text-lg font-semibold text-text">{title}</h1>
    </header>
  );
}
