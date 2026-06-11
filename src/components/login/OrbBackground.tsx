import type { CSSProperties } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const ORBS: CSSProperties[] = [
  { width: 480, height: 480, background: '#4caf50', top: -160, left: -120 },
  { width: 380, height: 380, background: '#8bc34a', bottom: -160, left: '30%', animationDelay: '-6s' },
  { width: 320, height: 320, background: '#4ecdc4', top: '30%', left: '40%', opacity: 0.28, animationDelay: '-12s' },
];

/** Three large blurred orbs drifting behind the carousel. Static under reduced motion. */
export default function OrbBackground() {
  const reduced = useReducedMotion();
  const className = reduced ? 'login-orb' : 'login-orb login-orb--drift';
  return (
    <div aria-hidden="true">
      {ORBS.map((style, i) => (
        <span key={i} className={className} style={style} />
      ))}
    </div>
  );
}
