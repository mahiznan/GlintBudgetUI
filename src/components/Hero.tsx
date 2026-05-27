import SignInCard from './SignInCard';

const BULLETS = [
  'Add a transaction in under 5 seconds',
  'Spending patterns revealed automatically',
  'Works on desktop, tablet, and mobile',
  'Multi-currency support built in',
];

function Hero() {
  return (
    <section className="bg-gradient-to-br from-slate-50 to-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-12 md:flex-row md:items-center md:gap-16">
          {/* Left column — copy */}
          <div className="flex-1">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Personal finance
              <br />
              <span className="text-brand">made effortless.</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              Add transactions in seconds. Watch your spending patterns emerge in real time.
              GlintBudget keeps it simple — no spreadsheets, no complexity, just clarity.
            </p>
            <ul className="mt-8 flex flex-col gap-3">
              {BULLETS.map((item) => (
                <li key={item} className="flex items-center gap-3 text-slate-600">
                  <span className="font-bold text-brand" aria-hidden="true">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {/* Right column — sign-in card */}
          <div className="w-full md:w-auto md:min-w-[300px] md:max-w-[340px]">
            <SignInCard />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
