import { type Bet, getPocketColor } from './types'

const STORAGE_KEY = 'roulette-stats'

export type GameStats = {
  totalRounds: number
  totalWagered: number
  totalWon: number
  wins: number
  losses: number
  currentStreak: number
  longestWinStreak: number
  longestLoseStreak: number
  numberBets: Record<string, number> // number -> times bet on
}

export type StatsManager = {
  stats: GameStats
  recordRound: (bets: Bet[], totalWin: number) => void
  clear: () => void
  render: () => void
}

export function createStatsManager(container: HTMLElement): StatsManager {
  const stats: GameStats = loadStats()

  function recordRound(bets: Bet[], totalWin: number): void {
    const totalBet = bets.reduce((sum, b) => sum + b.amount, 0)
    stats.totalRounds++
    stats.totalWagered += totalBet
    stats.totalWon += totalWin

    const isWin = totalWin > 0
    if (isWin) {
      stats.wins++
      if (stats.currentStreak >= 0) {
        stats.currentStreak++
      } else {
        stats.currentStreak = 1
      }
      stats.longestWinStreak = Math.max(stats.longestWinStreak, stats.currentStreak)
    } else {
      stats.losses++
      if (stats.currentStreak <= 0) {
        stats.currentStreak--
      } else {
        stats.currentStreak = -1
      }
      stats.longestLoseStreak = Math.max(
        stats.longestLoseStreak,
        Math.abs(stats.currentStreak),
      )
    }

    // Track which numbers are bet on most
    for (const bet of bets) {
      if (bet.type === 'straight') {
        const key = String(bet.numbers[0])
        stats.numberBets[key] = (stats.numberBets[key] ?? 0) + 1
      }
    }

    saveStats(stats)
    render()
  }

  function clear(): void {
    Object.assign(stats, defaultStats())
    saveStats(stats)
    render()
  }

  function getMostBetNumber(): { num: number; count: number } | null {
    let best: { num: number; count: number } | null = null
    for (const [key, count] of Object.entries(stats.numberBets)) {
      if (!best || count > best.count) {
        best = { num: Number(key), count }
      }
    }
    return best
  }

  function render(): void {
    while (container.firstChild) container.removeChild(container.firstChild)

    const header = document.createElement('div')
    header.className = 'stats-header'

    const title = document.createElement('button')
    title.className = 'stats-toggle'
    title.textContent = 'Statistics'
    title.setAttribute('aria-expanded', 'true')

    const clearBtn = document.createElement('button')
    clearBtn.className = 'stats-clear-btn'
    clearBtn.textContent = 'Reset'
    clearBtn.addEventListener('click', clear)

    header.appendChild(title)
    header.appendChild(clearBtn)
    container.appendChild(header)

    const content = document.createElement('div')
    content.className = 'stats-content'

    title.addEventListener('click', () => {
      const expanded = content.classList.toggle('collapsed')
      title.setAttribute('aria-expanded', String(!expanded))
    })

    const netProfit = stats.totalWon - stats.totalWagered
    const winRate = stats.totalRounds > 0
      ? ((stats.wins / stats.totalRounds) * 100).toFixed(1)
      : '0.0'

    const rows: { label: string; value: string; className?: string }[] = [
      { label: 'Total Rounds', value: String(stats.totalRounds) },
      { label: 'Total Wagered', value: `$${stats.totalWagered}` },
      { label: 'Total Won', value: `$${stats.totalWon}` },
      {
        label: 'Net Profit',
        value: `${netProfit >= 0 ? '+' : ''}$${netProfit}`,
        className: netProfit >= 0 ? 'stat-positive' : 'stat-negative',
      },
      { label: 'Win Rate', value: `${winRate}%` },
      { label: 'W/L Record', value: `${stats.wins}W / ${stats.losses}L` },
      { label: 'Best Win Streak', value: String(stats.longestWinStreak) },
      { label: 'Worst Lose Streak', value: String(stats.longestLoseStreak) },
    ]

    const mostBet = getMostBetNumber()
    if (mostBet) {
      const color = getPocketColor(mostBet.num)
      rows.push({
        label: 'Most Bet Number',
        value: `${mostBet.num} (${mostBet.count}x)`,
        className: `stat-color-${color}`,
      })
    }

    for (const row of rows) {
      const rowEl = document.createElement('div')
      rowEl.className = 'stat-row'

      const labelEl = document.createElement('span')
      labelEl.className = 'stat-label'
      labelEl.textContent = row.label

      const valueEl = document.createElement('span')
      valueEl.className = `stat-value ${row.className ?? ''}`
      valueEl.textContent = row.value

      rowEl.appendChild(labelEl)
      rowEl.appendChild(valueEl)
      content.appendChild(rowEl)
    }

    container.appendChild(content)
  }

  render()

  return { stats, recordRound, clear, render }
}

function defaultStats(): GameStats {
  return {
    totalRounds: 0,
    totalWagered: 0,
    totalWon: 0,
    wins: 0,
    losses: 0,
    currentStreak: 0,
    longestWinStreak: 0,
    longestLoseStreak: 0,
    numberBets: {},
  }
}

function loadStats(): GameStats {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return defaultStats()
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return defaultStats()
    return parsed as GameStats
  } catch {
    return defaultStats()
  }
}

function saveStats(stats: GameStats): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
}
