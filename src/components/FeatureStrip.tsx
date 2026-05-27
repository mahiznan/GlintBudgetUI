const FEATURES = [
  {
    emoji: '💱',
    title: 'Multi-currency',
    description:
      'Default currency with per-transaction overrides. Perfect for travel or international spending.',
  },
  {
    emoji: '📊',
    title: 'Smart reports',
    description:
      'Pie and bar charts filtered by category, vendor, and account. See where your money really goes.',
  },
  {
    emoji: '📱',
    title: 'Mobile-friendly',
    description:
      'Fully responsive — looks great and works perfectly on your phone, tablet, or desktop.',
  },
] as const;

function FeatureStrip() {
  return (
    <section id="features" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-6">
        <p className="mb-12 text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
          Everything you need to manage your money
        </p>
        <div className="grid gap-10 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="text-center">
              <div className="text-4xl" aria-hidden="true">
                {feature.emoji}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-brand">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeatureStrip;
