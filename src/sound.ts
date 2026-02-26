export type SoundName = 'chip' | 'spin' | 'ballClatter' | 'win' | 'lose' | 'bigWin'

export type SoundManager = {
  muted: boolean
  toggle: () => void
  play: (name: SoundName) => void
}

export function createSoundManager(): SoundManager {
  let ctx: AudioContext | null = null
  let muted = localStorage.getItem('roulette-muted') === 'true'

  // Respect prefers-reduced-motion
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  const prefersReduced = motionQuery.matches

  function getCtx(): AudioContext | null {
    if (prefersReduced) return null
    if (!ctx) {
      try {
        ctx = new AudioContext()
      } catch {
        return null
      }
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
    return ctx
  }

  function playChip(): void {
    const ac = getCtx()
    if (!ac) return
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1200, ac.currentTime + 0.05)
    gain.gain.setValueAtTime(0.15, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1)
    osc.start(ac.currentTime)
    osc.stop(ac.currentTime + 0.1)
  }

  function playSpin(): void {
    const ac = getCtx()
    if (!ac) return
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(150, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(60, ac.currentTime + 2)
    gain.gain.setValueAtTime(0.08, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 2)
    osc.start(ac.currentTime)
    osc.stop(ac.currentTime + 2)
  }

  function playBallClatter(): void {
    const ac = getCtx()
    if (!ac) return
    for (let i = 0; i < 5; i++) {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.type = 'square'
      const time = ac.currentTime + i * 0.08
      osc.frequency.setValueAtTime(2000 - i * 200, time)
      gain.gain.setValueAtTime(0.06, time)
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06)
      osc.start(time)
      osc.stop(time + 0.06)
    }
  }

  function playWin(): void {
    const ac = getCtx()
    if (!ac) return
    const notes = [523, 659, 784]
    for (let i = 0; i < notes.length; i++) {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.type = 'sine'
      const time = ac.currentTime + i * 0.15
      osc.frequency.setValueAtTime(notes[i]!, time)
      gain.gain.setValueAtTime(0.15, time)
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3)
      osc.start(time)
      osc.stop(time + 0.3)
    }
  }

  function playLose(): void {
    const ac = getCtx()
    if (!ac) return
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(250, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(150, ac.currentTime + 0.4)
    gain.gain.setValueAtTime(0.12, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4)
    osc.start(ac.currentTime)
    osc.stop(ac.currentTime + 0.4)
  }

  function playBigWin(): void {
    const ac = getCtx()
    if (!ac) return
    const notes = [523, 587, 659, 784, 880, 1047]
    for (let i = 0; i < notes.length; i++) {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.type = 'sine'
      const time = ac.currentTime + i * 0.1
      osc.frequency.setValueAtTime(notes[i]!, time)
      gain.gain.setValueAtTime(0.15, time)
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25)
      osc.start(time)
      osc.stop(time + 0.25)
    }
  }

  const sounds: Record<SoundName, () => void> = {
    chip: playChip,
    spin: playSpin,
    ballClatter: playBallClatter,
    win: playWin,
    lose: playLose,
    bigWin: playBigWin,
  }

  const manager: SoundManager = {
    get muted() {
      return muted
    },
    set muted(v: boolean) {
      muted = v
    },

    toggle(): void {
      muted = !muted
      localStorage.setItem('roulette-muted', String(muted))
    },

    play(name: SoundName): void {
      if (muted) return
      const fn = sounds[name]
      if (fn) fn()
    },
  }

  return manager
}
