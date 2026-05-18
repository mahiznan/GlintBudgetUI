import { describe, it, expect } from 'vitest';
import { THEMES, DEFAULT_THEME_ID, getTheme } from './themes';

describe('themes', () => {
  it('THEMES has exactly 4 entries', () => {
    expect(THEMES).toHaveLength(4);
  });

  it('every theme has required string fields', () => {
    for (const t of THEMES) {
      expect(typeof t.id).toBe('string');
      expect(t.id.length).toBeGreaterThan(0);
      expect(typeof t.name).toBe('string');
      expect(typeof t.emoji).toBe('string');
      expect(typeof t.swatchGradient).toBe('string');
      expect(typeof t.chartColor).toBe('string');
      expect(t.categoryColors).toHaveLength(5);
    }
  });

  it('DEFAULT_THEME_ID matches an entry in THEMES', () => {
    expect(THEMES.find((t) => t.id === DEFAULT_THEME_ID)).toBeDefined();
  });

  it('getTheme returns the matching theme', () => {
    expect(getTheme('forest').name).toBe('Forest');
  });

  it('getTheme falls back to lime for unknown id', () => {
    expect(getTheme('unknown').id).toBe('lime');
  });
});
