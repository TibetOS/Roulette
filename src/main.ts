import './style.css'
import { createWheel } from './wheel'
import { createBoard } from './board'
import {
  createGameState,
  placeBet,
  clearBets,
  getTotalBet,
  generateResult,
  resolveBets,
} from './game'
import { CHIP_VALUES, getPocketColor } from './types'

const state = createGameState()

// DOM refs
const balanceEl = document.getElementById('balance')!
const totalBetEl = document.getElementById('total-bet')!
const spinBtn = document.getElementById('spin-btn') as HTMLButtonElement
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement
const chipSelector = document.getElementById('chip-selector')!
const resultDisplay = document.getElementById('result-display')!
const winDisplay = document.getElementById('win-display')!
const wheelCanvas = document.getElementById('wheel-canvas') as HTMLCanvasElement
const boardContainer = document.getElementById('board-container')!

// Wheel
const wheel = createWheel(wheelCanvas)

// Board
const board = createBoard(boardContainer, (bet) => {
  if (state.phase !== 'betting') return
  if (placeBet(state, bet)) {
    updateUI()
  }
})

// Chip selector
function buildChipSelector() {
  for (const value of CHIP_VALUES) {
    const chip = document.createElement('button')
    chip.className = `chip chip-${value}`
    chip.textContent = String(value)
    chip.addEventListener('click', () => {
      state.selectedChip = value
      updateChipSelection()
    })
    chipSelector.appendChild(chip)
  }
  updateChipSelection()
}

function updateChipSelection() {
  const chips = chipSelector.querySelectorAll('.chip')
  chips.forEach((chip) => {
    const el = chip as HTMLElement
    el.classList.toggle('selected', el.textContent === String(state.selectedChip))
  })
}

// UI update
function updateUI() {
  balanceEl.textContent = String(state.balance)
  totalBetEl.textContent = String(getTotalBet(state))
  spinBtn.disabled = state.bets.length === 0 || state.phase !== 'betting'
  clearBtn.disabled = state.phase !== 'betting'
  board.updateChips(state.bets)
}

// Spin handler
spinBtn.addEventListener('click', async () => {
  if (state.phase !== 'betting' || state.bets.length === 0) return

  state.phase = 'spinning'
  updateUI()
  resultDisplay.classList.add('hidden')
  winDisplay.classList.add('hidden')

  const result = generateResult()
  await wheel.spin(result)

  const winAmount = resolveBets(state, result)

  // Show result
  const color = getPocketColor(result)
  resultDisplay.textContent = String(result)
  resultDisplay.className = `result-badge ${color}`
  resultDisplay.classList.remove('hidden')

  // Show win/loss
  if (winAmount > 0) {
    winDisplay.textContent = `WIN +${winAmount}!`
    winDisplay.className = 'win-message'
  } else {
    winDisplay.textContent = 'No win'
    winDisplay.className = 'lose-message'
  }
  winDisplay.classList.remove('hidden')

  state.phase = 'result'
  state.bets = []
  updateUI()

  // Auto-return to betting after delay
  setTimeout(() => {
    state.phase = 'betting'
    winDisplay.classList.add('hidden')
    updateUI()
  }, 2500)
})

// Clear handler
clearBtn.addEventListener('click', () => {
  clearBets(state)
  updateUI()
})

// Init
buildChipSelector()
updateUI()
