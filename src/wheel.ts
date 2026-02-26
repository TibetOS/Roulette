import { WHEEL_SEQUENCE, getPocketColor } from './types'

const POCKET_COUNT = 37
const POCKET_ARC = (Math.PI * 2) / POCKET_COUNT

// Geometry constants (CSS pixels)
const CANVAS_PADDING = 10
const INNER_RADIUS_RATIO = 0.65
const BALL_RADIUS_RATIO = 0.85
const TEXT_RADIUS_RATIO = 0.82
const INNER_PATTERN_RATIO = 0.6
const BALL_SIZE = 6
const BALL_SHINE_OFFSET = 1.5
const BALL_SHINE_SIZE_RATIO = 0.4
const MARKER_OVERSHOOT = 8
const MARKER_HALF_WIDTH = 8
const MARKER_HEIGHT = 6

// Animation constants
const MIN_WHEEL_ROTATIONS = 5
const EXTRA_ROTATION_RANGE = 3
const MIN_BALL_SPINS = 8
const EXTRA_BALL_SPIN_RANGE = 4
const MIN_DURATION_MS = 4000
const EXTRA_DURATION_RANGE_MS = 1500

// Ball bounce constants (#29)
const BOUNCE_DURATION_MS = 600
const BOUNCE_COUNT = 4
const BOUNCE_AMPLITUDE = POCKET_ARC * 0.4

// Colors
const COLOR_RED = '#c0392b'
const COLOR_BLACK = '#1a1a2e'
const COLOR_GREEN = '#27ae60'
const COLOR_GOLD = '#d4a34a'
const COLOR_WOOD = '#2a1a0a'
const COLOR_FELT_MID = '#1a3a1a'
const COLOR_FELT_LIGHT = '#2a5a2a'
const COLOR_WHITE = '#fff'
const COLOR_BALL_SHINE = 'rgba(255,255,255,0.6)'

export type WheelState = {
  angle: number
  ballAngle: number
  spinning: boolean
  targetPocket: number | null
}

export function createWheel(canvas: HTMLCanvasElement): {
  draw: () => void
  spin: (targetNumber: number) => Promise<number>
} {
  // HiDPI / Retina scaling (#8)
  const dpr = window.devicePixelRatio || 1
  const cssWidth = canvas.clientWidth || canvas.width
  const cssHeight = canvas.clientHeight || canvas.height
  canvas.width = cssWidth * dpr
  canvas.height = cssHeight * dpr
  canvas.style.width = cssWidth + 'px'
  canvas.style.height = cssHeight + 'px'

  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  // All drawing uses CSS pixel coordinates
  const cx = cssWidth / 2
  const cy = cssHeight / 2
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

  // Off-screen canvas for static hub and marker (#19)
  const staticCanvas = document.createElement('canvas')
  staticCanvas.width = canvas.width
  staticCanvas.height = canvas.height
  const staticCtx = staticCanvas.getContext('2d')!
  staticCtx.scale(dpr, dpr)

  function renderStaticParts() {
    staticCtx.clearRect(0, 0, cssWidth, cssHeight)

    // Inner circle (hub)
    staticCtx.beginPath()
    staticCtx.arc(cx, cy, innerR, 0, Math.PI * 2)
    staticCtx.fillStyle = COLOR_FELT_MID
    staticCtx.fill()
    staticCtx.strokeStyle = COLOR_GOLD
    staticCtx.lineWidth = 3
    staticCtx.stroke()

    // Decorative inner pattern
    staticCtx.beginPath()
    staticCtx.arc(cx, cy, innerR * INNER_PATTERN_RATIO, 0, Math.PI * 2)
    staticCtx.fillStyle = COLOR_FELT_LIGHT
    staticCtx.fill()
    staticCtx.strokeStyle = COLOR_GOLD
    staticCtx.lineWidth = 1.5
    staticCtx.stroke()

    // Marker triangle at top
    staticCtx.beginPath()
    staticCtx.moveTo(cx, cy - outerR - MARKER_OVERSHOOT)
    staticCtx.lineTo(cx - MARKER_HALF_WIDTH, cy - outerR + MARKER_HEIGHT)
    staticCtx.lineTo(cx + MARKER_HALF_WIDTH, cy - outerR + MARKER_HEIGHT)
    staticCtx.closePath()
    staticCtx.fillStyle = COLOR_GOLD
    staticCtx.fill()
  }

  renderStaticParts()

  function draw() {
    ctx.clearRect(0, 0, cssWidth, cssHeight)

    // Outer ring background
    ctx.beginPath()
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
    ctx.fillStyle = COLOR_WOOD
    ctx.fill()

    // Draw pockets (rotates each frame)
    for (let i = 0; i < POCKET_COUNT; i++) {
      const startAngle = state.angle + i * POCKET_ARC - POCKET_ARC / 2
      const endAngle = startAngle + POCKET_ARC

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, outerR - 2, startAngle, endAngle)
      ctx.closePath()

      const num = WHEEL_SEQUENCE[i]!
      const color = getPocketColor(num)
      ctx.fillStyle = color === 'red' ? COLOR_RED : color === 'black' ? COLOR_BLACK : COLOR_GREEN
      ctx.fill()

      ctx.strokeStyle = COLOR_GOLD
      ctx.lineWidth = 0.5
      ctx.stroke()

      // Number text
      const textAngle = startAngle + POCKET_ARC / 2
      ctx.save()
      ctx.translate(
        cx + Math.cos(textAngle) * textR,
        cy + Math.sin(textAngle) * textR,
      )
      ctx.rotate(textAngle + Math.PI / 2)
      ctx.fillStyle = COLOR_WHITE
      ctx.font = 'bold 11px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(num), 0, 0)
      ctx.restore()
    }

    // Composite static hub and marker from off-screen canvas (#19)
    ctx.drawImage(staticCanvas, 0, 0, cssWidth, cssHeight)

    // Ball
    if (state.spinning || state.targetPocket !== null) {
      const bx = cx + Math.cos(state.ballAngle) * ballR
      const by = cy + Math.sin(state.ballAngle) * ballR

      ctx.beginPath()
      ctx.arc(bx, by, BALL_SIZE, 0, Math.PI * 2)
      ctx.fillStyle = COLOR_WHITE
      ctx.fill()

      // Ball shine
      ctx.beginPath()
      ctx.arc(
        bx - BALL_SHINE_OFFSET,
        by - BALL_SHINE_OFFSET,
        BALL_SIZE * BALL_SHINE_SIZE_RATIO,
        0,
        Math.PI * 2,
      )
      ctx.fillStyle = COLOR_BALL_SHINE
      ctx.fill()
    }
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

    if (state.spinning) {
      state.spinning = false
    }

    return new Promise((resolve) => {
      state.spinning = true
      state.targetPocket = targetNumber

      const targetIndex = WHEEL_SEQUENCE.indexOf(targetNumber)
      const targetPocketAngle = -Math.PI / 2 - targetIndex * POCKET_ARC

      // Reduced motion: skip animation
      if (prefersReducedMotion()) {
        state.angle = targetPocketAngle
        state.ballAngle = -Math.PI / 2
        state.spinning = false
        draw()
        resolve(targetNumber)
        return
      }

      // Varied spin parameters (#29)
      const totalWheelSpin = Math.PI * 2 * (MIN_WHEEL_ROTATIONS + Math.random() * EXTRA_ROTATION_RANGE)
      const wheelStart = state.angle
      const wheelEnd = wheelStart + totalWheelSpin +
        (targetPocketAngle - ((wheelStart + totalWheelSpin) % (Math.PI * 2)) + Math.PI * 4) % (Math.PI * 2)

      const ballStart = state.ballAngle
      const totalBallSpin = -Math.PI * 2 * (MIN_BALL_SPINS + Math.random() * EXTRA_BALL_SPIN_RANGE)
      const ballEnd = -Math.PI / 2

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
          // Transition to ball bounce phase (#29)
          rafId = requestAnimationFrame(bounce)
        }
      }

      // Ball bounce oscillation after main spin settles (#29)
      const spinEndTime = startTime + duration
      function bounce(now: number) {
        const bounceElapsed = now - spinEndTime
        const bounceProgress = Math.min(bounceElapsed / BOUNCE_DURATION_MS, 1)

        // Damped oscillation: amplitude decays while oscillating
        const decay = 1 - bounceProgress
        const oscillation = Math.sin(bounceProgress * BOUNCE_COUNT * Math.PI * 2)
        state.ballAngle = ballEnd + oscillation * decay * BOUNCE_AMPLITUDE

        draw()

        if (bounceProgress < 1) {
          rafId = requestAnimationFrame(bounce)
        } else {
          rafId = null
          state.ballAngle = ballEnd
          state.spinning = false
          draw()
          resolve(targetNumber)
        }
      }

      rafId = requestAnimationFrame(animate)
    })
  }

  // Initial draw
  draw()

  return { draw, spin }
}
