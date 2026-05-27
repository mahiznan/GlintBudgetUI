import { Link } from 'react-router-dom';

function Header() {
  return (
    <header className="w-full border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <img src="/glint.jpg" alt="GlintBudget logo" className="h-9 w-9 rounded-lg object-cover" />
          <span className="text-xl font-bold tracking-tight text-slate-900">GlintBudget</span>
        </Link>
      </div>
    </header>
  );
}

export default Header;
