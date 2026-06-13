import { useState } from 'react';
import { Link } from 'react-router-dom';

const FAQS: { q: string; a: string }[] = [
  {
    q: 'How do I delete a transaction?',
    a: 'Swipe left on any transaction in the Home screen to reveal the delete option.',
  },
  {
    q: 'Can I use multiple currencies?',
    a: 'Yes. Go to Settings → Default Entries → Currency to set your default, or choose a different currency when adding a transaction.',
  },
  {
    q: 'How do I back up my data?',
    a: 'Your data is automatically synced to the cloud via Firebase. It is accessible from any device you sign in to with the same account.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Go to Settings → Delete Account. This permanently removes all your transactions and account data.',
  },
  {
    q: 'Is my financial data private?',
    a: 'Yes. Your data is only accessible to you. We never share or sell your financial data. See our Privacy Policy for full details.',
  },
  {
    q: 'Can I export my transactions?',
    a: 'Export is on the roadmap. For now, all your data is stored securely in the cloud and accessible via the app.',
  },
];

export default function Support() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-[rgb(150,191,13)]">Glint Budget</span>
          </Link>
          <span className="text-sm text-slate-500 dark:text-slate-400">Support</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-10">

        {/* Hero */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Support</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Have a question, found a bug, or want to request a feature? We'd love to hear from you.
          </p>
        </div>

        {/* Contact */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Contact Us</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <a
              href="mailto:rajeshmepco@gmail.com?subject=Glint Budget Support"
              className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 hover:border-[rgb(150,191,13)] transition-colors"
            >
              <span className="text-2xl">✉️</span>
              <div>
                <div className="font-medium text-slate-800 dark:text-slate-100 text-sm">Email Support</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">rajeshmepco@gmail.com</div>
              </div>
            </a>
            <a
              href="https://budget.learnerandtutor.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 hover:border-[rgb(150,191,13)] transition-colors"
            >
              <span className="text-2xl">🌐</span>
              <div>
                <div className="font-medium text-slate-800 dark:text-slate-100 text-sm">Website</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">budget.learnerandtutor.com</div>
              </div>
            </a>
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Frequently Asked Questions
          </h2>
          <div className="space-y-2">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </section>

        {/* Privacy link */}
        <p className="text-sm text-slate-500 dark:text-slate-400">
          For information about how we handle your data, see our{' '}
          <Link to="/privacy-policy" className="text-[rgb(150,191,13)] underline">
            Privacy Policy
          </Link>
          .
        </p>

      </main>

      <footer className="border-t border-slate-200 dark:border-slate-700 mt-12 py-6">
        <div className="max-w-3xl mx-auto px-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Glint Budget · All rights reserved
        </div>
      </footer>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="font-medium text-slate-800 dark:text-slate-100 text-sm">{question}</span>
        <span className="text-slate-400 text-lg leading-none">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-3">
          {answer}
        </div>
      )}
    </div>
  );
}
