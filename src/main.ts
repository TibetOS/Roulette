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
  isBankrupt,
  repeatBets,
  undoLastBet,
} from './game'
import { CHIP_VALUES, getPocketColor } from './types'
import { saveBalance, loadBalance, clearSavedBalance } from './storage'

let state = createGameState(loadBalance())

// DOM refs
const balanceEl = document.getElementById('balance')!
const totalBetEl = document.getElementById('total-bet')!
const spinBtn = document.getElementById('spin-btn') as HTMLButtonElement
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement
const repeatBtn = document.getElementById('repeat-btn') as HTMLButtonElement
const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement
const newGameBtn = document.getElementById('new-game-btn') as HTMLButtonElement
const chipSelector = document.getElementById('chip-selector')!
const resultDisplay = document.getElementById('result-display')!
const winDisplay = document.getElementById('win-display')!
const wheelCanvas = document.getElementById('wheel-canvas') as HTMLCanvasElement
const boardContainer = document.getElementById('board-container')!
const gameOverOverlay = document.getElementById('game-over-overlay')!
const restartBtn = document.getElementById('restart-btn') as HTMLButtonElement
const colorblindToggle = document.getElementById('colorblind-toggle') as HTMLButtonElement

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
    chip.setAttribute('aria-label', `Select $${value} chip`)
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

  const isBetting = state.phase === 'betting'
  const bankrupt = isBankrupt(state)

  spinBtn.disabled = state.bets.length === 0 || !isBetting || bankrupt
  clearBtn.disabled = !isBetting || bankrupt
  repeatBtn.disabled = !isBetting || state.lastBets.length === 0 || bankrupt
  undoBtn.disabled = !isBetting || state.bets.length === 0 || bankrupt

  board.updateChips(state.bets)

  // Show/hide game over overlay
  gameOverOverlay.classList.toggle('hidden', !bankrupt)
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
  saveBalance(state.balance)

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

  // Check bankruptcy after showing result
  if (isBankrupt(state)) return

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

// Repeat handler
repeatBtn.addEventListener('click', () => {
  if (repeatBets(state)) {
    updateUI()
  }
})

// Undo handler
undoBtn.addEventListener('click', () => {
  if (undoLastBet(state)) {
    updateUI()
  }
})

// New game handler
function resetGame() {
  clearSavedBalance()
  state = createGameState()
  resultDisplay.classList.add('hidden')
  winDisplay.classList.add('hidden')
  updateUI()
}

newGameBtn.addEventListener('click', resetGame)
restartBtn.addEventListener('click', resetGame)

// Colorblind mode
function initColorblindMode() {
  const saved = localStorage.getItem('roulette-colorblind') === 'true'
  if (saved) {
    boardContainer.classList.add('colorblind-mode')
    colorblindToggle.classList.add('active')
  }
}

colorblindToggle.addEventListener('click', () => {
  const isActive = boardContainer.classList.toggle('colorblind-mode')
  colorblindToggle.classList.toggle('active', isActive)
  localStorage.setItem('roulette-colorblind', String(isActive))
})

// Init
buildChipSelector()
initColorblindMode()
updateUI()
