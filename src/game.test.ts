import { describe, it, expect, vi } from 'vitest'
import {
  createGameState,
  placeBet,
  clearBets,
  getTotalBet,
  generateResult,
  resolveBets,
} from './game'
import type { GameState } from './types'

describe('createGameState', () => {
  it('returns correct initial state with default balance', () => {
    const state = createGameState()
    expect(state.balance).toBe(1000)
    expect(state.phase).toBe('betting')
    expect(state.bets).toEqual([])
    expect(state.selectedChip).toBe(5)
    expect(state.lastResult).toBeNull()
    expect(state.lastWinAmount).toBe(0)
  })

  it('accepts a custom initial balance', () => {
    const state = createGameState(500)
    expect(state.balance).toBe(500)
  })
})

describe('placeBet', () => {
  it('rejects bets when phase is not betting', () => {
    const state = createGameState()
    state.phase = 'spinning'
    const result = placeBet(state, { type: 'straight', numbers: [7] })
    expect(result).toBe(false)
    expect(state.bets).toHaveLength(0)
  })

  it('rejects bets when phase is result', () => {
    const state = createGameState()
    state.phase = 'result'
    const result = placeBet(state, { type: 'red', numbers: [] })
    expect(result).toBe(false)
  })

  it('rejects bets when balance is insufficient', () => {
    const state = createGameState(10)
    state.selectedChip = 25
    const result = placeBet(state, { type: 'straight', numbers: [17] })
    expect(result).toBe(false)
    expect(state.bets).toHaveLength(0)
  })

  it('places a bet successfully in betting phase', () => {
    const state = createGameState()
    const result = placeBet(state, { type: 'straight', numbers: [7] })
    expect(result).toBe(true)
    expect(state.bets).toHaveLength(1)
    expect(state.bets[0]).toEqual({
      type: 'straight',
      numbers: [7],
      amount: 5,
    })
  })

  it('stacks duplicate bets by accumulating amount', () => {
    const state = createGameState()
    placeBet(state, { type: 'straight', numbers: [7] })
    placeBet(state, { type: 'straight', numbers: [7] })
    expect(state.bets).toHaveLength(1)
    expect(state.bets[0]?.amount).toBe(10)
  })

  it('does not stack bets with different numbers', () => {
    const state = createGameState()
    placeBet(state, { type: 'straight', numbers: [7] })
    placeBet(state, { type: 'straight', numbers: [8] })
    expect(state.bets).toHaveLength(2)
  })

  it('does not stack bets with different types', () => {
    const state = createGameState()
    placeBet(state, { type: 'straight', numbers: [7] })
    placeBet(state, { type: 'split', numbers: [7, 8] })
    expect(state.bets).toHaveLength(2)
  })

  it('rejects when remaining balance cannot cover chip value', () => {
    const state = createGameState(10)
    state.selectedChip = 5
    placeBet(state, { type: 'straight', numbers: [1] }) // 5 placed
    placeBet(state, { type: 'straight', numbers: [2] }) // 5 placed, now 0 remaining
    const result = placeBet(state, { type: 'straight', numbers: [3] })
    expect(result).toBe(false)
    expect(state.bets).toHaveLength(2)
  })
})

describe('clearBets', () => {
  it('empties the bets array', () => {
    const state = createGameState()
    placeBet(state, { type: 'straight', numbers: [7] })
    placeBet(state, { type: 'red', numbers: [] })
    expect(state.bets).toHaveLength(2)

    clearBets(state)
    expect(state.bets).toEqual([])
  })

  it('does not change balance', () => {
    const state = createGameState()
    placeBet(state, { type: 'straight', numbers: [7] })
    clearBets(state)
    expect(state.balance).toBe(1000)
  })
})

describe('getTotalBet', () => {
  it('returns 0 with no bets', () => {
    const state = createGameState()
    expect(getTotalBet(state)).toBe(0)
  })

  it('returns sum of all bet amounts', () => {
    const state = createGameState()
    state.selectedChip = 5
    placeBet(state, { type: 'straight', numbers: [7] })
    state.selectedChip = 25
    placeBet(state, { type: 'red', numbers: [] })
    expect(getTotalBet(state)).toBe(30)
  })

  it('includes stacked bet amounts', () => {
    const state = createGameState()
    state.selectedChip = 5
    placeBet(state, { type: 'straight', numbers: [7] })
    placeBet(state, { type: 'straight', numbers: [7] })
    expect(getTotalBet(state)).toBe(10)
  })
})

describe('generateResult', () => {
  it('returns a number between 0 and 36', () => {
    for (let i = 0; i < 100; i++) {
      const result = generateResult()
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(36)
      expect(Number.isInteger(result)).toBe(true)
    }
  })

  it('uses crypto.getRandomValues internally', () => {
    const spy = vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
      (array as Uint32Array)[0] = 0
      return array as Uint32Array
    })
    expect(generateResult()).toBe(0)

    spy.mockImplementation((array) => {
      (array as Uint32Array)[0] = 36
      return array as Uint32Array
    })
    expect(generateResult()).toBe(36)

    spy.mockRestore()
  })
})

describe('resolveBets', () => {
  function makeState(overrides?: Partial<GameState>): GameState {
    return {
      balance: 1000,
      bets: [],
      lastBets: [],
      selectedChip: 5,
      phase: 'betting',
      lastResult: null,
      lastWinAmount: 0,
      ...overrides,
    }
  }

  // -- Straight (35:1) --
  it('pays 35:1 for winning straight bet', () => {
    const state = makeState({
      bets: [{ type: 'straight', numbers: [7], amount: 10 }],
    })
    const win = resolveBets(state, 7)
    // win = 10 + 10 * 35 = 360
    expect(win).toBe(360)
    expect(state.balance).toBe(1000 - 10 + 360)
    expect(state.lastResult).toBe(7)
    expect(state.lastWinAmount).toBe(360)
  })

  it('loses straight bet when result does not match', () => {
    const state = makeState({
      bets: [{ type: 'straight', numbers: [7], amount: 10 }],
    })
    const win = resolveBets(state, 8)
    expect(win).toBe(0)
    expect(state.balance).toBe(990)
  })

  // -- Split (17:1) --
  it('pays 17:1 for winning split bet', () => {
    const state = makeState({
      bets: [{ type: 'split', numbers: [7, 8], amount: 10 }],
    })
    const win = resolveBets(state, 8)
    expect(win).toBe(180) // 10 + 10*17
    expect(state.balance).toBe(1000 - 10 + 180)
  })

  it('loses split bet when result not in pair', () => {
    const state = makeState({
      bets: [{ type: 'split', numbers: [7, 8], amount: 10 }],
    })
    const win = resolveBets(state, 9)
    expect(win).toBe(0)
  })

  // -- Street (11:1) --
  it('pays 11:1 for winning street bet', () => {
    const state = makeState({
      bets: [{ type: 'street', numbers: [1, 2, 3], amount: 10 }],
    })
    const win = resolveBets(state, 2)
    expect(win).toBe(120) // 10 + 10*11
  })

  it('loses street bet when result not in row', () => {
    const state = makeState({
      bets: [{ type: 'street', numbers: [1, 2, 3], amount: 10 }],
    })
    const win = resolveBets(state, 4)
    expect(win).toBe(0)
  })

  // -- Corner (8:1) --
  it('pays 8:1 for winning corner bet', () => {
    const state = makeState({
      bets: [{ type: 'corner', numbers: [1, 2, 4, 5], amount: 10 }],
    })
    const win = resolveBets(state, 5)
    expect(win).toBe(90) // 10 + 10*8
  })

  it('loses corner bet when result not in square', () => {
    const state = makeState({
      bets: [{ type: 'corner', numbers: [1, 2, 4, 5], amount: 10 }],
    })
    const win = resolveBets(state, 6)
    expect(win).toBe(0)
  })

  // -- Sixline (5:1) --
  it('pays 5:1 for winning sixline bet', () => {
    const state = makeState({
      bets: [{ type: 'sixline', numbers: [1, 2, 3, 4, 5, 6], amount: 10 }],
    })
    const win = resolveBets(state, 3)
    expect(win).toBe(60) // 10 + 10*5
  })

  it('loses sixline bet when result outside range', () => {
    const state = makeState({
      bets: [{ type: 'sixline', numbers: [1, 2, 3, 4, 5, 6], amount: 10 }],
    })
    const win = resolveBets(state, 7)
    expect(win).toBe(0)
  })

  // -- Column (2:1) --
  it('pays 2:1 for winning column bet', () => {
    const col1 = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
    const state = makeState({
      bets: [{ type: 'column', numbers: col1, amount: 10 }],
    })
    const win = resolveBets(state, 7)
    expect(win).toBe(30) // 10 + 10*2
  })

  it('loses column bet when result not in column', () => {
    const col1 = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
    const state = makeState({
      bets: [{ type: 'column', numbers: col1, amount: 10 }],
    })
    const win = resolveBets(state, 2)
    expect(win).toBe(0)
  })

  // -- Dozen (2:1) --
  it('pays 2:1 for winning dozen bet', () => {
    const dozen1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    const state = makeState({
      bets: [{ type: 'dozen', numbers: dozen1, amount: 10 }],
    })
    const win = resolveBets(state, 12)
    expect(win).toBe(30)
  })

  it('loses dozen bet when result not in range', () => {
    const dozen1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    const state = makeState({
      bets: [{ type: 'dozen', numbers: dozen1, amount: 10 }],
    })
    const win = resolveBets(state, 13)
    expect(win).toBe(0)
  })

  // -- Red (1:1) --
  it('pays 1:1 for winning red bet', () => {
    const state = makeState({
      bets: [{ type: 'red', numbers: [], amount: 10 }],
    })
    const win = resolveBets(state, 1) // 1 is red
    expect(win).toBe(20) // 10 + 10*1
  })

  it('loses red bet on black number', () => {
    const state = makeState({
      bets: [{ type: 'red', numbers: [], amount: 10 }],
    })
    const win = resolveBets(state, 2) // 2 is black
    expect(win).toBe(0)
  })

  it('loses red bet on zero', () => {
    const state = makeState({
      bets: [{ type: 'red', numbers: [], amount: 10 }],
    })
    const win = resolveBets(state, 0)
    expect(win).toBe(0)
  })

  // -- Black (1:1) --
  it('pays 1:1 for winning black bet', () => {
    const state = makeState({
      bets: [{ type: 'black', numbers: [], amount: 10 }],
    })
    const win = resolveBets(state, 2) // 2 is black
    expect(win).toBe(20)
  })

  it('loses black bet on red number', () => {
    const state = makeState({
      bets: [{ type: 'black', numbers: [], amount: 10 }],
    })
    const win = resolveBets(state, 1) // 1 is red
    expect(win).toBe(0)
  })

  it('loses black bet on zero', () => {
    const state = makeState({
      bets: [{ type: 'black', numbers: [], amount: 10 }],
    })
    const win = resolveBets(state, 0)
    expect(win).toBe(0)
  })

  // -- Odd (1:1) --
  it('pays 1:1 for winning odd bet', () => {
    const state = makeState({
      bets: [{ type: 'odd', numbers: [], amount: 10 }],
    })
    const win = resolveBets(state, 3)
    expect(win).toBe(20)
  })

  it('loses odd bet on even number', () => {
    const state = makeState({
      bets: [{ type: 'odd', numbers: [], amount: 10 }],
    })
    const win = resolveBets(state, 4)
    expect(win).toBe(0)
  })

  it('loses odd bet on zero', () => {
    const state = makeState({
      bets: [{ type: 'odd', numbers: [], amount: 10 }],
    })
    const win = resolveBets(state, 0)
    expect(win).toBe(0)
  })

  // -- Even (1:1) --
  it('pays 1:1 for winning even bet', () => {
    const state = makeState({
      bets: [{ type: 'even', numbers: [], amount: 10 }],
    })
    const win = resolveBets(state, 4)
    expect(win).toBe(20)
  })

  it('loses even bet on odd number', () => {
    const state = makeState({
      bets: [{ type: 'even', numbers: [], amount: 10 }],
    })
    const win = resolveBets(state, 3)
    expect(win).toBe(0)
  })

  it('loses even bet on zero', () => {
    const state = makeState({
      bets: [{ type: 'even', numbers: [], amount: 10 }],
    })
    const win = resolveBets(state, 0)
    expect(win).toBe(0)
  })

  // -- Low (1:1) --
  it('pays 1:1 for winning low bet', () => {
    const state = makeState({
      bets: [{ type: 'low', numbers: [], amount: 10 }],
    })
    const win = resolveBets(state, 18)
    expect(win).toBe(20)
  })

  it('loses low bet on high number', () => {
    const state = makeState({
      bets: [{ type: 'low', numbers: [], amount: 10 }],
    })
    const win = resolveBets(state, 19)
    expect(win).toBe(0)
  })

  it('loses low bet on zero', () => {
    const state = makeState({
      bets: [{ type: 'low', numbers: [], amount: 10 }],
    })
    const win = resolveBets(state, 0)
    expect(win).toBe(0)
  })

  // -- High (1:1) --
  it('pays 1:1 for winning high bet', () => {
    const state = makeState({
      bets: [{ type: 'high', numbers: [], amount: 10 }],
    })
    const win = resolveBets(state, 19)
    expect(win).toBe(20)
  })

  it('loses high bet on low number', () => {
    const state = makeState({
      bets: [{ type: 'high', numbers: [], amount: 10 }],
    })
    const win = resolveBets(state, 18)
    expect(win).toBe(0)
  })

  it('loses high bet on zero', () => {
    const state = makeState({
      bets: [{ type: 'high', numbers: [], amount: 10 }],
    })
    const win = resolveBets(state, 0)
    expect(win).toBe(0)
  })

  // -- Multiple bets --
  it('resolves multiple bets correctly', () => {
    const state = makeState({
      bets: [
        { type: 'straight', numbers: [7], amount: 10 },
        { type: 'red', numbers: [], amount: 20 },
        { type: 'odd', numbers: [], amount: 15 },
      ],
    })
    // 7 is red and odd
    const win = resolveBets(state, 7)
    // straight: 10 + 10*35 = 360
    // red: 20 + 20*1 = 40
    // odd: 15 + 15*1 = 30
    expect(win).toBe(430)
    const totalBet = 10 + 20 + 15
    expect(state.balance).toBe(1000 - totalBet + 430)
  })

  it('updates lastResult and lastWinAmount', () => {
    const state = makeState({
      bets: [{ type: 'straight', numbers: [7], amount: 10 }],
    })
    resolveBets(state, 7)
    expect(state.lastResult).toBe(7)
    expect(state.lastWinAmount).toBe(360)
  })

  it('handles zero bets without error', () => {
    const state = makeState()
    const win = resolveBets(state, 7)
    expect(win).toBe(0)
    expect(state.balance).toBe(1000)
  })
})
