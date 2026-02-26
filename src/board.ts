import { type Bet, type BetType, DOUBLE_ZERO, getPocketColor } from './types'

type BetPlacement = Omit<Bet, 'amount'>

type BoardCallback = (bet: BetPlacement) => void

// Standard 3-column roulette layout: row 0 = [3,6,9,...,36], row 1 = [2,5,8,...,35], row 2 = [1,4,7,...,34]
const ROWS = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
]

const OUTSIDE_BET_LABELS: Record<string, string> = {
  low: 'Bet on 1-18',
  even: 'Bet on Even',
  red: 'Bet on Red',
  black: 'Bet on Black',
  odd: 'Bet on Odd',
  high: 'Bet on 19-36',
}

export function createBoard(
  container: HTMLElement,
  onBet: BoardCallback,
  american = false,
): { updateChips: (bets: Bet[]) => void } {
  // Clear container safely using DOM methods
  while (container.firstChild) {
    container.removeChild(container.firstChild)
  }

  const table = document.createElement('div')
  table.className = 'board'
  table.setAttribute('role', 'group')
  table.setAttribute('aria-label', 'Roulette betting board')

  // Zero cell(s)
  const zeroCell = makeCell('0', 'green', 'Bet on number 0', () =>
    onBet({ type: 'straight', numbers: [0] }),
  )
  zeroCell.className += ' zero-cell'
  table.appendChild(zeroCell)

  if (american) {
    const doubleZeroCell = makeCell('00', 'green', 'Bet on number 00', () =>
      onBet({ type: 'straight', numbers: [DOUBLE_ZERO] }),
    )
    doubleZeroCell.className += ' zero-cell double-zero-cell'
    doubleZeroCell.dataset['num'] = String(DOUBLE_ZERO)
    table.appendChild(doubleZeroCell)
  }

  // Number grid
  const grid = document.createElement('div')
  grid.className = 'number-grid'

  for (const row of ROWS) {
    for (const num of row) {
      const color = getPocketColor(num)
      const cell = makeCell(String(num), color, `Bet on number ${num}`, () =>
        onBet({ type: 'straight', numbers: [num] }),
      )
      cell.dataset['num'] = String(num)
      if (color === 'red' || color === 'black') {
        const cbLabel = document.createElement('span')
        cbLabel.className = 'cb-label'
        cbLabel.textContent = color === 'red' ? 'R' : 'B'
        cell.appendChild(cbLabel)
      }
      grid.appendChild(cell)
    }
  }
  buildAdvancedBetZones(grid, onBet)
  table.appendChild(grid)

  // Column bets (2:1)
  const colBets = document.createElement('div')
  colBets.className = 'column-bets'
  const colLabels = ['Bet on 3rd column', 'Bet on 2nd column', 'Bet on 1st column']
  for (let r = 0; r < 3; r++) {
    const row = ROWS[r]!
    const cell = makeCell('2:1', 'col-bet', colLabels[r]!, () =>
      onBet({ type: 'column', numbers: [...row] }),
    )
    cell.dataset['betType'] = 'column'
    cell.dataset['betKey'] = `col-${r}`
    colBets.appendChild(cell)
  }
  table.appendChild(colBets)

  // Dozen bets
  const dozenRow = document.createElement('div')
  dozenRow.className = 'dozen-row'
  const dozens = [
    { label: '1st 12', numbers: Array.from({ length: 12 }, (_, i) => i + 1) },
    { label: '2nd 12', numbers: Array.from({ length: 12 }, (_, i) => i + 13) },
    { label: '3rd 12', numbers: Array.from({ length: 12 }, (_, i) => i + 25) },
  ]
  for (let di = 0; di < dozens.length; di++) {
    const d = dozens[di]!
    const cell = makeCell(d.label, 'dozen-bet', `Bet on ${d.label}`, () =>
      onBet({ type: 'dozen', numbers: d.numbers }),
    )
    cell.dataset['betType'] = 'dozen'
    cell.dataset['betKey'] = `dozen-${di}`
    dozenRow.appendChild(cell)
  }
  table.appendChild(dozenRow)

  // Outside bets row
  const outsideRow = document.createElement('div')
  outsideRow.className = 'outside-row'

  const outsideBets: { label: string; type: BetType; numbers: number[] }[] = [
    { label: '1-18', type: 'low', numbers: Array.from({ length: 18 }, (_, i) => i + 1) },
    { label: 'EVEN', type: 'even', numbers: [] },
    { label: '\u25C6', type: 'red', numbers: [] },
    { label: '\u25C6', type: 'black', numbers: [] },
    { label: 'ODD', type: 'odd', numbers: [] },
    { label: '19-36', type: 'high', numbers: Array.from({ length: 18 }, (_, i) => i + 19) },
  ]

  for (const ob of outsideBets) {
    const colorClass = ob.type === 'red' ? 'red' : ob.type === 'black' ? 'black' : 'outside-bet'
    const cell = makeCell(ob.label, colorClass, OUTSIDE_BET_LABELS[ob.type] ?? ob.label, () =>
      onBet({ type: ob.type, numbers: ob.numbers }),
    )
    outsideRow.appendChild(cell)
  }
  table.appendChild(outsideRow)

  container.appendChild(table)

  function updateChips(bets: Bet[]) {
    // Clear existing chip indicators
    table.querySelectorAll('.chip-indicator').forEach((el) => el.remove())

    for (const bet of bets) {
      if (bet.type === 'straight') {
        const num = bet.numbers[0]
        let cell: Element | null
        if (num === 0) {
          cell = table.querySelector('.zero-cell:not(.double-zero-cell)')
        } else if (num === DOUBLE_ZERO) {
          cell = table.querySelector('.double-zero-cell')
        } else {
          cell = grid.querySelector(`[data-num="${num}"]`)
        }
        if (cell) addChipIndicator(cell as HTMLElement, bet.amount)
      }
      // For outside/column/dozen bets, find by text content match
      if (['column', 'dozen', 'red', 'black', 'odd', 'even', 'low', 'high'].includes(bet.type)) {
        const cells = table.querySelectorAll('.cell')
        for (const cell of cells) {
          const cellEl = cell as HTMLElement
          if (matchesBetCell(cellEl, bet)) {
            addChipIndicator(cellEl, bet.amount)
            break
          }
        }
      }
    }
  }

  return { updateChips }
}

function makeCell(
  text: string,
  colorClass: string,
  ariaLabel: string,
  onClick: () => void,
): HTMLElement {
  const cell = document.createElement('div')
  cell.className = `cell ${colorClass}`
  cell.textContent = text
  cell.setAttribute('role', 'button')
  cell.setAttribute('tabindex', '0')
  cell.setAttribute('aria-label', ariaLabel)
  cell.addEventListener('click', onClick)
  cell.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  })
  return cell
}

function addChipIndicator(cell: HTMLElement, amount: number): void {
  const chip = document.createElement('div')
  chip.className = 'chip-indicator'
  chip.textContent = String(amount)
  cell.appendChild(chip)
}

function buildAdvancedBetZones(grid: HTMLElement, onBet: BoardCallback): void {
  // Grid layout: 12 columns x 3 rows
  // Row 0 = [3,6,9,...,36], Row 1 = [2,5,8,...,35], Row 2 = [1,4,7,...,34]

  function numAt(row: number, col: number): number | undefined {
    return ROWS[row]?.[col]
  }

  function makeZone(
    type: BetType,
    numbers: number[],
    label: string,
    gridCol: string,
    gridRow: string,
  ): void {
    const zone = document.createElement('div')
    zone.className = 'bet-zone'
    zone.style.gridColumn = gridCol
    zone.style.gridRow = gridRow
    zone.setAttribute('role', 'button')
    zone.setAttribute('tabindex', '0')
    zone.setAttribute('aria-label', label)
    zone.title = label
    const handler = () => onBet({ type, numbers })
    zone.addEventListener('click', handler)
    zone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handler()
      }
    })
    grid.appendChild(zone)
  }

  // Street bets: 3 numbers in a column (e.g. 1,2,3 or 4,5,6)
  for (let c = 0; c < 12; c++) {
    const n0 = numAt(0, c)
    const n1 = numAt(1, c)
    const n2 = numAt(2, c)
    if (n0 !== undefined && n1 !== undefined && n2 !== undefined) {
      const nums = [n2, n1, n0].sort((a, b) => a - b)
      makeZone('street', nums, `Street bet: ${nums.join(', ')}`, `${c + 1}`, '3 / 4')
    }
  }

  // Horizontal splits: between rows (vertically adjacent numbers)
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 12; c++) {
      const top = numAt(r, c)
      const bottom = numAt(r + 1, c)
      if (top !== undefined && bottom !== undefined) {
        const nums = [top, bottom].sort((a, b) => a - b)
        makeZone('split', nums, `Split bet: ${nums.join(', ')}`, `${c + 1}`, `${r + 1} / ${r + 3}`)
      }
    }
  }

  // Vertical splits: between columns (horizontally adjacent numbers)
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 11; c++) {
      const left = numAt(r, c)
      const right = numAt(r, c + 1)
      if (left !== undefined && right !== undefined) {
        const nums = [left, right].sort((a, b) => a - b)
        makeZone('split', nums, `Split bet: ${nums.join(', ')}`, `${c + 1} / ${c + 3}`, `${r + 1}`)
      }
    }
  }

  // Corner bets: intersection of 4 numbers
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 11; c++) {
      const tl = numAt(r, c)
      const tr = numAt(r, c + 1)
      const bl = numAt(r + 1, c)
      const br = numAt(r + 1, c + 1)
      if (tl !== undefined && tr !== undefined && bl !== undefined && br !== undefined) {
        const nums = [tl, tr, bl, br].sort((a, b) => a - b)
        makeZone('corner', nums, `Corner bet: ${nums.join(', ')}`, `${c + 1} / ${c + 3}`, `${r + 1} / ${r + 3}`)
      }
    }
  }

  // Six-line bets: 2 adjacent streets (6 numbers)
  for (let c = 0; c < 11; c++) {
    const nums: number[] = []
    for (let r = 0; r < 3; r++) {
      const n1 = numAt(r, c)
      const n2 = numAt(r, c + 1)
      if (n1 !== undefined) nums.push(n1)
      if (n2 !== undefined) nums.push(n2)
    }
    if (nums.length === 6) {
      nums.sort((a, b) => a - b)
      makeZone('sixline', nums, `Six-line bet: ${nums.join(', ')}`, `${c + 1} / ${c + 3}`, '3 / 4')
    }
  }
}

function matchesBetCell(cell: HTMLElement, bet: Bet): boolean {
  const text = cell.textContent?.replace(/\d+$/, '').trim() ?? '' // strip chip text
  switch (bet.type) {
    case 'red': return text === '\u25C6' && cell.classList.contains('red')
    case 'black': return text === '\u25C6' && cell.classList.contains('black')
    case 'odd': return text === 'ODD'
    case 'even': return text === 'EVEN'
    case 'low': return text === '1-18'
    case 'high': return text === '19-36'
    case 'column': {
      if (cell.dataset['betType'] !== 'column') return false
      const colIndex = ROWS.findIndex((row) =>
        row.length === bet.numbers.length && row.every((n, i) => n === bet.numbers[i]),
      )
      return cell.dataset['betKey'] === `col-${colIndex}`
    }
    case 'dozen': {
      if (cell.dataset['betType'] !== 'dozen') return false
      const dozenIndex = bet.numbers[0] === 1 ? 0 : bet.numbers[0] === 13 ? 1 : 2
      return cell.dataset['betKey'] === `dozen-${dozenIndex}`
    }
    default: return false
  }
}
