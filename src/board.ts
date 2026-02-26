import { type Bet, type BetType, getPocketColor } from './types'

type BetPlacement = Omit<Bet, 'amount'>

type BoardCallback = (bet: BetPlacement) => void

// Standard 3-column roulette layout: row 0 = [3,6,9,...,36], row 1 = [2,5,8,...,35], row 2 = [1,4,7,...,34]
const ROWS = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
]

export function createBoard(
  container: HTMLElement,
  onBet: BoardCallback,
): { updateChips: (bets: Bet[]) => void } {
  // Clear container safely using DOM methods
  while (container.firstChild) {
    container.removeChild(container.firstChild)
  }

  const table = document.createElement('div')
  table.className = 'board'

  // Zero cell
  const zeroCell = makeCell('0', 'green', () =>
    onBet({ type: 'straight', numbers: [0] }),
  )
  zeroCell.className += ' zero-cell'
  table.appendChild(zeroCell)

  // Number grid
  const grid = document.createElement('div')
  grid.className = 'number-grid'

  for (const row of ROWS) {
    for (const num of row) {
      const color = getPocketColor(num)
      const cell = makeCell(String(num), color, () =>
        onBet({ type: 'straight', numbers: [num] }),
      )
      cell.dataset['num'] = String(num)
      grid.appendChild(cell)
    }
  }
  table.appendChild(grid)

  // Column bets (2:1)
  const colBets = document.createElement('div')
  colBets.className = 'column-bets'
  for (let r = 0; r < 3; r++) {
    const row = ROWS[r]!
    const cell = makeCell('2:1', 'col-bet', () =>
      onBet({ type: 'column', numbers: [...row] }),
    )
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
  for (const d of dozens) {
    const cell = makeCell(d.label, 'dozen-bet', () =>
      onBet({ type: 'dozen', numbers: d.numbers }),
    )
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
    const cell = makeCell(ob.label, colorClass, () =>
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
        const cell = num === 0
          ? table.querySelector('.zero-cell')
          : grid.querySelector(`[data-num="${num}"]`)
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
  onClick: () => void,
): HTMLElement {
  const cell = document.createElement('div')
  cell.className = `cell ${colorClass}`
  cell.textContent = text
  cell.addEventListener('click', onClick)
  return cell
}

function addChipIndicator(cell: HTMLElement, amount: number): void {
  const chip = document.createElement('div')
  chip.className = 'chip-indicator'
  chip.textContent = String(amount)
  cell.appendChild(chip)
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
    case 'column': return text === '2:1'
    case 'dozen': return text.includes('12')
    default: return false
  }
}
