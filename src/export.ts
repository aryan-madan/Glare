import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ff: FFmpeg | null = null

async function getFF(onLog: (s: string) => void): Promise<FFmpeg> {
  if (ff) return ff
  ff = new FFmpeg()
  ff.on('log', ({ message }) => onLog(message))
  const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  await ff.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
  })
  return ff
}

function asBlob(input: Blob | Blob[]): Blob {
  return Array.isArray(input) ? new Blob(input, { type: 'video/webm' }) : input
}

export function dlWebm(input: Blob | Blob[]): void {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(asBlob(input))
  a.download = 'glare.webm'
  a.click()
}

export async function toMp4(
  input: Blob | Blob[],
  onProg: (n: number) => void,
  onLog: (s: string) => void
): Promise<void> {
  const inst = await getFF(onLog)
  inst.on('progress', ({ progress }) => onProg(Math.round(Math.min(progress * 100, 100))))
  await inst.writeFile('in.webm', await fetchFile(asBlob(input)))
  await inst.exec(['-i', 'in.webm', '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-movflags', '+faststart', 'out.mp4'])
  const data = await inst.readFile('out.mp4') as Uint8Array
  const body = new Uint8Array(data)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([body], { type: 'video/mp4' }))
  a.download = 'glare.mp4'
  a.click()
}
