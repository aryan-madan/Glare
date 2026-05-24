export interface Zoom { t: number; nx: number; ny: number; dur: number }

interface Camera { scale: number; nx: number; ny: number }

let cv: HTMLCanvasElement
let ctx: CanvasRenderingContext2D
let src: HTMLVideoElement
let col1 = '#f8f8f6'
let col2 = '#eceae5'
let ang = 135
let rad = 24
let pad = 76
let shad = 46
let shadop = 26
let zoomlvl = 2.6
let inset = 94
let ratio = 16 / 9
let zooms: Zoom[] = []
const shutter = 1 / 35

export function initEditor(c: HTMLCanvasElement, s: HTMLVideoElement): void {
  cv = c; ctx = c.getContext('2d')!; src = s; updateSize()
}

function updateSize(): void {
  const dpr = window.devicePixelRatio || 1
  const container = cv.parentElement!
  const cw = container.clientWidth - 48
  const ch = container.clientHeight - 48

  let cssW: number
  let cssH: number

  if (cw / ch > ratio) {
    cssH = ch
    cssW = ch * ratio
  } else {
    cssW = cw
    cssH = cw / ratio
  }

  cv.style.width = cssW + 'px'
  cv.style.height = cssH + 'px'
  cv.width = Math.round(cssW * dpr)
  cv.height = Math.round(cssH * dpr)
}

export function setBgCol(c1: string, c2: string): void { col1 = c1; col2 = c2; draw() }
export function setBgAng(a: number): void { ang = a; draw() }
export function setRad(n: number): void { rad = n; draw() }
export function setPad(n: number): void { pad = n; draw() }
export function setShad(n: number): void { shad = n; draw() }
export function setShadop(n: number): void { shadop = n; draw() }
export function setZoomlvl(n: number): void { zoomlvl = n }
export function setInset(n: number): void { inset = n; draw() }
export function setRatio(r: number | 'original'): void {
  if (r === 'original') {
    ratio = src.videoWidth && src.videoHeight
      ? src.videoWidth / src.videoHeight
      : 16 / 9
  } else {
    ratio = r
  }
  updateSize()
  draw()
}
export function setZooms(next: Zoom[]): void { zooms = next }

export function handleResize(): void { updateSize(); draw() }

export function draw(time = src?.currentTime || 0): void {
  const W = cv.width
  const H = cv.height
  ctx.clearRect(0, 0, W, H)

  const camera = getCamera(time)

  const scale = inset / 100
  const iw = Math.max(80, (W - pad * 2) * scale)
  const ih = Math.max(80, (H - pad * 2) * scale)
  const ix = (W - iw) / 2
  const iy = (H - ih) / 2

  const rad2 = ang * Math.PI / 180
  const makeGradient = (ox: number, oy: number, w: number, h: number) => {
    const gx1 = ox + w / 2 - Math.cos(rad2) * w / 2
    const gy1 = oy + h / 2 - Math.sin(rad2) * h / 2
    const gx2 = ox + w / 2 + Math.cos(rad2) * w / 2
    const gy2 = oy + h / 2 + Math.sin(rad2) * h / 2
    const g = ctx.createLinearGradient(gx1, gy1, gx2, gy2)
    g.addColorStop(0, col1); g.addColorStop(1, col2)
    return g
  }

  if (camera.scale > 1) {
    ctx.save()
    applyCameraTransform(camera, W, H)
    const margin = W
    ctx.fillStyle = makeGradient(-margin, -margin, W + margin * 2, H + margin * 2)
    ctx.fillRect(-margin, -margin, W + margin * 2, H + margin * 2)
    ctx.restore()
  } else {
    ctx.fillStyle = makeGradient(0, 0, W, H)
    ctx.fillRect(0, 0, W, H)
  }

  if (shad > 0) {
    ctx.save()
    applyCameraTransform(camera, W, H)
    ctx.shadowColor = `rgba(0,0,0,${shadop / 100})`
    ctx.shadowBlur = shad * 3.2
    ctx.shadowOffsetY = shad * .7
    rrect(ix, iy, iw, ih, rad)
    ctx.fillStyle = '#000'
    ctx.fill()
    ctx.restore()
  }

  const frames = getMotionFrames(time, W, H)
  frames.forEach((frame, idx) => {
    ctx.save()
    ctx.globalAlpha = idx === 0 ? 1 : frame.alpha
    applyCameraTransform(frame.camera, W, H)
    rrect(ix, iy, iw, ih, rad)
    ctx.clip()
    if (src.readyState >= 2) ctx.drawImage(src, ix, iy, iw, ih)
    else { ctx.fillStyle = '#111'; ctx.fillRect(ix, iy, iw, ih) }
    ctx.restore()
  })

  ctx.save()
  applyCameraTransform(camera, W, H)
  rrect(ix + .5, iy + .5, iw - 1, ih - 1, rad)
  ctx.strokeStyle = 'rgba(255,255,255,.06)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()
}

function applyCameraTransform(camera: Camera, W: number, H: number): void {
  if (camera.scale === 1) return
  const focalX = W * camera.nx
  const focalY = H * camera.ny
  ctx.translate(focalX, focalY)
  ctx.scale(camera.scale, camera.scale)
  ctx.translate(-focalX, -focalY)
}

function getMotionFrames(time: number, W: number, H: number): { camera: Camera; alpha: number }[] {
  const prev = getCamera(time - shutter / 2)
  const next = getCamera(time + shutter / 2)
  const move = Math.hypot((next.nx - prev.nx) * W, (next.ny - prev.ny) * H)
  const zoom = Math.abs(next.scale - prev.scale) * Math.max(W, H)
  const current = getCamera(time)
  if (move + zoom < 2) return [{ camera: current, alpha: 1 }]

  const count = 7
  const alpha = .11
  return [
    { camera: current, alpha: 1 },
    ...Array.from({ length: count }, (_, i) => ({
      camera: getCamera(time + (i / (count - 1) - .5) * shutter),
      alpha
    }))
  ]
}

function getCamera(time: number): Camera {
  const active = [...zooms].reverse().find(z => time >= z.t - .06 && time <= z.t + z.dur)
  if (!active) return { scale: 1, nx: .5, ny: .5 }

  const total = active.dur
  const zoomIn = Math.min(0.5, total * 0.22)
  const zoomOut = Math.min(0.6, total * 0.28)
  const hold = total - zoomIn - zoomOut

  const local = Math.max(0, time - active.t)
  if (local >= total) return { scale: 1, nx: .5, ny: .5 }

  let t = 0
  if (local < zoomIn) {
    t = easeInOut(local / zoomIn)
  } else if (local < zoomIn + hold) {
    t = 1
  } else {
    t = 1 - easeInOut((local - zoomIn - hold) / zoomOut)
  }

  return {
    scale: lerp(1, zoomlvl, t),
    nx: lerp(.5, active.nx, t),
    ny: lerp(.5, active.ny, t)
  }
}

function rrect(x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y); ctx.lineTo(x + w - rr, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
  ctx.lineTo(x + rr, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr)
  ctx.lineTo(x, y + rr)
  ctx.quadraticCurveTo(x, y, x + rr, y)
  ctx.closePath()
}

function easeInOut(t: number): number {
  const x = clamp(t, 0, 1)
  return x < .5
    ? 2 * x * x
    : 1 - Math.pow(-2 * x + 2, 2) / 2
}

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t }
function clamp(n: number, min: number, max: number): number { return Math.max(min, Math.min(max, n)) }
