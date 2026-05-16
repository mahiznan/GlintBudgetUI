function formatBuildTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // e.g. "2026-05-16 19:24 UTC"
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi} UTC`;
}

function Footer() {
  const year = new Date().getFullYear();
  const commit = __APP_COMMIT__;
  const buildTime = formatBuildTime(__APP_BUILD_TIME__);

  return (
    <footer id="footer" className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-600 sm:flex-row">
        <p>© {year} GlintBudget</p>
        <nav aria-label="Legal" className="flex gap-6">
          <a href="#" className="hover:text-brand" aria-disabled="true">
            iOS App Store
          </a>
          <a href="#" className="hover:text-brand" aria-disabled="true">
            Privacy Policy
          </a>
        </nav>
      </div>
      <div
        data-testid="build-info"
        className="mx-auto max-w-6xl px-6 pb-4 text-center text-xs text-slate-400 sm:text-right"
      >
        Build <code className="font-mono text-slate-500">{commit}</code> · {buildTime}
      </div>
    </footer>
  );
}

export default Footer;
