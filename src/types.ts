export type PocketColor = 'red' | 'black' | 'green'

export type BetType =
  | 'straight'   // Single number (35:1)
  | 'split'      // Two adjacent numbers (17:1)
  | 'street'     // Three numbers in a row (11:1)
  | 'corner'     // Four numbers in a square (8:1)
  | 'sixline'    // Six numbers, two rows (5:1)
  | 'column'     // 12 numbers in a column (2:1)
  | 'dozen'      // 1-12, 13-24, 25-36 (2:1)
  | 'red'        // Red numbers (1:1)
  | 'black'      // Black numbers (1:1)
  | 'odd'        // Odd numbers (1:1)
  | 'even'       // Even numbers (1:1)
  | 'low'        // 1-18 (1:1)
  | 'high'       // 19-36 (1:1)

export type Bet = {
  type: BetType
  numbers: number[]
  amount: number
}

export type GamePhase = 'betting' | 'spinning' | 'result'

export type GameState = {
  balance: number
  bets: Bet[]
  selectedChip: number
  phase: GamePhase
  lastResult: number | null
  lastWinAmount: number
}

// European wheel sequence (clockwise)
export const WHEEL_SEQUENCE: number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
]

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
])

export function getPocketColor(n: number): PocketColor {
  if (n === 0) return 'green'
  return RED_NUMBERS.has(n) ? 'red' : 'black'
}

export const CHIP_VALUES = [1, 5, 25, 100] as const

export const PAYOUT_MAP: Record<BetType, number> = {
  straight: 35,
  split: 17,
  street: 11,
  corner: 8,
  sixline: 5,
  column: 2,
  dozen: 2,
  red: 1,
  black: 1,
  odd: 1,
  even: 1,
  low: 1,
  high: 1,
}
