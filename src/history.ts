import { type Bet, getPocketColor } from './types'

const STORAGE_KEY = 'roulette-history'
const MAX_ENTRIES = 20

type HistoryEntry = {
  result: number
  totalBet: number
  winAmount: number
}

export type HistoryManager = {
  addEntry: (result: number, bets: Bet[], winAmount: number) => void
  clear: () => void
  render: () => void
}

export function createHistoryManager(container: HTMLElement): HistoryManager {
  let entries: HistoryEntry[] = loadHistory()

  function addEntry(result: number, bets: Bet[], winAmount: number): void {
    const totalBet = bets.reduce((sum, b) => sum + b.amount, 0)
    entries.unshift({ result, totalBet, winAmount })
    if (entries.length > MAX_ENTRIES) entries.pop()
    saveHistory(entries)
    render()
  }

  function clear(): void {
    entries = []
    saveHistory(entries)
    render()
  }

  function render(): void {
    while (container.firstChild) container.removeChild(container.firstChild)

    const header = document.createElement('div')
    header.className = 'history-header'

    const title = document.createElement('button')
    title.className = 'history-toggle'
    title.textContent = 'History'
    title.setAttribute('aria-expanded', 'true')

    const clearBtn = document.createElement('button')
    clearBtn.className = 'history-clear-btn'
    clearBtn.textContent = 'Clear'
    clearBtn.addEventListener('click', clear)

    header.appendChild(title)
    header.appendChild(clearBtn)
    container.appendChild(header)

    const content = document.createElement('div')
    content.className = 'history-content'

    title.addEventListener('click', () => {
      const collapsed = content.classList.toggle('collapsed')
      title.setAttribute('aria-expanded', String(!collapsed))
    })

    // Results strip (dots)
    const strip = document.createElement('div')
    strip.className = 'results-strip'
    for (const entry of entries) {
      const dot = document.createElement('span')
      const color = getPocketColor(entry.result)
      dot.className = `result-dot ${color}`
      dot.textContent = String(entry.result)
      strip.appendChild(dot)
    }
    content.appendChild(strip)

    // Detailed list
    const list = document.createElement('div')
    list.className = 'history-list'

    if (entries.length === 0) {
      const empty = document.createElement('span')
      empty.className = 'history-empty'
      empty.textContent = 'No spins yet'
      list.appendChild(empty)
    } else {
      for (const entry of entries) {
        const row = document.createElement('div')
        row.className = 'history-entry'

        const dot = document.createElement('span')
        const color = getPocketColor(entry.result)
        dot.className = `result-dot ${color}`
        dot.textContent = String(entry.result)

        const info = document.createElement('span')
        info.className = 'history-bet-info'
        info.textContent = `Bet: $${entry.totalBet}`

        const net = document.createElement('span')
        const netAmount = entry.winAmount - entry.totalBet
        net.className = netAmount >= 0 ? 'history-net-win' : 'history-net-loss'
        net.textContent = `${netAmount >= 0 ? '+' : ''}$${netAmount}`

        row.appendChild(dot)
        row.appendChild(info)
        row.appendChild(net)
        list.appendChild(row)
      }
    }

    content.appendChild(list)
    container.appendChild(content)
  }

  render()

  return { addEntry, clear, render }
}

function loadHistory(): HistoryEntry[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as HistoryEntry[]
  } catch {
    return []
  }
}

function saveHistory(entries: HistoryEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}
