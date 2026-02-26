import { type Bet, type GameState, PAYOUT_MAP, RED_NUMBERS } from './types'

export function createGameState(initialBalance = 1000): GameState {
  return {
    balance: initialBalance,
    bets: [],
    lastBets: [],
    selectedChip: 5,
    phase: 'betting',
    lastResult: null,
    lastWinAmount: 0,
  }
}

export function placeBet(state: GameState, bet: Omit<Bet, 'amount'>): boolean {
  if (state.phase !== 'betting') return false
  if (state.selectedChip > state.balance - getTotalBet(state)) return false

  // Check if same bet already exists, add to it
  const existing = state.bets.find(
    (b) => b.type === bet.type && arraysEqual(b.numbers, bet.numbers),
  )

  if (existing) {
    existing.amount += state.selectedChip
  } else {
    state.bets.push({ ...bet, amount: state.selectedChip })
  }

  return true
}

export function clearBets(state: GameState): void {
  state.bets = []
}

export function getTotalBet(state: GameState): number {
  return state.bets.reduce((sum, b) => sum + b.amount, 0)
}

export function generateResult(): number {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return arr[0]! % 37 // 0-36
}

export function resolveBets(state: GameState, result: number): number {
  let totalWin = 0

  for (const bet of state.bets) {
    if (isBetWin(bet, result)) {
      const payout = PAYOUT_MAP[bet.type]
      totalWin += bet.amount + bet.amount * payout
    }
  }

  const totalBet = getTotalBet(state)
  state.balance = Math.max(0, state.balance - totalBet + totalWin)
  state.lastResult = result
  state.lastWinAmount = totalWin

  // Save current bets as lastBets before clearing
  state.lastBets = state.bets.map((b) => ({ ...b }))

  return totalWin
}

export function isBankrupt(state: GameState): boolean {
  return state.balance === 0 && state.bets.length === 0
}

export function repeatBets(state: GameState): boolean {
  if (state.phase !== 'betting') return false
  if (state.lastBets.length === 0) return false

  const totalNeeded = state.lastBets.reduce((sum, b) => sum + b.amount, 0)
  if (totalNeeded > state.balance - getTotalBet(state)) return false

  for (const bet of state.lastBets) {
    const existing = state.bets.find(
      (b) => b.type === bet.type && arraysEqual(b.numbers, bet.numbers),
    )
    if (existing) {
      existing.amount += bet.amount
    } else {
      state.bets.push({ ...bet })
    }
  }

  return true
}

export function undoLastBet(state: GameState): boolean {
  if (state.phase !== 'betting') return false
  if (state.bets.length === 0) return false

  state.bets.pop()
  return true
}

function isBetWin(bet: Bet, result: number): boolean {
  switch (bet.type) {
    case 'straight':
    case 'split':
    case 'street':
    case 'corner':
    case 'sixline':
      return bet.numbers.includes(result)
    case 'column':
    case 'dozen':
      return bet.numbers.includes(result)
    case 'red':
      return result > 0 && RED_NUMBERS.has(result)
    case 'black':
      return result > 0 && !RED_NUMBERS.has(result)
    case 'odd':
      return result > 0 && result % 2 === 1
    case 'even':
      return result > 0 && result % 2 === 0
    case 'low':
      return result >= 1 && result <= 18
    case 'high':
      return result >= 19 && result <= 36
  }
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}
