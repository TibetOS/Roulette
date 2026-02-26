import { WHEEL_SEQUENCE, getPocketColor } from './types'
import { COLORS } from './constants'

// Geometry
const POCKET_COUNT = 37
const POCKET_ARC = (Math.PI * 2) / POCKET_COUNT
const CANVAS_PADDING = 10
const INNER_RADIUS_RATIO = 0.65
const BALL_RADIUS_RATIO = 0.85
const TEXT_RADIUS_RATIO = 0.82
const INNER_PATTERN_RATIO = 0.6
const BALL_SIZE = 6
const BALL_SHINE_OFFSET = 1.5
const BALL_SHINE_RATIO = 0.4
const POCKET_INSET = 2

// Stroke widths
const POCKET_STROKE_WIDTH = 0.5
const HUB_STROKE_WIDTH = 3
const INNER_PATTERN_STROKE_WIDTH = 1.5

// Marker triangle
const MARKER_OVERSHOOT = 8
const MARKER_HALF_WIDTH = 8
const MARKER_HEIGHT = 6

// Number text
const NUMBER_FONT_SIZE = 11
const NUMBER_FONT = `bold ${NUMBER_FONT_SIZE}px Arial`

// Animation
const MIN_WHEEL_ROTATIONS = 5
const EXTRA_ROTATION_RANGE = 3
const MIN_BALL_SPINS = 8
const EXTRA_BALL_SPIN_RANGE = 4
const MIN_DURATION_MS = 4000
const EXTRA_DURATION_RANGE_MS = 1000

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
  const outerR = Math.min(cx, cy) - CANVAS_PADDING
  const innerR = outerR * INNER_RADIUS_RATIO
  const ballR = outerR * BALL_RADIUS_RATIO
  const textR = outerR * TEXT_RADIUS_RATIO

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
    ctx.fillStyle = COLORS.woodDark
    ctx.fill()

    // Draw pockets
    for (let i = 0; i < POCKET_COUNT; i++) {
      const startAngle = state.angle + i * POCKET_ARC - POCKET_ARC / 2
      const endAngle = startAngle + POCKET_ARC

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, outerR - POCKET_INSET, startAngle, endAngle)
      ctx.closePath()

      const num = WHEEL_SEQUENCE[i]!
      const color = getPocketColor(num)
      ctx.fillStyle = color === 'red' ? COLORS.red : color === 'black' ? COLORS.black : COLORS.green
      ctx.fill()

      ctx.strokeStyle = COLORS.gold
      ctx.lineWidth = POCKET_STROKE_WIDTH
      ctx.stroke()

      // Number text
      const textAngle = startAngle + POCKET_ARC / 2
      ctx.save()
      ctx.translate(
        cx + Math.cos(textAngle) * textR,
        cy + Math.sin(textAngle) * textR,
      )
      ctx.rotate(textAngle + Math.PI / 2)
      ctx.fillStyle = COLORS.white
      ctx.font = NUMBER_FONT
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(num), 0, 0)
      ctx.restore()
    }

    // Inner circle (hub)
    ctx.beginPath()
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
    ctx.fillStyle = COLORS.feltMid
    ctx.fill()
    ctx.strokeStyle = COLORS.gold
    ctx.lineWidth = HUB_STROKE_WIDTH
    ctx.stroke()

    // Decorative inner pattern
    ctx.beginPath()
    ctx.arc(cx, cy, innerR * INNER_PATTERN_RATIO, 0, Math.PI * 2)
    ctx.fillStyle = COLORS.feltLight
    ctx.fill()
    ctx.strokeStyle = COLORS.gold
    ctx.lineWidth = INNER_PATTERN_STROKE_WIDTH
    ctx.stroke()

    // Ball
    if (state.spinning || state.targetPocket !== null) {
      const bx = cx + Math.cos(state.ballAngle) * ballR
      const by = cy + Math.sin(state.ballAngle) * ballR

      ctx.beginPath()
      ctx.arc(bx, by, BALL_SIZE, 0, Math.PI * 2)
      ctx.fillStyle = COLORS.white
      ctx.fill()

      // Ball shine
      ctx.beginPath()
      ctx.arc(bx - BALL_SHINE_OFFSET, by - BALL_SHINE_OFFSET, BALL_SIZE * BALL_SHINE_RATIO, 0, Math.PI * 2)
      ctx.fillStyle = COLORS.ballShine
      ctx.fill()
    }

    // Marker triangle at top
    ctx.beginPath()
    ctx.moveTo(cx, cy - outerR - MARKER_OVERSHOOT)
    ctx.lineTo(cx - MARKER_HALF_WIDTH, cy - outerR + MARKER_HEIGHT)
    ctx.lineTo(cx + MARKER_HALF_WIDTH, cy - outerR + MARKER_HEIGHT)
    ctx.closePath()
    ctx.fillStyle = COLORS.gold
    ctx.fill()
  }

  function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
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

      // Reduced motion: skip animation, jump directly to result
      if (prefersReducedMotion()) {
        state.angle = targetPocketAngle
        state.ballAngle = -Math.PI / 2
        state.spinning = false
        draw()
        resolve(targetNumber)
        return
      }

      // Wheel spins multiple full rotations + lands on target
      const totalWheelSpin = Math.PI * 2 * (MIN_WHEEL_ROTATIONS + Math.random() * EXTRA_ROTATION_RANGE)
      const wheelStart = state.angle
      const wheelEnd = wheelStart + totalWheelSpin +
        (targetPocketAngle - ((wheelStart + totalWheelSpin) % (Math.PI * 2)) + Math.PI * 4) % (Math.PI * 2)

      // Ball spins opposite direction
      const ballStart = state.ballAngle
      const totalBallSpin = -Math.PI * 2 * (MIN_BALL_SPINS + Math.random() * EXTRA_BALL_SPIN_RANGE)
      const ballEnd = -Math.PI / 2 // Ball lands at top

      const duration = MIN_DURATION_MS + Math.random() * EXTRA_DURATION_RANGE_MS
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
