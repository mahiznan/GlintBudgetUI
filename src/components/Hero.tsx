function Hero() {
  return (
    <section className="bg-gradient-to-b from-white to-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-24 text-center sm:py-32">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
          Track every dollar.
          <br />
          <span className="text-amber-500">Across every currency.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          GlintBudget brings the simplicity of your iPhone expense tracker to every screen you own.
          iOS today. Web next.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-4">
          <button
            type="button"
            disabled
            className="rounded-full bg-amber-500 px-6 py-3 text-base font-semibold text-white shadow-sm opacity-60"
          >
            Coming soon
          </button>
        </div>
      </div>
    </section>
  );
}

export default Hero;
