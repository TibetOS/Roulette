import './style.css'
import './ux-styles.css'
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
import { type Bet, CHIP_VALUES, getPocketColor } from './types'
import { saveBalance, loadBalance, clearSavedBalance } from './storage'
import { createSoundManager } from './sound'
import { createHistoryManager } from './history'
import { createFeedbackManager } from './feedback'
import { createStatsManager } from './stats'

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
const muteToggle = document.getElementById('mute-toggle') as HTMLButtonElement
const themeToggle = document.getElementById('theme-toggle') as HTMLButtonElement
const historyContainer = document.getElementById('history-container')!
const statsContainer = document.getElementById('stats-container')!

// UX managers
const sound = createSoundManager()
const history = createHistoryManager(historyContainer)
const feedback = createFeedbackManager()
const statsManager = createStatsManager(statsContainer)

// Wheel
const wheel = createWheel(wheelCanvas)

// Board
const board = createBoard(boardContainer, (bet) => {
  if (state.phase !== 'betting') return
  if (placeBet(state, bet)) {
    sound.play('chip')
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

// Mute toggle
function updateMuteButton() {
  muteToggle.textContent = sound.muted ? 'Sound: OFF' : 'Sound: ON'
  muteToggle.classList.toggle('active', !sound.muted)
}

muteToggle.addEventListener('click', () => {
  sound.toggle()
  updateMuteButton()
})

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

  const betsSnapshot: Bet[] = state.bets.map((b) => ({ ...b }))
  const balanceBefore = state.balance

  state.phase = 'spinning'
  updateUI()
  resultDisplay.classList.add('hidden')
  winDisplay.classList.add('hidden')

  sound.play('spin')

  const result = generateResult()
  await wheel.spin(result)

  sound.play('ballClatter')

  const winAmount = resolveBets(state, result)
  saveBalance(state.balance)

  // Feedback: highlight winning/losing cells
  feedback.highlightResult(result, betsSnapshot, boardContainer)

  // Feedback: animate balance change
  feedback.animateBalance(balanceEl, balanceBefore, state.balance)

  // Show result
  const color = getPocketColor(result)
  resultDisplay.textContent = String(result)
  resultDisplay.className = `result-badge ${color}`
  resultDisplay.classList.remove('hidden')

  // Determine if big win (straight bet win = 35:1 payout)
  const isBigWin = betsSnapshot.some(
    (b) => b.type === 'straight' && b.numbers.includes(result),
  )

  // Show win/loss
  if (winAmount > 0) {
    winDisplay.textContent = `WIN +${winAmount}!`
    winDisplay.className = 'win-message'
    if (isBigWin) {
      sound.play('bigWin')
      feedback.showConfetti(document.getElementById('app')!)
    } else {
      sound.play('win')
    }
  } else {
    winDisplay.textContent = 'No win'
    winDisplay.className = 'lose-message'
    sound.play('lose')
  }
  winDisplay.classList.remove('hidden')

  // Record to history and stats
  history.addEntry(result, betsSnapshot, winAmount)
  statsManager.recordRound(betsSnapshot, winAmount, result)

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
    sound.play('chip')
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
  history.clear()
  statsManager.clear()
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

// Dark/light theme toggle (#32)
function initTheme() {
  const saved = localStorage.getItem('roulette-theme')
  if (saved === 'light') {
    document.documentElement.classList.add('light-theme')
    themeToggle.textContent = 'DK'
  }
}

themeToggle.addEventListener('click', () => {
  const isLight = document.documentElement.classList.toggle('light-theme')
  localStorage.setItem('roulette-theme', isLight ? 'light' : 'dark')
  themeToggle.textContent = isLight ? 'DK' : 'LT'
})

// Keyboard shortcuts (#26)
const CHIP_KEY_MAP: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3 }

document.addEventListener('keydown', (e) => {
  const tag = (e.target as HTMLElement).tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return

  switch (e.key) {
    case ' ': {
      e.preventDefault()
      if (!spinBtn.disabled) spinBtn.click()
      break
    }
    case 'Escape': {
      if (!clearBtn.disabled) clearBtn.click()
      break
    }
    case 'r':
    case 'R': {
      if (!repeatBtn.disabled) repeatBtn.click()
      break
    }
    case 'z':
    case 'Z': {
      if (!undoBtn.disabled) undoBtn.click()
      break
    }
    default: {
      const chipIndex = CHIP_KEY_MAP[e.key]
      if (chipIndex !== undefined && CHIP_VALUES[chipIndex] !== undefined) {
        state.selectedChip = CHIP_VALUES[chipIndex]
        updateChipSelection()
      }
    }
  }
})

// Init
buildChipSelector()
initColorblindMode()
initTheme()
updateMuteButton()
updateUI()
