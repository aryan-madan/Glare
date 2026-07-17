import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'

let ffmpeg: FFmpeg | null = null

export interface Mp4Options {
  crf: number
  fps: number
  preset:
  | 'ultrafast'
  | 'superfast'
  | 'veryfast'
  | 'faster'
  | 'fast'
  | 'medium'
  | 'slow'
}

async function getFF(
  onLog: (s: string) => void
): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg

  const ff = new FFmpeg()

  ff.on('log', ({ message }) => {
    onLog(message)
  })

  const base = `${window.location.origin}/ffmpeg`

  await ff.load({
    coreURL: `${base}/ffmpeg-core.js`,
    wasmURL: `${base}/ffmpeg-core.wasm`,
  })

  ffmpeg = ff

  return ff
}

function asBlob(input: Blob | Blob[]): Blob {
  return Array.isArray(input)
    ? new Blob(input, { type: 'video/webm' })
    : input
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')

  a.href = url
  a.download = filename

  document.body.appendChild(a)
  a.click()
  a.remove()

  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 3000)
}

export function dlWebm(input: Blob | Blob[]): void {
  download(asBlob(input), 'glare.webm')
}

export async function toMp4(
  input: Blob | Blob[],
  options: Mp4Options,
  onProg: (n: number) => void,
  onLog: (s: string) => void
): Promise<Blob> {
  const ff = await getFF(onLog)

  ff.on('progress', ({ progress }) => {
    onProg(Math.round(progress * 100))
  })

  await ff.writeFile(
    'input.webm',
    await fetchFile(asBlob(input))
  )

  await ff.exec([
    '-y',
    '-fflags', '+genpts+igndts',
    '-i', 'input.webm',
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-c:v', 'libx264',
    '-crf', String(options.crf),
    '-preset', options.preset,
    '-profile:v', 'main',
    '-level', '4.0',
    '-r', String(options.fps),
    '-vsync', 'cfr',
    '-g', String(options.fps * 2),
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '48000',
    '-ac', '2',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-max_muxing_queue_size', '9999',
    'output.mp4',
  ])

  const data = await ff.readFile('output.mp4')

  if (!(data instanceof Uint8Array) || data.length === 0) {
    throw new Error('Failed to generate MP4')
  }

  const out = new Uint8Array(data)
  const blob = new Blob([out], { type: 'video/mp4' })

  download(blob, `glare-export-${Date.now()}.mp4`)

  return blob
}

export async function toGif(
  input: Blob | Blob[],
  onProg: (n: number) => void,
  onLog: (s: string) => void
): Promise<Blob> {
  const ff = await getFF(onLog)

  ff.on('progress', ({ progress }) => {
    onProg(Math.round(progress * 100))
  })

  await ff.writeFile(
    'input.webm',
    await fetchFile(asBlob(input))
  )

  await ff.exec([
    '-y',
    '-fflags', '+genpts+igndts',
    '-i',
    'input.webm',
    '-vf',
    'scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=18,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=192:reserve_transparent=0[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4',
    '-loop',
    '0',
    '-max_muxing_queue_size', '9999',
    'output.gif',
  ])

  const data = await ff.readFile('output.gif')

  if (!(data instanceof Uint8Array) || data.length === 0) {
    throw new Error('Failed to generate GIF')
  }

  const out = new Uint8Array(data)
  const blob = new Blob([out], { type: 'image/gif' })

  download(blob, `glare-export-${Date.now()}.gif`)

  return blob
}