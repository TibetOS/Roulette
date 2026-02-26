import { type Bet } from './types'

export type FeedbackManager = {
  highlightResult: (result: number, bets: Bet[], boardEl: HTMLElement) => void
  animateBalance: (el: HTMLElement, from: number, to: number) => void
  showConfetti: (container: HTMLElement) => void
}

export function createFeedbackManager(): FeedbackManager {
  function highlightResult(
    result: number,
    bets: Bet[],
    boardEl: HTMLElement,
  ): void {
    // Flash the winning number cell green
    const winCell = boardEl.querySelector(`[data-num="${result}"]`) as HTMLElement | null
    if (winCell) {
      winCell.classList.add('cell-win-flash')
      setTimeout(() => winCell.classList.remove('cell-win-flash'), 2000)
    }

    if (result === 0) {
      const zeroCell = boardEl.querySelector('.zero-cell') as HTMLElement | null
      if (zeroCell) {
        zeroCell.classList.add('cell-win-flash')
        setTimeout(() => zeroCell.classList.remove('cell-win-flash'), 2000)
      }
    }

    // Flash losing straight bet cells red
    for (const bet of bets) {
      if (bet.type === 'straight' && !bet.numbers.includes(result)) {
        const num = bet.numbers[0]
        const selector = num === 0 ? '.zero-cell' : `[data-num="${num}"]`
        const cell = boardEl.querySelector(selector) as HTMLElement | null
        if (cell) {
          cell.classList.add('cell-lose-flash')
          setTimeout(() => cell.classList.remove('cell-lose-flash'), 1500)
        }
      }
    }
  }

  function animateBalance(el: HTMLElement, from: number, to: number): void {
    if (from === to) return

    const duration = 800
    const start = performance.now()
    const direction = to > from ? 'balance-up' : 'balance-down'
    el.classList.add(direction)

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - (1 - progress) * (1 - progress)
      const current = Math.round(from + (to - from) * ease)
      el.textContent = String(current)

      if (progress < 1) {
        requestAnimationFrame(tick)
      } else {
        el.textContent = String(to)
        el.classList.remove(direction)
      }
    }

    requestAnimationFrame(tick)
  }

  function showConfetti(container: HTMLElement): void {
    const canvas = document.createElement('canvas')
    canvas.className = 'confetti-canvas'
    canvas.width = container.clientWidth || 800
    canvas.height = container.clientHeight || 600
    container.appendChild(canvas)

    const ctx = canvas.getContext('2d')!

    type Particle = {
      x: number; y: number; vx: number; vy: number
      color: string; size: number; rotation: number; rotSpeed: number
    }

    const particles: Particle[] = []
    const colors = ['#d4a34a', '#c0392b', '#2ecc71', '#3498db', '#e74c3c', '#f39c12']

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height / 3,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 10 - 3,
        color: colors[Math.floor(Math.random() * colors.length)]!,
        size: Math.random() * 6 + 3,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
      })
    }

    const startTime = performance.now()
    const duration = 2500

    function animate(now: number) {
      const elapsed = now - startTime
      if (elapsed > duration) {
        canvas.remove()
        return
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const life = Math.max(0, 1 - elapsed / duration)

      for (const p of particles) {
        p.x += p.vx
        p.vy += 0.25
        p.y += p.vy
        p.rotation += p.rotSpeed

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.globalAlpha = life
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        ctx.restore()
      }

      requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
  }

  return { highlightResult, animateBalance, showConfetti }
}
