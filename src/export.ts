import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'

let ffmpeg: FFmpeg | null = null

export interface Mp4Options {
  crf: number
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
): Promise<void> {
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
    '-i',
    'input.webm',
    '-c:v',
    'libx264',
    '-crf',
    String(options.crf),
    '-preset',
    options.preset,
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    'output.mp4',
  ])

  const data = await ff.readFile('output.mp4')

  if (!(data instanceof Uint8Array) || data.length === 0) {
    throw new Error('Failed to generate MP4')
  }

  const out = new Uint8Array(data)

  download(
    new Blob([out], {
      type: 'video/mp4',
    }),
    'glare.mp4'
  )
}

export async function toGif(
  input: Blob | Blob[],
  onProg: (n: number) => void,
  onLog: (s: string) => void
): Promise<void> {
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
    '-i',
    'input.webm',
    '-vf',
    'fps=15,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
    '-loop',
    '0',
    'output.gif',
  ])

  const data = await ff.readFile('output.gif')

  if (!(data instanceof Uint8Array) || data.length === 0) {
    throw new Error('Failed to generate GIF')
  }

  const out = new Uint8Array(data)

  download(
    new Blob([out], {
      type: 'image/gif',
    }),
    'glare.gif'
  )
}