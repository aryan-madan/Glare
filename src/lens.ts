import gsap from 'gsap'

const SIZE = 180
const ZOOM = 3

let el: HTMLCanvasElement
let ctx: CanvasRenderingContext2D
let vid: HTMLVideoElement
let timer: ReturnType<typeof setTimeout> | null = null

export function initLens(lens: HTMLCanvasElement, preview: HTMLVideoElement): void {
    el = lens
    ctx = lens.getContext('2d')!
    vid = preview
    el.width = SIZE
    el.height = SIZE
}

export function showLens(px: number, py: number): void {
    if (timer) clearTimeout(timer)

    el.style.left = px + 'px'
    el.style.top = py + 'px'

    drawLens(px, py)

    gsap.killTweensOf(el)
    gsap.to(el, { opacity: 1, scale: 1, duration: 0.2, ease: 'back.out(1.7)' })

    timer = setTimeout(() => {
        gsap.to(el, { opacity: 0, scale: 0.8, duration: 0.25, ease: 'power2.in' })
    }, 2000)
}

function drawLens(px: number, py: number): void {
    const rect = vid.getBoundingClientRect()
    const nx = (px - rect.left) / rect.width
    const ny = (py - rect.top) / rect.height
    const vw = vid.videoWidth
    const vh = vid.videoHeight
    const sw = vw / ZOOM
    const sh = vh / ZOOM
    const sx = Math.max(0, Math.min(nx * vw - sw / 2, vw - sw))
    const sy = Math.max(0, Math.min(ny * vh - sh / 2, vh - sh))

    ctx.clearRect(0, 0, SIZE, SIZE)
    ctx.save()
    ctx.beginPath()
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(vid, sx, sy, sw, sh, 0, 0, SIZE, SIZE)
    ctx.restore()

    ctx.beginPath()
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 1.5
    ctx.stroke()
}