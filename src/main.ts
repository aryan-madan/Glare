import './main.css'
import { startCapture, stopCapture } from './capture'
import { initEditor, setBgCol, setBgAng, setRad, setPad, setShad, setShadop, setZoomlvl, setInset, setRatio, setZooms, draw } from './editor'
import type { Zoom } from './editor'
import { dlWebm, toMp4 } from './export'

const preview = document.getElementById('preview') as HTMLVideoElement
const output = document.getElementById('output') as HTMLCanvasElement
const recbtn = document.getElementById('recbtn') as HTMLButtonElement
const stopbtn = document.getElementById('stopbtn') as HTMLButtonElement
const again = document.getElementById('again') as HTMLButtonElement
const dlwebm = document.getElementById('dlwebm') as HTMLButtonElement
const dlmp4 = document.getElementById('dlmp4') as HTMLButtonElement
const playbtn = document.getElementById('playbtn') as HTMLButtonElement
const addzoom = document.getElementById('addzoom') as HTMLButtonElement
const dot = document.getElementById('dot') as HTMLDivElement
const timerEl = document.getElementById('timer') as HTMLSpanElement
const tcode = document.getElementById('tcode') as HTMLSpanElement
const stage = document.getElementById('stage') as HTMLDivElement
const editor = document.getElementById('editor') as HTMLDivElement
const tline = document.getElementById('tline') as HTMLDivElement
const hint = document.getElementById('hint') as HTMLDivElement
const track = document.getElementById('track') as HTMLDivElement
const triml = document.getElementById('triml') as HTMLDivElement
const trimr = document.getElementById('trimr') as HTMLDivElement
const tfill = document.getElementById('tfill') as HTMLDivElement
const phead = document.getElementById('phead') as HTMLDivElement
const zdots = document.getElementById('zdots') as HTMLDivElement
const wave = document.getElementById('wave') as HTMLDivElement
const prog = document.getElementById('prog') as HTMLDivElement
const progbar = document.getElementById('progbar') as HTMLDivElement
const progtxt = document.getElementById('progtxt') as HTMLSpanElement
const bgcol1 = document.getElementById('bgcol1') as HTMLInputElement
const bgcol2 = document.getElementById('bgcol2') as HTMLInputElement
const bgang = document.getElementById('bgang') as HTMLInputElement
const bgangval = document.getElementById('bgangval') as HTMLSpanElement
const rinput = document.getElementById('rinput') as HTMLInputElement
const pinput = document.getElementById('pinput') as HTMLInputElement
const sinput = document.getElementById('sinput') as HTMLInputElement
const soinput = document.getElementById('soinput') as HTMLInputElement
const zinput = document.getElementById('zinput') as HTMLInputElement
const iinput = document.getElementById('iinput') as HTMLInputElement
const rval = document.getElementById('rval') as HTMLSpanElement
const pval = document.getElementById('pval') as HTMLSpanElement
const sval = document.getElementById('sval') as HTMLSpanElement
const soval = document.getElementById('soval') as HTMLSpanElement
const zval = document.getElementById('zval') as HTMLSpanElement
const ival = document.getElementById('ival') as HTMLSpanElement
const presets = document.querySelectorAll<HTMLButtonElement>('.preset')

let chunks: Blob[] = []
let rec: MediaRecorder | null = null
let secs = 0
let tick: ReturnType<typeof setInterval> | null = null
let zooms: Zoom[] = []
let recstart = 0
let vid: HTMLVideoElement | null = null
let trimL = 0
let trimR = 1
let drag: 'l' | 'r' | null = null
let raf = 0
let lastZoomTarget = { nx: .5, ny: .5 }

initEditor(output, preview)

recbtn.onclick = async () => {
  let s: MediaStream
  try {
    s = await startCapture()
  } catch (error) {
    timerEl.textContent = 'denied'
    console.error(error)
    setTimeout(() => { timerEl.textContent = '00:00' }, 1600)
    return
  }
  preview.srcObject = s
  chunks = []; zooms = []
  recstart = Date.now()
  rec = new MediaRecorder(s, { mimeType: pickMime() })
  rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
  rec.onstop = openEditor
  rec.start(1000)
  recbtn.disabled = true
  stopbtn.disabled = false
  dot.classList.add('on')
  hint.classList.add('on')
  secs = 0
  tick = setInterval(() => {
    secs++
    timerEl.textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`
  }, 1000)
  s.getVideoTracks()[0]?.addEventListener('ended', () => stopbtn.click(), { once: true })
}

stopbtn.onclick = () => {
  if (rec?.state === 'recording') rec.stop()
  stopCapture()
  if (tick) clearInterval(tick)
  dot.classList.remove('on')
  hint.classList.remove('on')
  recbtn.disabled = false
  stopbtn.disabled = true
  timerEl.textContent = '00:00'
}

preview.addEventListener('click', e => {
  if (rec?.state !== 'recording') return
  const rect = preview.getBoundingClientRect()
  if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return
  const zoom = {
    t: (Date.now() - recstart) / 1000,
    nx: (e.clientX - rect.left) / rect.width,
    ny: (e.clientY - rect.top) / rect.height
  }
  lastZoomTarget = { nx: zoom.nx, ny: zoom.ny }
  zooms.push(zoom)
})

function openEditor(): void {
  vid = document.createElement('video')
  vid.preload = 'auto'
  vid.ontimeupdate = onTU
  vid.onplay = () => {
    playbtn.textContent = 'pause'
    renderLoop()
  }
  vid.onpause = () => { playbtn.textContent = 'play' }
  vid.onended = () => { playbtn.textContent = 'play' }
  vid.onloadedmetadata = () => {
    initEditor(output, vid!)
    buildWave()
    setZooms(zooms)
    trimL = 0; trimR = 1
    syncHandles()
    syncTimecode()
    draw()
    syncZdots()
  }
  vid.src = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }))
  stage.classList.add('gone')
  editor.classList.remove('gone')
  tline.classList.remove('gone')
}

function buildWave(): void {
  wave.innerHTML = ''
  for (let i = 0; i < 130; i++) {
    const d = document.createElement('div')
    d.className = 'wb'
    d.style.height = (12 + Math.random() * 64) + '%'
    wave.appendChild(d)
  }
}

function onTU(): void {
  if (!vid) return
  if (vid.duration && vid.currentTime > trimR * vid.duration) vid.pause()
  phead.style.left = (vid.currentTime / (vid.duration || 1) * 100) + '%'
  syncTimecode()
  draw(vid.currentTime)
}

function syncTimecode(): void {
  if (!vid) return
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  tcode.textContent = `${fmt(vid.currentTime)} / ${fmt(vid.duration || 0)}`
}

function syncHandles(): void {
  triml.style.left = (trimL * 100) + '%'
  trimr.style.left = (trimR * 100) + '%'
  tfill.style.left = (trimL * 100) + '%'
  tfill.style.right = ((1 - trimR) * 100) + '%'
}

function syncZdots(): void {
  if (!vid) return
  zdots.innerHTML = ''
  zooms.forEach(z => {
    const d = document.createElement('div')
    d.className = 'zdot'
    d.style.left = ((z.t / (vid!.duration || 1)) * 100) + '%'
    zdots.appendChild(d)
  })
}

triml.addEventListener('mousedown', e => { drag = 'l'; e.preventDefault() })
trimr.addEventListener('mousedown', e => { drag = 'r'; e.preventDefault() })

document.addEventListener('mousemove', e => {
  if (!drag) return
  const rect = track.getBoundingClientRect()
  const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  if (drag === 'l') trimL = Math.min(p, trimR - .02)
  if (drag === 'r') trimR = Math.max(p, trimL + .02)
  syncHandles()
  if (vid) {
    const min = trimL * vid.duration
    const max = trimR * vid.duration
    vid.currentTime = Math.min(Math.max(vid.currentTime, min), max)
  }
})

document.addEventListener('mouseup', () => { drag = null })

track.addEventListener('click', e => {
  if (!vid || drag) return
  const rect = track.getBoundingClientRect()
  const p = Math.max(trimL, Math.min(trimR, (e.clientX - rect.left) / rect.width))
  vid.currentTime = p * (vid.duration || 0)
  onTU()
})

playbtn.onclick = () => {
  if (!vid) return
  if (vid.paused) {
    if (vid.duration && (vid.currentTime < trimL * vid.duration || vid.currentTime >= trimR * vid.duration)) {
      vid.currentTime = trimL * vid.duration
    }
    void vid.play()
  } else {
    vid.pause()
  }
}

addzoom.onclick = () => {
  if (!vid) return
  addZoomAt(lastZoomTarget.nx, lastZoomTarget.ny)
}

output.addEventListener('click', e => {
  if (!vid) return
  const rect = output.getBoundingClientRect()
  const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
  addZoomAt(nx, ny)
})

bgcol1.oninput = () => setBgCol(bgcol1.value, bgcol2.value)
bgcol2.oninput = () => setBgCol(bgcol1.value, bgcol2.value)
bgang.oninput = () => { bgangval.textContent = bgang.value + '°'; setBgAng(Number(bgang.value)) }
rinput.oninput = () => { rval.textContent = rinput.value; setRad(Number(rinput.value)) }
pinput.oninput = () => { pval.textContent = pinput.value; setPad(Number(pinput.value)) }
sinput.oninput = () => { sval.textContent = sinput.value; setShad(Number(sinput.value)) }
soinput.oninput = () => { soval.textContent = soinput.value; setShadop(Number(soinput.value)) }
zinput.oninput = () => { zval.textContent = zinput.value + '×'; setZoomlvl(Number(zinput.value)) }
iinput.oninput = () => { ival.textContent = iinput.value + '%'; setInset(Number(iinput.value)) }

presets.forEach(button => {
  button.onclick = () => {
    presets.forEach(p => p.classList.remove('active'))
    button.classList.add('active')
    bgcol1.value = button.dataset.c1 || bgcol1.value
    bgcol2.value = button.dataset.c2 || bgcol2.value
    bgang.value = button.dataset.ang || bgang.value
    bgangval.textContent = bgang.value + '°'
    setBgCol(bgcol1.value, bgcol2.value)
    setBgAng(Number(bgang.value))
  }
})

document.querySelectorAll('.ratio').forEach(b => {
  (b as HTMLElement).onclick = () => {
    document.querySelectorAll('.ratio').forEach(x => x.classList.remove('active'))
    b.classList.add('active')
    const parts = (b as HTMLElement).dataset.r!.split('/').map(Number)
    setRatio(parts[0] / parts[1])
  }
})

again.onclick = () => {
  if (vid) { vid.pause(); vid.src = '' }
  if (raf) cancelAnimationFrame(raf)
  vid = null; chunks = []; zooms = []
  tline.classList.add('gone')
  editor.classList.add('gone')
  stage.classList.remove('gone')
  initEditor(output, preview)
  timerEl.textContent = '00:00'
}

dlwebm.onclick = async () => {
  dlwebm.disabled = true
  progtxt.textContent = 'rendering webm...'
  progtxt.classList.remove('gone')
  try {
    dlWebm(await renderEditedBlob())
  } finally {
    progtxt.classList.add('gone')
    dlwebm.disabled = false
  }
}

dlmp4.onclick = async () => {
  dlmp4.disabled = true
  prog.classList.remove('gone')
  progtxt.classList.remove('gone')
  try {
    progtxt.textContent = 'rendering edit...'
    const edited = await renderEditedBlob()
    progtxt.textContent = 'encoding mp4...'
    await toMp4(
      edited,
      p => { progbar.style.width = p + '%' },
      msg => { progtxt.textContent = msg.slice(0, 40) }
    )
  } finally {
    prog.classList.add('gone')
    progtxt.classList.add('gone')
    progbar.style.width = '0%'
    dlmp4.disabled = false
  }
}

function pickMime(): string {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ]
  return types.find(t => MediaRecorder.isTypeSupported(t)) || ''
}

function renderLoop(): void {
  if (!vid || vid.paused || vid.ended) return
  draw(vid.currentTime)
  raf = requestAnimationFrame(renderLoop)
}

async function renderEditedBlob(): Promise<Blob> {
  if (!vid) return new Blob(chunks, { type: 'video/webm' })
  const wasPaused = vid.paused
  const before = vid.currentTime
  const stream = output.captureStream(60)
  const recorder = new MediaRecorder(stream, { mimeType: pickMime() })
  const rendered: Blob[] = []

  recorder.ondataavailable = e => {
    if (e.data.size > 0) rendered.push(e.data)
  }

  await seekTo(trimL * (vid.duration || 0))
  draw(vid.currentTime)
  const stopped = new Promise<Blob>(resolve => {
    recorder.onstop = () => resolve(new Blob(rendered, { type: 'video/webm' }))
  })
  recorder.start(250)
  await vid.play()

  await new Promise<void>(resolve => {
    const step = () => {
      if (!vid || vid.currentTime >= trimR * vid.duration || vid.ended) {
        recorder.stop()
        resolve()
        return
      }
      draw(vid.currentTime)
      requestAnimationFrame(step)
    }
    step()
  })

  const blob = await stopped

  vid.pause()
  await seekTo(before)
  if (!wasPaused) void vid.play()
  return blob
}

function addZoomAt(nx: number, ny: number): void {
  if (!vid) return
  lastZoomTarget = { nx, ny }
  zooms.push({ t: vid.currentTime, nx, ny })
  zooms.sort((a, b) => a.t - b.t)
  setZooms(zooms)
  syncZdots()
  draw(vid.currentTime)
}

function seekTo(time: number): Promise<void> {
  return new Promise(resolve => {
    if (!vid) {
      resolve()
      return
    }
    if (Math.abs(vid.currentTime - time) < .01) {
      onTU()
      resolve()
      return
    }
    vid.currentTime = time
    vid.onseeked = () => {
      if (!vid) return
      vid.onseeked = null
      onTU()
      resolve()
    }
  })
}
