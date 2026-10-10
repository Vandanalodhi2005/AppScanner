export const lightColors = {
  // Primary brand & theme tokens
  background: '#F5F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F4FA',
  card: '#FFFFFF',
  border: '#E6EAF0',

  // Typography tokens
  heading: '#172033',
  text: '#172033',
  secondary: '#667085',
  muted: '#94A3B8',

  // Accent & functional colors
  primary: '#2563EB',
  blue: '#2563EB',
  green: '#16A34A',
  orange: '#F59E0B',
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  danger: '#EF4444',

  // Soft tinted background helpers for icons & badges
  tintBlue: '#EFF6FF',
  tintGreen: '#DCFCE7',
  tintOrange: '#FEF3C7',
  tintPurple: '#F3E8FF',
  tintCyan: '#ECFEFF',
  tintDanger: '#FEE2E2',
  // Legacy compatibility tokens
  backgroundElement: '#F0F4FA',
  backgroundSelected: '#EFF6FF',
  textSecondary: '#667085',
} as const;

export const darkColors = {
  // Primary brand & theme tokens for coordinated dark theme
  background: '#0D1527',
  surface: '#162238',
  surfaceAlt: '#1F2E47',
  card: '#162238',
  border: '#283A59',

  // Typography tokens
  heading: '#F8FAFC',
  text: '#F8FAFC',
  secondary: '#94A3B8',
  muted: '#64748B',

  // Accent & functional colors
  primary: '#3B82F6',
  blue: '#3B82F6',
  green: '#22C55E',
  orange: '#F59E0B',
  purple: '#A855F7',
  cyan: '#06B6D4',
  danger: '#EF4444',

  // Soft tinted background helpers for dark mode icons & badges
  tintBlue: '#1E2E4A',
  tintGreen: '#143828',
  tintOrange: '#3D2611',
  tintPurple: '#311B45',
  tintCyan: '#102E38',
  tintDanger: '#3D1414',

  // Legacy compatibility tokens
  backgroundElement: '#1F2E47',
  backgroundSelected: '#1E2E4A',
  textSecondary: '#94A3B8',
} as const;

export type ThemeColors = {
  readonly [K in keyof typeof lightColors]: string;
};
export type ThemeMode = 'light' | 'dark';

// Default static reference
export const colors: ThemeColors = lightColors;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
} as const;
