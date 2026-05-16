const FEATURES = [
  {
    emoji: '💱',
    title: 'Multi-currency',
    description: 'Default currency with per-transaction overrides.',
  },
  {
    emoji: '📊',
    title: 'Smart reports',
    description: 'Pie and bar charts filtered by category, vendor, account.',
  },
  {
    emoji: '📱',
    title: 'iOS, soon web',
    description: 'Built for iPhone today. The web app is on the way.',
  },
] as const;

function FeatureStrip() {
  return (
    <section id="features" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-6">
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
