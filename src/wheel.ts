import { WHEEL_SEQUENCE, getPocketColor } from './types'

const POCKET_COUNT = 37
const POCKET_ARC = (Math.PI * 2) / POCKET_COUNT

export type WheelState = {
  angle: number
  ballAngle: number
  spinning: boolean
  targetPocket: number | null
}

export function createWheel(canvas: HTMLCanvasElement): {
  state: WheelState
  draw: () => void
  spin: (targetNumber: number) => Promise<number>
} {
  const ctx = canvas.getContext('2d')!
  const cx = canvas.width / 2
  const cy = canvas.height / 2
  const outerR = Math.min(cx, cy) - 10
  const innerR = outerR * 0.65
  const ballR = outerR * 0.85
  const ballSize = 6

  let rafId: number | null = null

  const state: WheelState = {
    angle: 0,
    ballAngle: 0,
    spinning: false,
    targetPocket: null,
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Outer ring
    ctx.beginPath()
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
    ctx.fillStyle = '#2a1a0a'
    ctx.fill()

    // Draw pockets
    for (let i = 0; i < POCKET_COUNT; i++) {
      const startAngle = state.angle + i * POCKET_ARC - POCKET_ARC / 2
      const endAngle = startAngle + POCKET_ARC

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, outerR - 2, startAngle, endAngle)
      ctx.closePath()

      const num = WHEEL_SEQUENCE[i]!
      const color = getPocketColor(num)
      ctx.fillStyle = color === 'red' ? '#c0392b' : color === 'black' ? '#1a1a2e' : '#27ae60'
      ctx.fill()

      ctx.strokeStyle = '#d4a34a'
      ctx.lineWidth = 0.5
      ctx.stroke()

      // Number text
      const textAngle = startAngle + POCKET_ARC / 2
      const textR = outerR * 0.82
      ctx.save()
      ctx.translate(
        cx + Math.cos(textAngle) * textR,
        cy + Math.sin(textAngle) * textR,
      )
      ctx.rotate(textAngle + Math.PI / 2)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 11px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(num), 0, 0)
      ctx.restore()
    }

    // Inner circle (hub)
    ctx.beginPath()
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
    ctx.fillStyle = '#1a3a1a'
    ctx.fill()
    ctx.strokeStyle = '#d4a34a'
    ctx.lineWidth = 3
    ctx.stroke()

    // Decorative inner pattern
    ctx.beginPath()
    ctx.arc(cx, cy, innerR * 0.6, 0, Math.PI * 2)
    ctx.fillStyle = '#2a5a2a'
    ctx.fill()
    ctx.strokeStyle = '#d4a34a'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Ball
    if (state.spinning || state.targetPocket !== null) {
      const bx = cx + Math.cos(state.ballAngle) * ballR
      const by = cy + Math.sin(state.ballAngle) * ballR

      ctx.beginPath()
      ctx.arc(bx, by, ballSize, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()

      // Ball shine
      ctx.beginPath()
      ctx.arc(bx - 1.5, by - 1.5, ballSize * 0.4, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.fill()
    }

    // Marker triangle at top
    ctx.beginPath()
    ctx.moveTo(cx, cy - outerR - 8)
    ctx.lineTo(cx - 8, cy - outerR + 6)
    ctx.lineTo(cx + 8, cy - outerR + 6)
    ctx.closePath()
    ctx.fillStyle = '#d4a34a'
    ctx.fill()
  }

  function spin(targetNumber: number): Promise<number> {
    // Cancel any in-progress animation
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }

    // Guard against double-call while spinning
    if (state.spinning) {
      state.spinning = false
    }

    return new Promise((resolve) => {
      state.spinning = true
      state.targetPocket = targetNumber

      const targetIndex = WHEEL_SEQUENCE.indexOf(targetNumber)
      // Target angle: the pocket should be at the top (negative Y = -PI/2)
      const targetPocketAngle = -Math.PI / 2 - targetIndex * POCKET_ARC

      // Wheel spins multiple full rotations + lands on target
      const totalWheelSpin = Math.PI * 2 * (5 + Math.random() * 3)
      const wheelStart = state.angle
      const wheelEnd = wheelStart + totalWheelSpin +
        (targetPocketAngle - ((wheelStart + totalWheelSpin) % (Math.PI * 2)) + Math.PI * 4) % (Math.PI * 2)

      // Ball spins opposite direction
      const ballStart = state.ballAngle
      const totalBallSpin = -Math.PI * 2 * (8 + Math.random() * 4)
      const ballEnd = -Math.PI / 2 // Ball lands at top

      const duration = 4000 + Math.random() * 1000
      const startTime = performance.now()

      function animate(now: number) {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Ease-out cubic for deceleration
        const ease = 1 - Math.pow(1 - progress, 3)

        state.angle = wheelStart + (wheelEnd - wheelStart) * ease
        state.ballAngle = ballStart + (totalBallSpin + (ballEnd - ballStart - totalBallSpin)) * ease

        draw()

        if (progress < 1) {
          rafId = requestAnimationFrame(animate)
        } else {
          rafId = null
          state.spinning = false
          resolve(targetNumber)
        }
      }

      rafId = requestAnimationFrame(animate)
    })
  }

  // Initial draw
  draw()

  return { state, draw, spin }
}
