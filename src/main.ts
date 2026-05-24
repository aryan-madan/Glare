import './main.css'
import { startCapture, stopCapture } from './capture'
import { initEditor, setBgCol, setBgAng, setRad, setPad, setShad, setShadop, setZoomlvl, setInset, setRatio, setZooms, draw } from './editor'
import type { Zoom } from './editor'
import { dlWebm, toMp4 } from './export'

import { createIcons, Image, Frame, ZoomIn, Download, ArrowRight, RotateCcw } from 'lucide';
createIcons({ icons: { Image, Frame, ZoomIn, Download, ArrowRight, RotateCcw } });

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
const zcountPill = document.getElementById('zcount-pill') as HTMLSpanElement
const zcountTab = document.querySelector('#tab-zoom .zoom-stat span') as HTMLSpanElement
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
const colprev1 = document.getElementById('colprev1') as HTMLDivElement
const colprev2 = document.getElementById('colprev2') as HTMLDivElement

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
let zoomDrag: { idx: number; startX: number; origDur: number } | null = null
let nativeRatio = 16 / 9

document.querySelectorAll<HTMLButtonElement>('.tab').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.tabpanel').forEach(p => p.classList.remove('active'))
    btn.classList.add('active')
    const panel = document.getElementById('tab-' + btn.dataset.tab!)
    panel?.classList.add('active')
  }
})

initEditor(output, preview)

recbtn.onclick = async () => {
  if (tick) { clearInterval(tick); tick = null }
  let s: MediaStream
  try { s = await startCapture() }
  catch (err) {
    timerEl.textContent = 'denied'
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
  recbtn.disabled = true; stopbtn.disabled = false
  dot.classList.add('on'); hint.classList.add('on')
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
  if (tick) { clearInterval(tick); tick = null }
  dot.classList.remove('on'); hint.classList.remove('on')
  recbtn.disabled = false; stopbtn.disabled = true
  timerEl.textContent = '00:00'
}

preview.addEventListener('click', e => {
  if (rec?.state !== 'recording') return
  const rect = preview.getBoundingClientRect()
  if (e.clientX < rect.left || e.clientX > rect.right) return
  zooms.push({
    t: (Date.now() - recstart) / 1000,
    nx: (e.clientX - rect.left) / rect.width,
    ny: (e.clientY - rect.top) / rect.height,
    dur: 2.22
  })
})

function openEditor(): void {
  vid = document.createElement('video')
  vid.preload = 'auto'
  vid.ontimeupdate = onTU
  vid.onplay = () => { playbtn.textContent = 'Pause'; renderLoop() }
  vid.onpause = () => { playbtn.textContent = 'Play' }
  vid.onended = () => { playbtn.textContent = 'Play' }
  vid.onloadedmetadata = () => {
    nativeRatio = vid!.videoWidth / vid!.videoHeight
    initEditor(output, vid!)
    buildWave()
    setZooms(zooms)
    trimL = 0; trimR = 1
    syncHandles(); syncTimecode(); draw(); syncZdots()
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

function safeDuration(): number {
  if (!vid) return 0
  const d = vid.duration
  return isFinite(d) && !isNaN(d) && d > 0 ? d : 0
}

function onTU(): void {
  if (!vid) return
  const dur = safeDuration()
  if (dur && vid.currentTime > trimR * dur) vid.pause()
  phead.style.left = dur ? (vid.currentTime / dur * 100) + '%' : '0%'
  syncTimecode(); draw(vid.currentTime)
}

function syncTimecode(): void {
  const dur = safeDuration()
  const fmt = (s: number) => (!isFinite(s) || isNaN(s)) ? '0:00' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  tcode.textContent = `${fmt(vid?.currentTime ?? 0)} / ${fmt(dur)}`
}

function syncHandles(): void {
  triml.style.left = (trimL * 100) + '%'
  trimr.style.left = (trimR * 100) + '%'
  tfill.style.left = (trimL * 100) + '%'
  tfill.style.right = ((1 - trimR) * 100) + '%'
}

function syncZdots(): void {
  if (!vid) return
  const dur = safeDuration()
  zdots.innerHTML = ''
  const label = `${zooms.length} ${zooms.length === 1 ? 'zoom' : 'zooms'}`
  zcountPill.textContent = label
  if (zcountTab) zcountTab.textContent = label

  zooms.forEach((z, idx) => {
    const startPct = dur ? (z.t / dur * 100) : 0
    const widthPct = dur ? (z.dur / dur * 100) : 0

    const pill = document.createElement('div')
    pill.className = 'zdot'
    pill.style.left = startPct + '%'
    pill.style.width = Math.max(widthPct, 1.2) + '%'

    const del = document.createElement('div')
    del.className = 'zdot-del'
    del.textContent = 'Click to delete'

    const handle = document.createElement('div')
    handle.className = 'zdot-resize'
    handle.addEventListener('mousedown', e => {
      e.stopPropagation(); e.preventDefault()
      const trackRect = track.getBoundingClientRect()
      zoomDrag = { idx, startX: e.clientX, origDur: z.dur }
      const onMove = (ev: MouseEvent) => {
        if (!zoomDrag || !vid) return
        const d = safeDuration(); if (!d) return
        const pxPerSec = trackRect.width / d
        const newDur = Math.max(0.4, Math.min(d - zooms[zoomDrag.idx].t, zoomDrag.origDur + (ev.clientX - zoomDrag.startX) / pxPerSec))
        zooms[zoomDrag.idx] = { ...zooms[zoomDrag.idx], dur: newDur }
        setZooms(zooms); syncZdots(); draw(vid!.currentTime)
      }
      const onUp = () => {
        zoomDrag = null
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    })

    pill.addEventListener('click', e => {
      if ((e.target as HTMLElement).closest('.zdot-resize')) return
      zooms.splice(idx, 1)
      setZooms(zooms); syncZdots(); draw(vid!.currentTime)
    })

    pill.appendChild(del)
    pill.appendChild(handle)
    zdots.appendChild(pill)
  })
}

triml.addEventListener('mousedown', e => { drag = 'l'; e.preventDefault() })
trimr.addEventListener('mousedown', e => { drag = 'r'; e.preventDefault() })

document.addEventListener('mousemove', e => {
  if (!drag) return
  const rect = track.getBoundingClientRect()
  const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  if (drag === 'l') trimL = Math.min(p, trimR - .02)
  else trimR = Math.max(p, trimL + .02)
  syncHandles()
  if (vid) {
    const dur = safeDuration()
    if (dur) vid.currentTime = Math.min(Math.max(vid.currentTime, trimL * dur), trimR * dur)
  }
})
document.addEventListener('mouseup', () => { drag = null })

track.addEventListener('click', e => {
  if (!vid || drag || zoomDrag) return
  const rect = track.getBoundingClientRect()
  const p = Math.max(trimL, Math.min(trimR, (e.clientX - rect.left) / rect.width))
  const dur = safeDuration()
  if (dur) { vid.currentTime = p * dur; onTU() }
})

playbtn.onclick = () => {
  if (!vid) return
  const dur = safeDuration()
  if (vid.paused) {
    if (dur && (vid.currentTime < trimL * dur || vid.currentTime >= trimR * dur)) vid.currentTime = trimL * dur
    void vid.play()
  } else vid.pause()
}

addzoom.onclick = () => { if (vid) addZoomAt(lastZoomTarget.nx, lastZoomTarget.ny) }

output.addEventListener('click', e => {
  if (!vid) return
  const rect = output.getBoundingClientRect()
  addZoomAt(
    Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
    Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
  )
})

bgcol1.oninput = () => { colprev1.style.background = bgcol1.value; setBgCol(bgcol1.value, bgcol2.value) }
bgcol2.oninput = () => { colprev2.style.background = bgcol2.value; setBgCol(bgcol1.value, bgcol2.value) }
bgang.oninput = () => { bgangval.textContent = bgang.value + '°'; setBgAng(Number(bgang.value)) }
rinput.oninput = () => { rval.textContent = rinput.value; setRad(Number(rinput.value)) }
pinput.oninput = () => { pval.textContent = pinput.value; setPad(Number(pinput.value)) }
sinput.oninput = () => { sval.textContent = sinput.value; setShad(Number(sinput.value)) }
soinput.oninput = () => { soval.textContent = soinput.value; setShadop(Number(soinput.value)) }
zinput.oninput = () => { zval.textContent = zinput.value + '×'; setZoomlvl(Number(zinput.value)) }
iinput.oninput = () => { ival.textContent = iinput.value + '%'; setInset(Number(iinput.value)) }

document.querySelectorAll<HTMLButtonElement>('.preset').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.preset').forEach(p => p.classList.remove('active'))
    btn.classList.add('active')
    bgcol1.value = btn.dataset.c1 || bgcol1.value
    bgcol2.value = btn.dataset.c2 || bgcol2.value
    bgang.value = btn.dataset.ang || bgang.value
    bgangval.textContent = bgang.value + '°'
    colprev1.style.background = bgcol1.value
    colprev2.style.background = bgcol2.value
    setBgCol(bgcol1.value, bgcol2.value)
    setBgAng(Number(bgang.value))
  }
})

document.querySelectorAll<HTMLElement>('.ratio-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.ratio-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    const r = btn.dataset.r!
    if (r === 'original') {
      setRatio(nativeRatio)
    } else {
      const parts = r.split('/').map(Number)
      setRatio(parts[0] / parts[1])
    }
  }
})

again.onclick = () => {
  if (vid) { vid.pause(); vid.src = '' }
  if (raf) cancelAnimationFrame(raf)
  vid = null; chunks = []; zooms = []
  tline.classList.add('gone'); editor.classList.add('gone'); stage.classList.remove('gone')
  initEditor(output, preview)
  timerEl.textContent = '00:00'
}

dlwebm.onclick = async () => {
  dlwebm.disabled = true
  progtxt.textContent = 'rendering…'; progtxt.classList.remove('gone')
  try { dlWebm(await renderEditedBlob()) }
  finally { progtxt.classList.add('gone'); dlwebm.disabled = false }
}

dlmp4.onclick = async () => {
  dlmp4.disabled = true; prog.classList.remove('gone'); progtxt.classList.remove('gone')
  try {
    progtxt.textContent = 'rendering edit…'
    const edited = await renderEditedBlob()
    progtxt.textContent = 'encoding mp4…'
    await toMp4(edited, p => { progbar.style.width = p + '%' }, msg => { progtxt.textContent = msg.slice(0, 40) })
  } finally {
    prog.classList.add('gone'); progtxt.classList.add('gone')
    progbar.style.width = '0%'; dlmp4.disabled = false
  }
}

function pickMime(): string {
  return ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    .find(t => MediaRecorder.isTypeSupported(t)) || ''
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
  const dur = safeDuration()
  const stream = output.captureStream(60)
  const recorder = new MediaRecorder(stream, { mimeType: pickMime() })
  const rendered: Blob[] = []
  recorder.ondataavailable = e => { if (e.data.size > 0) rendered.push(e.data) }
  await seekTo(trimL * dur)
  draw(vid.currentTime)
  const stopped = new Promise<Blob>(resolve => { recorder.onstop = () => resolve(new Blob(rendered, { type: 'video/webm' })) })
  recorder.start(250); await vid.play()
  await new Promise<void>(resolve => {
    const step = () => {
      if (!vid || vid.currentTime >= trimR * dur || vid.ended) { recorder.stop(); resolve(); return }
      draw(vid.currentTime); requestAnimationFrame(step)
    }
    step()
  })
  const blob = await stopped
  vid.pause(); await seekTo(before)
  if (!wasPaused) void vid.play()
  return blob
}

function addZoomAt(nx: number, ny: number): void {
  if (!vid) return
  lastZoomTarget = { nx, ny }
  zooms.push({ t: vid.currentTime, nx, ny, dur: 2.22 })
  zooms.sort((a, b) => a.t - b.t)
  setZooms(zooms); syncZdots(); draw(vid.currentTime)
}

function seekTo(time: number): Promise<void> {
  return new Promise(resolve => {
    if (!vid) { resolve(); return }
    if (Math.abs(vid.currentTime - time) < .01) { onTU(); resolve(); return }
    vid.currentTime = time
    vid.onseeked = () => { if (!vid) return; vid.onseeked = null; onTU(); resolve() }
  })
}