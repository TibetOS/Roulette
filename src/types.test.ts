import { describe, it, expect } from 'vitest'
import {
  getPocketColor,
  WHEEL_SEQUENCE,
  RED_NUMBERS,
  PAYOUT_MAP,
} from './types'

describe('getPocketColor', () => {
  it('returns green for 0', () => {
    expect(getPocketColor(0)).toBe('green')
  })

  it('returns red for red numbers', () => {
    const reds = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
    for (const n of reds) {
      expect(getPocketColor(n)).toBe('red')
    }
  })

  it('returns black for non-red, non-zero numbers', () => {
    const blacks = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]
    for (const n of blacks) {
      expect(getPocketColor(n)).toBe('black')
    }
  })
})

describe('WHEEL_SEQUENCE', () => {
  it('has 37 elements', () => {
    expect(WHEEL_SEQUENCE).toHaveLength(37)
  })

  it('contains all numbers from 0 to 36', () => {
    const sorted = [...WHEEL_SEQUENCE].sort((a, b) => a - b)
    const expected = Array.from({ length: 37 }, (_, i) => i)
    expect(sorted).toEqual(expected)
  })

  it('starts with 0', () => {
    expect(WHEEL_SEQUENCE[0]).toBe(0)
  })
})

describe('RED_NUMBERS', () => {
  it('contains exactly 18 red numbers', () => {
    expect(RED_NUMBERS.size).toBe(18)
  })

  it('contains the correct red numbers', () => {
    const expected = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
    for (const n of expected) {
      expect(RED_NUMBERS.has(n)).toBe(true)
    }
  })

  it('does not contain 0', () => {
    expect(RED_NUMBERS.has(0)).toBe(false)
  })

  it('does not contain black numbers', () => {
    const blacks = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]
    for (const n of blacks) {
      expect(RED_NUMBERS.has(n)).toBe(false)
    }
  })
})

describe('PAYOUT_MAP', () => {
  it('has correct payout for straight (35:1)', () => {
    expect(PAYOUT_MAP.straight).toBe(35)
  })

  it('has correct payout for split (17:1)', () => {
    expect(PAYOUT_MAP.split).toBe(17)
  })

  it('has correct payout for street (11:1)', () => {
    expect(PAYOUT_MAP.street).toBe(11)
  })

  it('has correct payout for corner (8:1)', () => {
    expect(PAYOUT_MAP.corner).toBe(8)
  })

  it('has correct payout for sixline (5:1)', () => {
    expect(PAYOUT_MAP.sixline).toBe(5)
  })

  it('has correct payout for column (2:1)', () => {
    expect(PAYOUT_MAP.column).toBe(2)
  })

  it('has correct payout for dozen (2:1)', () => {
    expect(PAYOUT_MAP.dozen).toBe(2)
  })

  it('has correct payout for red (1:1)', () => {
    expect(PAYOUT_MAP.red).toBe(1)
  })

  it('has correct payout for black (1:1)', () => {
    expect(PAYOUT_MAP.black).toBe(1)
  })

  it('has correct payout for odd (1:1)', () => {
    expect(PAYOUT_MAP.odd).toBe(1)
  })

  it('has correct payout for even (1:1)', () => {
    expect(PAYOUT_MAP.even).toBe(1)
  })

  it('has correct payout for low (1:1)', () => {
    expect(PAYOUT_MAP.low).toBe(1)
  })

  it('has correct payout for high (1:1)', () => {
    expect(PAYOUT_MAP.high).toBe(1)
  })

  it('covers all 13 bet types', () => {
    expect(Object.keys(PAYOUT_MAP)).toHaveLength(13)
  })
})
