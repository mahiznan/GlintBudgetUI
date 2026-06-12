import PhoneFrame from './PhoneFrame';

const APPSTORE_URL = 'https://apps.apple.com/app/glintbudget/id6742884309';

const AppleIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

export default function AppStoreSlide() {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div>
        <div className="login-eyebrow">Also on iPhone</div>
        <h1 className="login-h1">
          GlintBudget <span className="login-grad-text">for iPhone</span>
        </h1>
        <p className="login-lead mx-auto">Free on the App Store — same data, native experience.</p>
      </div>

      <div className="flex items-end justify-center gap-2 mt-2">
        <PhoneFrame
          src="/onboarding/dashboard-light.png"
          alt="GlintBudget light theme – dashboard"
          width={72}
          tilt={-8}
          yOffset={10}
        />
        <PhoneFrame
          src="/onboarding/report-light.png"
          alt="GlintBudget – category report"
          width={86}
        />
        <PhoneFrame
          src="/onboarding/dashboard-dark.png"
          alt="GlintBudget dark theme – dashboard"
          width={72}
          tilt={8}
          yOffset={10}
        />
      </div>

      <a
        href={APPSTORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-zinc-800 transition-colors"
        aria-label="Download on the App Store"
      >
        <AppleIcon />
        Download on the App Store
      </a>
    </div>
  );
}
