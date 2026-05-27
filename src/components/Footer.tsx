function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer id="footer" className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-600 sm:flex-row">
        <p>© {year} GlintBudget</p>
        <nav aria-label="Legal" className="flex gap-6">
          <a href="#" className="hover:text-brand" aria-disabled="true">
            Privacy Policy
          </a>
        </nav>
      </div>
    </footer>
  );
}

export default Footer;
