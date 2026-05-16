function Header() {
  return (
    <header className="w-full border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="text-xl font-bold tracking-tight text-slate-900">
          <span aria-hidden="true" className="text-accent">
            ●
          </span>{' '}
          GlintBudget
        </span>
        <nav aria-label="Primary" className="hidden gap-6 text-sm text-slate-600 md:flex">
          <a href="#features" className="hover:text-slate-900">
            Features
          </a>
          <a href="#footer" className="hover:text-slate-900">
            About
          </a>
        </nav>
      </div>
    </header>
  );
}

export default Header;
