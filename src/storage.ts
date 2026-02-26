const BALANCE_KEY = 'roulette-balance'
const DEFAULT_BALANCE = 1000

export function saveBalance(balance: number): void {
  localStorage.setItem(BALANCE_KEY, String(balance))
}

export function loadBalance(): number {
  const stored = localStorage.getItem(BALANCE_KEY)
  if (stored === null) return DEFAULT_BALANCE
  const parsed = Number(stored)
  return Number.isFinite(parsed) ? parsed : DEFAULT_BALANCE
}

export function clearSavedBalance(): void {
  localStorage.removeItem(BALANCE_KEY)
}
