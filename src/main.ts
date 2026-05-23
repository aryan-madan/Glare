import { startCapture, stopCapture } from './capture'
import { initLens, showLens } from './lens'
import { dlWebm, exportMp4 } from './export'

const preview = document.getElementById('preview') as HTMLVideoElement
const playback = document.getElementById('playback') as HTMLVideoElement
const lens = document.getElementById('lens') as HTMLCanvasElement
const recbtn = document.getElementById('recbtn') as HTMLButtonElement
const stopbtn = document.getElementById('stopbtn') as HTMLButtonElement
const again = document.getElementById('again') as HTMLButtonElement
const dlwebm = document.getElementById('dlwebm') as HTMLButtonElement
const dlmp4 = document.getElementById('dlmp4') as HTMLButtonElement
const dot = document.getElementById('dot') as HTMLDivElement
const timerEl = document.getElementById('timer') as HTMLSpanElement
const stage = document.getElementById('stage') as HTMLDivElement
const editor = document.getElementById('editor') as HTMLDivElement
const progress = document.getElementById('progress') as HTMLDivElement
const bar = document.getElementById('bar') as HTMLDivElement
const hint = document.getElementById('hint') as HTMLDivElement

let chunks: Blob[] = []
let rec: MediaRecorder | null = null
let secs = 0
let tick: ReturnType<typeof setInterval> | null = null

initLens(lens, preview)

recbtn.onclick = async () => {
  const s = await startCapture()
  preview.srcObject = s
  chunks = []
  rec = new MediaRecorder(s, { mimeType: 'video/webm;codecs=vp9,opus' })
  rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
  rec.onstop = showEditor
  rec.start(1000)
  recbtn.disabled = true
  stopbtn.disabled = false
  dot.classList.add('active')
  hint.classList.add('visible')
  secs = 0
  tick = setInterval(() => {
    secs++
    timerEl.textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`
  }, 1000)
  s.getVideoTracks()[0].onended = () => stopbtn.click()
}

stopbtn.onclick = () => {
  rec?.stop()
  stopCapture()
  if (tick) clearInterval(tick)
  dot.classList.remove('active')
  hint.classList.remove('visible')
  recbtn.disabled = false
  stopbtn.disabled = true
  timerEl.textContent = '00:00'
}

function showEditor(): void {
  const blob = new Blob(chunks, { type: 'video/webm' })
  playback.src = URL.createObjectURL(blob)
  stage.style.display = 'none'
  editor.classList.remove('hidden')
}

again.onclick = () => {
  editor.classList.add('hidden')
  stage.style.display = ''
  playback.src = ''
  chunks = []
}

dlwebm.onclick = () => dlWebm(chunks)

dlmp4.onclick = async () => {
  dlmp4.disabled = true
  progress.classList.remove('hidden')
  await exportMp4(chunks, p => { bar.style.width = p + '%' })
  progress.classList.add('hidden')
  bar.style.width = '0%'
  dlmp4.disabled = false
}

preview.addEventListener('click', e => showLens(e.clientX, e.clientY))