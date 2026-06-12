import LoginPanel from './LoginPanel';
import OnboardingCarousel from './OnboardingCarousel';
import OrbBackground from './OrbBackground';

/** Unauthenticated entry point: 75% onboarding carousel + 25% sign-in panel. */
export default function LoginScreen() {
  return (
    <div className="login-root">
      <OrbBackground />
      <div className="login-left">
        <div className="login-brand">
          <img src="/glint.svg" alt="GlintBudget logo" />
          <b>GlintBudget</b>
        </div>
        <OnboardingCarousel />
      </div>
      <LoginPanel />
    </div>
  );
}
