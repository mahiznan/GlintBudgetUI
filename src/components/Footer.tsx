function formatBuildTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi} UTC`;
}

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer id="footer" className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-600 sm:flex-row">
        <p>© {year} GlintBudget</p>
        <div className="flex flex-wrap items-center gap-6">
          <a href="#" className="hover:text-brand" aria-disabled="true">
            Privacy Policy
          </a>
          <span data-testid="build-info" className="text-xs text-slate-400">
            Build <code>{__APP_COMMIT__}</code> · {formatBuildTime(__APP_BUILD_TIME__)}
          </span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
