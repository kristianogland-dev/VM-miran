export type Round = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'bronze' | 'final'

export interface RoundRule {
  outcome: number
  exact: number
  advance: number
  max: number
  label: string
}

export const ROUND_RULES: Record<Round, RoundRule> = {
  group:  { outcome: 1, exact: 4, advance: 0, max: 5,  label: 'Gruppespill' },
  r32:    { outcome: 2, exact: 2, advance: 2, max: 6,  label: '16-delsfinale' },
  r16:    { outcome: 3, exact: 3, advance: 2, max: 8,  label: '8-delsfinale' },
  qf:     { outcome: 3, exact: 4, advance: 3, max: 10, label: 'Kvartfinale' },
  sf:     { outcome: 4, exact: 5, advance: 3, max: 12, label: 'Semifinale' },
  bronze: { outcome: 5, exact: 6, advance: 3, max: 14, label: 'Bronsefinale' },
  final:  { outcome: 5, exact: 5, advance: 5, max: 50, label: 'Finale' },
}

export const ROUND_LABELS: Record<string, string> = {
  group: 'Gruppespill',
  r32: '16-delsfinale',
  r16: '8-delsfinale',
  qf: 'Kvartfinale',
  sf: 'Semifinale',
  bronze: 'Bronsefinale',
  final: 'Finale',
}

export const TOTAL_MAX_POINTS = 72 * 5 + 16 * 6 + 8 * 8 + 4 * 10 + 2 * 12 + 1 * 14 + 1 * 50
// = 360 + 96 + 64 + 40 + 24 + 14 + 50 = 648
