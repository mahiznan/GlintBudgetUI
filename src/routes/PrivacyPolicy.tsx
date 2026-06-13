import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-[rgb(150,191,13)]">Glint Budget</span>
          </Link>
          <span className="text-sm text-slate-500 dark:text-slate-400">Privacy Policy</span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Effective Date: June 13, 2026 · Last Updated: June 13, 2026
          </p>
        </div>

        <Section title="Overview">
          <P>
            Glint Budget is a personal expense tracking application. We are committed to protecting
            your privacy. This policy explains what data we collect, why we collect it, and how you
            can control it.
          </P>
        </Section>

        <Section title="Data We Collect">
          <SubSection title="Account Information">
            <P>
              When you create an account we collect your email address (for authentication), your
              name (from Google or Apple Sign In if you choose those methods), and a unique Firebase
              User ID. If you use Apple Sign In, Apple may provide a private relay email instead of
              your real one. You may also use the app anonymously without providing any personal
              information.
            </P>
          </SubSection>
          <SubSection title="Financial Data">
            <P>
              The core purpose of the app is expense tracking. We store transaction amounts, dates,
              categories, vendors, account and payment method names, notes, and currency
              preferences. This data is stored in your personal account and is never shared with
              other users or third parties.
            </P>
          </SubSection>
          <SubSection title="App Preferences">
            <P>
              We store your in-app settings including default categories, vendors, accounts,
              payment methods, and report configurations.
            </P>
          </SubSection>
          <SubSection title="Usage Analytics">
            <P>
              If you grant tracking permission via the App Tracking Transparency prompt, we collect
              anonymised usage data through Firebase Analytics to understand how features are used
              and improve the app. If you deny tracking permission, analytics collection is disabled
              entirely.
            </P>
          </SubSection>
        </Section>

        <Section title="How We Use Your Data">
          <Table
            rows={[
              ['Email / Name / User ID', 'Authentication and account management'],
              ['Financial transactions', 'Core app functionality — displaying and reporting your expenses'],
              ['App preferences', 'Personalising your experience'],
              ['Usage analytics', 'Improving app features (only with your consent)'],
            ]}
          />
          <P>We do not sell your data. We do not use your financial data for advertising.</P>
        </Section>

        <Section title="Third-Party Services">
          <P>Glint Budget uses the following Google / Firebase services to operate:</P>
          <Table
            rows={[
              ['Firebase Authentication', 'Sign in / account management'],
              ['Cloud Firestore', 'Storing your transactions and preferences'],
              ['Firebase Analytics', 'App usage analytics (consent-gated)'],
              ['Google Sign In', 'Optional sign-in method'],
              ['Apple Sign In', 'Optional sign-in method'],
            ]}
          />
          <P>
            Your data is stored on Google Cloud infrastructure. All third-party services are
            governed by the{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[rgb(150,191,13)] underline"
            >
              Google Privacy Policy
            </a>{' '}
            and{' '}
            <a
              href="https://www.apple.com/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[rgb(150,191,13)] underline"
            >
              Apple Privacy Policy
            </a>{' '}
            respectively.
          </P>
        </Section>

        <Section title="Data Retention & Deletion">
          <P>
            Your data is retained as long as your account is active. When you delete your account
            via <strong>Settings → Delete Account</strong>, we permanently and immediately delete
            all your transactions, preferences, user profile, and Firebase Authentication account.
            Deletion is irreversible.
          </P>
        </Section>

        <Section title="Your Rights">
          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            <li><strong>Access</strong> — all your data is visible within the app</li>
            <li><strong>Delete</strong> — use Settings → Delete Account to erase everything permanently</li>
            <li>
              <strong>Withdraw analytics consent</strong> — iOS Settings → Privacy &amp; Security →
              Tracking → Glint Budget
            </li>
          </ul>
        </Section>

        <Section title="Data Security">
          <P>Your data is protected by:</P>
          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            <li>Firebase Authentication token-based auth</li>
            <li>Firestore security rules — each user can only access their own data</li>
            <li>HTTPS encryption for all data in transit</li>
            <li>Google Cloud encryption at rest</li>
          </ul>
        </Section>

        <Section title="Children's Privacy">
          <P>
            Glint Budget is not directed at children under the age of 13. We do not knowingly
            collect personal information from children under 13.
          </P>
        </Section>

        <Section title="Changes to This Policy">
          <P>
            We may update this policy from time to time. The Last Updated date at the top of this
            page will reflect any changes. Continued use of the app after changes constitutes
            acceptance of the updated policy.
          </P>
        </Section>

        <Section title="Contact">
          <P>If you have questions or requests regarding your privacy, contact us at:</P>
          <div className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <div>
              <span className="font-medium">Email: </span>
              <a href="mailto:rajeshmepco@gmail.com" className="text-[rgb(150,191,13)] underline">
                rajeshmepco@gmail.com
              </a>
            </div>
            <div>
              <span className="font-medium">Website: </span>
              <a
                href="https://budget.learnerandtutor.com"
                className="text-[rgb(150,191,13)] underline"
              >
                budget.learnerandtutor.com
              </a>
            </div>
          </div>
        </Section>

      </main>

      <footer className="border-t border-slate-200 dark:border-slate-700 mt-12 py-6">
        <div className="max-w-3xl mx-auto px-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Glint Budget · All rights reserved
        </div>
      </footer>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
      {children}
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 mt-3">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
      {children}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{children}</p>
  );
}

function Table({ rows }: { rows: [string, string][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 dark:bg-slate-800">
          <tr>
            <th className="text-left px-4 py-2 font-medium text-slate-700 dark:text-slate-300 w-1/3">Data</th>
            <th className="text-left px-4 py-2 font-medium text-slate-700 dark:text-slate-300">Purpose</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {rows.map(([label, value]) => (
            <tr key={label} className="bg-white dark:bg-slate-900">
              <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300">{label}</td>
              <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
