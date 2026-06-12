import { useEffect, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { SLIDES } from './slides';
import PhoneFrame from './PhoneFrame';

const INTERVAL_MS = 4200;

/** Auto-advancing onboarding pager with clickable page-indicator dots. */
export default function OnboardingCarousel() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduced || paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reduced, paused, index]);

  return (
    <>
      <div
        className="login-stage"
        aria-roledescription="carousel"
        aria-label="GlintBudget highlights"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {SLIDES.map((slide, i) => (
          <section
            key={slide.id}
            className={`login-slide${i === index ? ' login-slide--on' : ''}`}
            aria-hidden={i !== index}
          >
            <div
              className={`login-slide-inner${slide.screenshot ? ' login-slide-inner--with-phone' : ''}`}
            >
              <div className="min-w-0 flex-1">
                {slide.eyebrow && <div className="login-eyebrow">{slide.eyebrow}</div>}
                {slide.render()}
              </div>
              {slide.screenshot && (
                <PhoneFrame
                  src={slide.screenshot.src}
                  alt={slide.screenshot.alt}
                  width={110}
                  tilt={slide.screenshot.tilt}
                  yOffset={slide.screenshot.yOffset}
                />
              )}
            </div>
          </section>
        ))}
      </div>

      <div className="login-dots" role="tablist" aria-label="Choose slide">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            className={`login-dot${i === index ? ' login-dot--on' : ''}`}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </>
  );
}
