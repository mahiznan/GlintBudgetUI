export interface Theme {
  id: string;
  name: string;
  emoji: string;
  swatchGradient: string;
  /** Literal hex/rgb color for SVG fill attributes (var() doesn't work in SVG attributes). */
  chartColor: string;
  /** 5-element array for category breakdown bar fills. */
  categoryColors: readonly string[];
}

export const THEMES: readonly Theme[] = [
  {
    id: 'lime',
    name: 'Lime',
    emoji: '🍋',
    swatchGradient: 'linear-gradient(135deg, rgb(80,120,0), rgb(150,191,13), #22c55e)',
    chartColor: 'rgb(150,191,13)',
    categoryColors: ['rgb(150,191,13)', '#22c55e', '#16a34a', '#059669', '#0d9488'],
  },
  {
    id: 'forest',
    name: 'Forest',
    emoji: '🌲',
    swatchGradient: 'linear-gradient(135deg, #003d1c, #007836, #1fa32e)',
    chartColor: '#007836',
    categoryColors: ['#007836', '#1fa32e', '#96bf0d', '#059669', '#0d9488'],
  },
  {
    id: 'ocean',
    name: 'Ocean',
    emoji: '🌊',
    swatchGradient: 'linear-gradient(135deg, #0c2d5e, #2563eb, #0ea5e9)',
    chartColor: '#2563eb',
    categoryColors: ['#2563eb', '#0ea5e9', '#60a5fa', '#38bdf8', '#7dd3fc'],
  },
  {
    id: 'amber',
    name: 'Amber',
    emoji: '🌅',
    swatchGradient: 'linear-gradient(135deg, #78350f, #b45309, #f59e0b)',
    chartColor: '#b45309',
    categoryColors: ['#b45309', '#f59e0b', '#d97706', '#fbbf24', '#0d9488'],
  },
] as const;

export const DEFAULT_THEME_ID = 'lime';

/** Safe lookup — falls back to Lime if `id` is unknown. */
export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME_ID)!;
}
