export interface Zoom { t: number; nx: number; ny: number }

interface Camera {
  scale: number
  nx: number
  ny: number
}

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

export function initEditor(c: HTMLCanvasElement, s: HTMLVideoElement): void {
  cv = c
  ctx = c.getContext('2d')!
  src = s
  updateSize()
}

function updateSize(): void {
  const base = 1920
  cv.width = base
  cv.height = Math.round(base / ratio)
}

export function setBgCol(c1: string, c2: string): void { col1 = c1; col2 = c2; draw() }
export function setBgAng(a: number): void { ang = a; draw() }
export function setRad(n: number): void { rad = n; draw() }
export function setPad(n: number): void { pad = n; draw() }
export function setShad(n: number): void { shad = n; draw() }
export function setShadop(n: number): void { shadop = n; draw() }
export function setZoomlvl(n: number): void { zoomlvl = n }
export function setInset(n: number): void { inset = n; draw() }
export function setRatio(r: number): void { ratio = r; updateSize(); draw() }
export function setZooms(next: Zoom[]): void { zooms = next }

export function draw(time = src?.currentTime || 0): void {
  const W = cv.width
  const H = cv.height
  ctx.clearRect(0, 0, W, H)

  const rad2 = ang * Math.PI / 180
  const gx1 = W / 2 - Math.cos(rad2) * W / 2
  const gy1 = H / 2 - Math.sin(rad2) * H / 2
  const gx2 = W / 2 + Math.cos(rad2) * W / 2
  const gy2 = H / 2 + Math.sin(rad2) * H / 2
  const g = ctx.createLinearGradient(gx1, gy1, gx2, gy2)
  g.addColorStop(0, col1)
  g.addColorStop(1, col2)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  const scale = inset / 100
  const iw = Math.max(80, (W - pad * 2) * scale)
  const ih = Math.max(80, (H - pad * 2) * scale)
  const ix = (W - iw) / 2
  const iy = (H - ih) / 2

  if (shad > 0) {
    ctx.save()
    ctx.shadowColor = `rgba(15,23,42,${shadop / 100})`
    ctx.shadowBlur = shad * 2.15
    ctx.shadowOffsetY = shad * .44
    rrect(ix, iy, iw, ih, rad)
    ctx.fillStyle = '#111'
    ctx.fill()
    ctx.restore()
  }

  ctx.save()
  rrect(ix, iy, iw, ih, rad)
  ctx.clip()
  if (src.readyState >= 2) drawScreen(ix, iy, iw, ih, getCamera(time))
  else {
    ctx.fillStyle = '#f3f3f1'
    ctx.fillRect(ix, iy, iw, ih)
  }
  ctx.restore()

  ctx.save()
  rrect(ix + .5, iy + .5, iw - 1, ih - 1, rad)
  ctx.strokeStyle = 'rgba(0,0,0,.08)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()
}

function drawScreen(ix: number, iy: number, iw: number, ih: number, camera: Camera): void {
  const dw = iw * camera.scale
  const dh = ih * camera.scale
  const minX = ix + iw - dw
  const minY = iy + ih - dh
  const dx = clamp(ix + iw / 2 - dw * camera.nx, minX, ix)
  const dy = clamp(iy + ih / 2 - dh * camera.ny, minY, iy)

  ctx.drawImage(src, dx, dy, dw, dh)
}

function getCamera(time: number): Camera {
  const active = [...zooms].reverse().find(z => time >= z.t - .06 && time <= z.t + 2.42)
  if (!active) return { scale: 1, nx: .5, ny: .5 }

  const local = Math.max(0, time - active.t)
  const zoomIn = .68
  const hold = .68
  const zoomOut = .86
  const total = zoomIn + hold + zoomOut
  if (local >= total) return { scale: 1, nx: .5, ny: .5 }

  let amount = 1
  if (local < zoomIn) amount = ease(local / zoomIn)
  else if (local > zoomIn + hold) amount = 1 - ease((local - zoomIn - hold) / zoomOut)

  return {
    scale: lerp(1, zoomlvl, amount),
    nx: lerp(.5, active.nx, amount),
    ny: lerp(.5, active.ny, amount)
  }
}

function rrect(x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
  ctx.lineTo(x + rr, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr)
  ctx.lineTo(x, y + rr)
  ctx.quadraticCurveTo(x, y, x + rr, y)
  ctx.closePath()
}

function ease(t: number): number {
  const x = clamp(t, 0, 1)
  return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t }
function clamp(n: number, min: number, max: number): number { return Math.max(min, Math.min(max, n)) }
