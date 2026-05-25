import './main.css'
import { startCapture, stopCapture } from './capture'
import { initEditor, setBgCol, setBgAng, setRad, setPad, setShad, setShadop, setInset, setStrokeop, setVignette, setGrain, setMotion, setRatio, setZooms, draw } from './editor'
import type { Zoom } from './editor'
import { dlWebm, toMp4, toGif } from './export'
import type { Mp4Options } from './export'

import { createIcons, Image, Frame, ZoomIn, Download, ArrowRight, RotateCcw } from 'lucide'
createIcons({ icons: { Image, Frame, ZoomIn, Download, ArrowRight, RotateCcw } })

const app = document.getElementById('app') as HTMLDivElement
const preview = document.getElementById('preview') as HTMLVideoElement
const output = document.getElementById('output') as HTMLCanvasElement
const recbtn = document.getElementById('recbtn') as HTMLButtonElement
const stopbtn = document.getElementById('stopbtn') as HTMLButtonElement
const again = document.getElementById('again') as HTMLButtonElement
const dlwebm = document.getElementById('dlwebm') as HTMLButtonElement
const dlmp4 = document.getElementById('dlmp4') as HTMLButtonElement
const dlpng = document.getElementById('dlpng') as HTMLButtonElement
const dlgif = document.getElementById('dlgif') as HTMLButtonElement
const playbtn = document.getElementById('playbtn') as HTMLButtonElement
const addzoom = document.getElementById('addzoom') as HTMLButtonElement
const clearzooms = document.getElementById('clearzooms') as HTMLButtonElement
const dot = document.getElementById('dot') as HTMLDivElement
const timerEl = document.getElementById('timer') as HTMLSpanElement
const tcode = document.getElementById('tcode') as HTMLSpanElement
const zcountPill = document.getElementById('zcount-pill') as HTMLSpanElement
const zcountTab = document.getElementById('zcount') as HTMLSpanElement
const stage = document.getElementById('stage') as HTMLDivElement
const stageEmpty = document.getElementById('stage-empty') as HTMLDivElement
const uploadbtn = document.getElementById('uploadbtn') as HTMLButtonElement
const fileinput = document.getElementById('fileinput') as HTMLInputElement
const dropcopy = document.getElementById('dropcopy') as HTMLDivElement
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
const iinput = document.getElementById('iinput') as HTMLInputElement
const binput = document.getElementById('binput') as HTMLInputElement
const vinput = document.getElementById('vinput') as HTMLInputElement
const ginput = document.getElementById('ginput') as HTMLInputElement
const minput = document.getElementById('minput') as HTMLInputElement
const rval = document.getElementById('rval') as HTMLSpanElement
const pval = document.getElementById('pval') as HTMLSpanElement
const sval = document.getElementById('sval') as HTMLSpanElement
const soval = document.getElementById('soval') as HTMLSpanElement
const ival = document.getElementById('ival') as HTMLSpanElement
const bval = document.getElementById('bval') as HTMLSpanElement
const vval = document.getElementById('vval') as HTMLSpanElement
const gval = document.getElementById('gval') as HTMLSpanElement
const mval = document.getElementById('mval') as HTMLSpanElement
const colprev1 = document.getElementById('colprev1') as HTMLDivElement
const colprev2 = document.getElementById('colprev2') as HTMLDivElement

const ziEmpty = document.getElementById('zi-empty') as HTMLDivElement
const ziPanel = document.getElementById('zi-panel') as HTMLDivElement
const ziTitle = document.getElementById('zi-title') as HTMLSpanElement
const ziLvl = document.getElementById('zi-lvl') as HTMLInputElement
const ziLvlVal = document.getElementById('zi-lvlval') as HTMLSpanElement
const ziDur = document.getElementById('zi-dur') as HTMLInputElement
const ziDurVal = document.getElementById('zi-durval') as HTMLSpanElement
const ziDel = document.getElementById('zi-del') as HTMLButtonElement
const ziAddEmpty = document.getElementById('zi-add-empty') as HTMLButtonElement
const zcountEmpty = document.getElementById('zcount-empty') as HTMLSpanElement

const fpsinput = document.getElementById('fpsinput') as HTMLInputElement
const fpsval = document.getElementById('fpsval') as HTMLSpanElement
const qinput = document.getElementById('qinput') as HTMLInputElement
const qval = document.getElementById('qval') as HTMLSpanElement
const scaleinput = document.getElementById('scaleinput') as HTMLInputElement
const scaleval = document.getElementById('scaleval') as HTMLSpanElement
const tabBtns = document.querySelectorAll<HTMLButtonElement>('.tab')
const tabPanels = document.querySelectorAll<HTMLElement>('.tabpanel')
const editmain = document.getElementById('editmain') as HTMLDivElement

let loadOverlay: HTMLDivElement | null = null
let loadLabel: HTMLSpanElement | null = null
let chunks: Blob[] = []
let rec: MediaRecorder | null = null
let secs = 0
let tick: ReturnType<typeof setInterval> | null = null
let zooms: Zoom[] = []
let recstart = 0
let vid: HTMLVideoElement | null = null
let vidUrl: string | null = null
let loadedDuration = 0
let recordedDuration = 0
let trimL = 0
let trimR = 1
let drag: 'l' | 'r' | null = null
let raf = 0
let lastZoomTarget = { nx: .5, ny: .5 }
let zoomDrag: { idx: number; startX: number; origT: number; origDur: number; edge: 'l' | 'r' } | null = null
let nativeRatio = 16 / 9
let defaultDur = 2.2
let playrate = 1
let selectedZoomIdx: number | null = null
let exportFps = 60
let exportQuality = 1
let exportScale = 1

function switchTab(name: string): void {
  tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === name))
  tabPanels.forEach(p => p.classList.toggle('active', p.id === 'tab-' + name))
}

tabBtns.forEach(btn => { btn.onclick = () => switchTab(btn.dataset.tab!) })
document.querySelectorAll<HTMLButtonElement>('[data-start-recording]').forEach(btn => {
  btn.onclick = () => recbtn.click()
})

uploadbtn.onclick = () => fileinput.click()

fileinput.onchange = async () => {
  const file = fileinput.files?.[0]
  fileinput.value = ''
  if (!file) return
  await loadDroppedOrPickedVideo(file)
}

stageEmpty.addEventListener('dragover', e => {
  e.preventDefault()
  stageEmpty.classList.add('dragging')
  dropcopy.textContent = 'Release to open video'
})

stageEmpty.addEventListener('dragleave', e => {
  if (e.currentTarget !== stageEmpty || stageEmpty.contains(e.relatedTarget as Node | null)) return
  stageEmpty.classList.remove('dragging')
  dropcopy.textContent = 'Drop MP4, MOV, or WebM'
})

stageEmpty.addEventListener('drop', async e => {
  e.preventDefault()
  stageEmpty.classList.remove('dragging')
  dropcopy.textContent = 'Drop MP4, MOV, or WebM'
  const file = Array.from(e.dataTransfer?.files || []).find(file => file.type.startsWith('video/'))
  if (!file) return
  await loadDroppedOrPickedVideo(file)
})

initEditor(output, preview)
selectZoom(null)

recbtn.onclick = async () => {
  if (tick) { clearInterval(tick); tick = null }
  let s: MediaStream
  try { s = await startCapture() }
  catch {
    stageEmpty.classList.remove('gone')
    timerEl.textContent = 'denied'
    setTimeout(() => { timerEl.textContent = '00:00' }, 1600)
    return
  }
  app.classList.remove('idle')
  stageEmpty.classList.add('gone')
  preview.classList.remove('opacity-0')
  preview.srcObject = s
  chunks = []; zooms = []
  loadedDuration = 0
  recordedDuration = 0
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
  recordedDuration = recstart ? (Date.now() - recstart) / 1000 : recordedDuration
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
    dur: defaultDur,
    zoomlvl: 2.6
  })
})

async function openEditor(): Promise<void> {
  const blob = new Blob(chunks, { type: 'video/webm' })
  recordedDuration = recordedDuration || (recstart ? (Date.now() - recstart) / 1000 : 0)
  await openVideoBlob(blob, recordedDuration)
}

async function openVideoBlob(blob: Blob, fallbackDuration = 0): Promise<void> {
  app.classList.remove('idle')
  stage.classList.add('gone')
  editor.classList.remove('gone')
  tline.classList.remove('gone')
  showLoadOverlay()
  setLoadText('Reading metadata...')
  const duration = await resolveBlobDuration(blob, fallbackDuration)
  finishOpenEditor(blob, duration)
}

async function loadDroppedOrPickedVideo(file: File): Promise<void> {
  if (!file.type.startsWith('video/')) return
  if (tick) { clearInterval(tick); tick = null }
  if (rec?.state === 'recording') rec.stop()
  stopCapture()
  chunks = [file]
  zooms = []
  loadedDuration = 0
  recordedDuration = 0
  recstart = 0
  selectedZoomIdx = null
  selectZoom(null)
  await openVideoBlob(file)
}

function finishOpenEditor(blob: Blob, duration: number): void {
  if (vidUrl) URL.revokeObjectURL(vidUrl)
  loadedDuration = duration
  vid = document.createElement('video')
  vid.preload = 'auto'
  vid.muted = false
  vid.onplay = () => { playbtn.textContent = 'Pause'; renderLoop() }
  vid.onpause = () => { playbtn.textContent = 'Play' }
  vid.onended = () => { playbtn.textContent = 'Play' }
  vid.ontimeupdate = onTU
  vidUrl = URL.createObjectURL(blob)
  vid.src = vidUrl
  vid.load()

  let initialized = false
  const tryInit = (force = false) => {
    if (!vid || initialized) return
    const d = readableDuration(vid.duration) || loadedDuration
    const w = vid.videoWidth
    if (!d || (!force && w === 0)) return
    initialized = true
    loadedDuration = d
    nativeRatio = w && vid.videoHeight ? w / vid.videoHeight : 16 / 9
    vid.playbackRate = playrate
    initEditor(output, vid)
    const hasAudio = (vid.mozHasAudio !== undefined ? vid.mozHasAudio :
      (vid.webkitAudioDecodedByteCount !== undefined ? vid.webkitAudioDecodedByteCount > 0 : true))
    wave.style.display = hasAudio ? '' : 'none'
    buildWave()
    setZooms(zooms)
    trimL = 0; trimR = 1
    syncHandles(); syncTimecode(); draw(); syncZdots()
    syncGifBtn()
    hideLoadOverlay()
  }

  vid.onloadedmetadata = () => tryInit()
  vid.ondurationchange = () => tryInit()
  vid.onloadeddata = () => tryInit()
  setTimeout(() => tryInit(true), 5000)
}

function syncGifBtn(): void {
  const dur = trimmedDuration()
  dlgif.disabled = dur > 30
  dlgif.title = dur > 30 ? 'GIF export only available for recordings under 30s' : ''
}

function trimmedDuration(): number {
  return safeDuration() * (trimR - trimL)
}

function showLoadOverlay(): void {
  if (loadOverlay) return
  loadOverlay = document.createElement('div')
  loadOverlay.className = 'absolute inset-0 z-20 flex flex-col items-center justify-center gap-2.5 bg-[#060607]/85 backdrop-blur-sm'
  const spinner = document.createElement('div')
  spinner.className = 'h-[18px] w-[18px] rounded-full border border-white/10 border-t-white/70'
  spinner.style.animation = 'spin 0.75s linear infinite'
  if (!document.getElementById('glare-spin-style')) {
    const style = document.createElement('style')
    style.id = 'glare-spin-style'
    style.textContent = `@keyframes spin{to{transform:rotate(360deg)}}`
    document.head.appendChild(style)
  }
  loadLabel = document.createElement('span')
  loadLabel.textContent = 'Preparing video...'
  loadLabel.className = 'font-mono text-[10.5px] text-white/40 tabular-nums'
  loadOverlay.appendChild(spinner)
  loadOverlay.appendChild(loadLabel)
  editmain.style.position = 'relative'
  editmain.appendChild(loadOverlay)
}

function hideLoadOverlay(): void {
  if (!loadOverlay) return
  loadOverlay.remove()
  loadOverlay = null
  loadLabel = null
}

function setLoadText(text: string): void {
  if (loadLabel) loadLabel.textContent = text
}

function readableDuration(value: number): number {
  return isFinite(value) && !isNaN(value) && value > 0 ? value : 0
}

function resolveBlobDuration(blob: Blob, fallback: number): Promise<number> {
  return new Promise(resolve => {
    const probe = document.createElement('video')
    const probeUrl = URL.createObjectURL(blob)
    let settled = false
    let triedSeek = false
    const finish = (duration = 0) => {
      if (settled) return
      settled = true
      probe.pause()
      probe.removeAttribute('src')
      probe.load()
      URL.revokeObjectURL(probeUrl)
      resolve(readableDuration(duration) || readableDuration(fallback))
    }
    const check = () => {
      const duration = readableDuration(probe.duration)
      if (duration) { finish(duration); return }
      if (!triedSeek && probe.readyState >= 1) {
        triedSeek = true
        setLoadText('Repairing duration...')
        try { probe.currentTime = 1e9 } catch { finish(fallback) }
      }
    }
    probe.preload = 'metadata'
    probe.muted = true
    probe.onloadedmetadata = check
    probe.ondurationchange = check
    probe.ontimeupdate = check
    probe.onseeked = check
    probe.onerror = () => finish(fallback)
    probe.src = probeUrl
    probe.load()
    setTimeout(() => finish(fallback), 5000)
  })
}

function buildWave(): void {
  wave.innerHTML = ''
  for (let i = 0; i < 130; i++) {
    const d = document.createElement('div')
    d.className = 'wb min-w-0 flex-[1_1_0] rounded-[0.5px] bg-[#222225]'
    d.style.height = (12 + Math.random() * 64) + '%'
    wave.appendChild(d)
  }
}

function safeDuration(): number {
  if (!vid) return 0
  return readableDuration(vid.duration) || loadedDuration
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
  syncGifBtn()
}

function selectZoom(idx: number | null): void {
  selectedZoomIdx = idx
  if (idx === null) {
    ziEmpty.style.display = 'block'
    ziPanel.style.display = 'none'
    return
  }
  const z = zooms[idx]
  if (!z) { selectZoom(null); return }
  ziEmpty.style.display = 'none'
  ziPanel.style.display = 'block'
  ziTitle.textContent = `Zoom ${idx + 1}`
  ziDur.value = String(z.dur)
  ziDurVal.textContent = z.dur.toFixed(1) + 's'
  const lvl = z.zoomlvl ?? 2.6
  ziLvl.value = String(lvl)
  ziLvlVal.textContent = lvl.toFixed(1) + '×'
}

function deleteSelectedZoom(): void {
  if (selectedZoomIdx === null) return
  const at = selectedZoomIdx
  zooms.splice(at, 1)
  setZooms(zooms)
  selectZoom(zooms.length ? Math.min(at, zooms.length - 1) : null)
  syncZdots()
  if (vid) draw(vid.currentTime)
}

ziDur.oninput = () => {
  if (selectedZoomIdx === null) return
  const val = Number(ziDur.value)
  zooms[selectedZoomIdx] = { ...zooms[selectedZoomIdx], dur: val }
  ziDurVal.textContent = val.toFixed(1) + 's'
  setZooms(zooms); syncZdots()
  if (vid) draw(vid.currentTime)
}

ziLvl.oninput = () => {
  if (selectedZoomIdx === null) return
  const val = Number(ziLvl.value)
  zooms[selectedZoomIdx] = { ...zooms[selectedZoomIdx], zoomlvl: val }
  ziLvlVal.textContent = val.toFixed(1) + '×'
  setZooms(zooms)
  if (vid) draw(vid.currentTime)
}

ziDel.onclick = deleteSelectedZoom

document.addEventListener('keydown', e => {
  if (selectedZoomIdx === null) return
  const target = e.target as HTMLElement | null
  if (target?.matches('input, textarea, select') || target?.isContentEditable) return
  if (e.key !== 'Backspace' && e.key !== 'Delete') return
  e.preventDefault()
  deleteSelectedZoom()
})

function syncZdots(): void {
  if (!vid) return
  const dur = safeDuration()
  zdots.innerHTML = ''
  const label = `${zooms.length} ${zooms.length === 1 ? 'zoom' : 'zooms'}`
  zcountPill.textContent = label
  if (zcountTab) zcountTab.textContent = label
  if (zcountEmpty) zcountEmpty.textContent = String(zooms.length)
  if (selectedZoomIdx !== null && selectedZoomIdx >= zooms.length) selectZoom(null)

  zooms.forEach((z, idx) => {
    const startPct = dur ? (z.t / dur * 100) : 0
    const widthPct = dur ? (z.dur / dur * 100) : 0
    const pill = document.createElement('div')
    const isSelected = selectedZoomIdx === idx
    pill.className = 'zdot pointer-events-auto absolute top-1/2 h-[18px] min-w-3 -translate-y-1/2 cursor-pointer rounded-[3px] border-[0.5px] shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-[background,border-color] duration-[60ms]'
    pill.classList.add(isSelected ? 'border-white/50' : 'border-white/20', isSelected ? 'bg-white/30' : 'bg-white/16')
    pill.style.left = startPct + '%'
    pill.style.width = Math.max(widthPct, 1.8) + '%'

    const tooltip = document.createElement('div')
    tooltip.className = 'zdot-del pointer-events-none absolute top-[-24px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[3px] border-[0.5px] border-line-3 bg-panel-2 px-[5px] py-px font-mono text-[9.5px] text-text opacity-0 shadow-[0_2px_8px_rgba(0,0,0,0.4)] transition-opacity duration-[80ms] ease-[ease]'
    tooltip.textContent = `${z.dur.toFixed(1)}s`

    const makeHandle = (edge: 'l' | 'r') => {
      const handle = document.createElement('div')
      handle.className = `zdot-resize absolute top-[-3px] bottom-[-3px] ${edge === 'l' ? 'left-[-4px]' : 'right-[-4px]'} w-3 cursor-ew-resize`
      const grip = document.createElement('span')
      grip.className = `pointer-events-none absolute top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-[1px] bg-white/85 shadow-[0_1px_2px_rgba(0,0,0,0.55)] ${edge === 'l' ? 'left-[4px]' : 'right-[4px]'}`
      handle.appendChild(grip)
      handle.addEventListener('mousedown', e => {
        e.stopPropagation(); e.preventDefault()
        selectZoom(idx); syncZdots()
        const trackRect = track.getBoundingClientRect()
        zoomDrag = { idx, startX: e.clientX, origT: z.t, origDur: z.dur, edge }
        const onMove = (ev: MouseEvent) => {
          if (!zoomDrag || !vid) return
          const d = safeDuration(); if (!d) return
          const pxPerSec = trackRect.width / d
          const delta = (ev.clientX - zoomDrag.startX) / pxPerSec
          const current = zooms[zoomDrag.idx]
          if (!current) return
          if (zoomDrag.edge === 'r') {
            zooms[zoomDrag.idx] = { ...current, dur: Math.max(0.4, Math.min(d - current.t, zoomDrag.origDur + delta)) }
          } else {
            const maxStart = zoomDrag.origT + zoomDrag.origDur - 0.4
            const newT = Math.max(0, Math.min(maxStart, zoomDrag.origT + delta))
            zooms[zoomDrag.idx] = { ...current, t: newT, dur: zoomDrag.origDur - (newT - zoomDrag.origT) }
          }
          setZooms(zooms); syncZdots(); draw(vid!.currentTime)
          if (selectedZoomIdx === zoomDrag.idx) selectZoom(zoomDrag.idx)
        }
        const onUp = () => {
          const active = zoomDrag ? zooms[zoomDrag.idx] : null
          zoomDrag = null
          if (active) {
            zooms.sort((a, b) => a.t - b.t)
            selectedZoomIdx = zooms.indexOf(active)
            setZooms(zooms); syncZdots(); selectZoom(selectedZoomIdx)
          }
          document.removeEventListener('mousemove', onMove)
          document.removeEventListener('mouseup', onUp)
        }
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
      })
      return handle
    }

    pill.addEventListener('click', e => {
      e.stopPropagation(); e.preventDefault()
      if ((e.target as HTMLElement).closest('.zdot-resize')) return
      selectZoom(selectedZoomIdx === idx ? null : idx)
      syncZdots()
    })

    pill.appendChild(tooltip)
    pill.appendChild(makeHandle('l'))
    pill.appendChild(makeHandle('r'))
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
  if (dur) {
    const target = p * dur
    vid.currentTime = target
    draw(target)
    phead.style.left = (p * 100) + '%'
    syncTimecode()
  }
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
ziAddEmpty.onclick = () => { if (vid) addZoomAt(lastZoomTarget.nx, lastZoomTarget.ny) }
output.addEventListener('click', e => {
  if (!vid) return
  const rect = output.getBoundingClientRect()
  addZoomAt(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)), Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)))
})

bgcol1.oninput = () => { colprev1.style.background = bgcol1.value; setBgCol(bgcol1.value, bgcol2.value) }
bgcol2.oninput = () => { colprev2.style.background = bgcol2.value; setBgCol(bgcol1.value, bgcol2.value) }
bgang.oninput = () => { bgangval.textContent = bgang.value + '°'; setBgAng(Number(bgang.value)) }
rinput.oninput = () => { rval.textContent = rinput.value; setRad(Number(rinput.value)) }
pinput.oninput = () => { pval.textContent = pinput.value; setPad(Number(pinput.value)) }
sinput.oninput = () => { sval.textContent = sinput.value; setShad(Number(sinput.value)) }
soinput.oninput = () => { soval.textContent = soinput.value; setShadop(Number(soinput.value)) }
iinput.oninput = () => { ival.textContent = iinput.value + '%'; setInset(Number(iinput.value)) }
binput.oninput = () => { bval.textContent = binput.value + '%'; setStrokeop(Number(binput.value)) }
vinput.oninput = () => { vval.textContent = vinput.value + '%'; setVignette(Number(vinput.value)) }
ginput.oninput = () => { gval.textContent = ginput.value + '%'; setGrain(Number(ginput.value)) }
minput.oninput = () => { mval.textContent = minput.value + '%'; setMotion(Number(minput.value)) }

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
    if (r === 'original') setRatio(nativeRatio)
    else {
      const parts = r.split('/').map(Number)
      setRatio(parts[0] / parts[1])
    }
  }
})

again.onclick = () => {
  if (vid) { vid.pause(); vid.src = '' }
  if (vidUrl) { URL.revokeObjectURL(vidUrl); vidUrl = null }
  if (raf) cancelAnimationFrame(raf)
  vid = null; chunks = []; zooms = []
  loadedDuration = 0; recordedDuration = 0
  selectedZoomIdx = null
  selectZoom(null); hideLoadOverlay()
  tline.classList.add('gone'); editor.classList.add('gone'); stage.classList.remove('gone')
  stageEmpty.classList.remove('gone')
  app.classList.add('idle')
  preview.classList.add('opacity-0')
  initEditor(output, preview)
  timerEl.textContent = '00:00'
}

dlwebm.onclick = async () => {
  dlwebm.disabled = true
  progtxt.textContent = 'rendering...'; progtxt.classList.remove('gone')
  try { dlWebm(await renderEditedBlob()) }
  finally { progtxt.classList.add('gone'); dlwebm.disabled = false }
}

dlmp4.onclick = async () => {
  dlmp4.disabled = true; prog.classList.remove('gone'); progtxt.classList.remove('gone')
  try {
    progtxt.textContent = 'rendering edit...'
    const edited = await renderEditedBlob()
    progtxt.textContent = 'encoding mp4...'
    await toMp4(edited, getMp4Options(), p => { progbar.style.width = p + '%' }, msg => { progtxt.textContent = msg.slice(0, 40) })
  } finally {
    prog.classList.add('gone'); progtxt.classList.add('gone')
    progbar.style.width = '0%'; dlmp4.disabled = false
  }
}

dlgif.onclick = async () => {
  dlgif.disabled = true; prog.classList.remove('gone'); progtxt.classList.remove('gone')
  try {
    progtxt.textContent = 'rendering edit...'
    const edited = await renderEditedBlob()
    progtxt.textContent = 'encoding gif...'
    await toGif(edited, p => { progbar.style.width = p + '%' }, msg => { progtxt.textContent = msg.slice(0, 40) })
  } finally {
    prog.classList.add('gone'); progtxt.classList.add('gone')
    progbar.style.width = '0%'; dlgif.disabled = trimmedDuration() > 30
  }
}

fpsinput.oninput = () => {
  exportFps = [24, 30, 60][Number(fpsinput.value)] || 60
  fpsval.textContent = String(exportFps)
}
qinput.oninput = () => {
  exportQuality = Number(qinput.value)
  qval.textContent = ['Draft', 'High', 'Max'][exportQuality] || 'High'
}
scaleinput.oninput = () => {
  exportScale = Number(scaleinput.value) / 100
  scaleval.textContent = scaleinput.value + '%'
}

function getMp4Options(): Mp4Options {
  return [
    { crf: 28, preset: 'veryfast' },
    { crf: 22, preset: 'fast' },
    { crf: 18, preset: 'slow' }
  ][exportQuality] as Mp4Options
}

function getVideoBitsPerSecond(): number {
  return [3_500_000, 8_000_000, 16_000_000][exportQuality] || 8_000_000
}

dlpng.onclick = async () => {
  if (vid) draw(vid.currentTime)
  dlpng.disabled = true
  try {
    const blob = await new Promise<Blob | null>(resolve => output.toBlob(resolve, 'image/png'))
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `glare-frame-${Date.now()}.png`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  } finally {
    dlpng.disabled = false
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
  const beforeRate = vid.playbackRate
  const dur = safeDuration()
  const baseW = output.width
  const baseH = output.height
  if (exportScale < 1) {
    output.width = Math.max(2, Math.round(baseW * exportScale))
    output.height = Math.max(2, Math.round(baseH * exportScale))
  }
  vid.playbackRate = 1
  const stream = output.captureStream(exportFps)
  const recorder = new MediaRecorder(stream, { mimeType: pickMime(), videoBitsPerSecond: getVideoBitsPerSecond() })
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
  stream.getTracks().forEach(track => track.stop())
  vid.pause()
  vid.playbackRate = beforeRate
  if (output.width !== baseW || output.height !== baseH) {
    output.width = baseW
    output.height = baseH
  }
  await seekTo(before)
  draw(vid.currentTime)
  if (!wasPaused) void vid.play()
  return blob
}

function addZoomAt(nx: number, ny: number): void {
  if (!vid) return
  lastZoomTarget = { nx, ny }
  const newZoom: Zoom = { t: vid.currentTime, nx, ny, dur: defaultDur, zoomlvl: 2.6 }
  zooms.push(newZoom)
  zooms.sort((a, b) => a.t - b.t)
  const newIdx = zooms.indexOf(newZoom)
  setZooms(zooms)
  syncZdots()
  selectZoom(newIdx)
  switchTab('zoom')
  draw(vid.currentTime)
}

function clearAllZooms(): void {
  zooms = []
  setZooms(zooms)
  selectZoom(null)
  syncZdots()
  if (vid) draw(vid.currentTime)
}

clearzooms.onclick = clearAllZooms

document.querySelectorAll<HTMLButtonElement>('.speed-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    document.querySelectorAll('.speed-btn').forEach(b => {
      b.classList.toggle('bg-panel-3', b === btn)
      b.classList.toggle('text-text', b === btn)
      b.classList.toggle('bg-[#0a0a0b]', b !== btn)
      b.classList.toggle('text-text-3', b !== btn)
    })
    playrate = Number(btn.dataset.speed || 1)
    if (vid) vid.playbackRate = playrate
  }
})

function seekTo(time: number): Promise<void> {
  return new Promise(resolve => {
    if (!vid) { resolve(); return }
    if (Math.abs(vid.currentTime - time) < .01) { onTU(); resolve(); return }
    vid.onseeked = () => {
      if (!vid) return
      vid.onseeked = null
      onTU()
      resolve()
    }
    vid.currentTime = time
  })
}

declare global {
  interface HTMLVideoElement {
    mozHasAudio?: boolean
    webkitAudioDecodedByteCount?: number
  }
}
