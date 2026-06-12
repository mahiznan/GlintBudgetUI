import PhoneFrame from './PhoneFrame';

const APPSTORE_URL = 'https://apps.apple.com/app/glintbudget/id6742884309';

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
          width={144}
          tilt={-8}
          yOffset={20}
          className="hidden sm:block"
        />
        <PhoneFrame
          src="/onboarding/report-light.png"
          alt="GlintBudget – category report"
          width={172}
        />
        <PhoneFrame
          src="/onboarding/dashboard-dark.png"
          alt="GlintBudget dark theme – dashboard"
          width={144}
          tilt={8}
          yOffset={20}
          className="hidden sm:block"
        />
      </div>

      <a
        href={APPSTORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4"
        aria-label="Download on the App Store"
      >
        <img src="/app-store-badge.svg" alt="Download on the App Store" height={48} style={{ height: '48px' }} />
      </a>
    </div>
  );
}
