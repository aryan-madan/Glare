import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ff: FFmpeg | null = null

async function initFF(): Promise<FFmpeg> {
    if (ff) return ff
    ff = new FFmpeg()
    const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
    await ff.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    return ff
}

export function dlWebm(chunks: Blob[]): void {
    const blob = new Blob(chunks, { type: 'video/webm' })
    dl(blob, 'glare.webm')
}

export async function exportMp4(chunks: Blob[], onProgress: (n: number) => void): Promise<void> {
    const inst = await initFF()
    inst.on('progress', ({ progress }) => onProgress(Math.round(progress * 100)))
    const blob = new Blob(chunks, { type: 'video/webm' })
    await inst.writeFile('in.webm', await fetchFile(blob))
    await inst.exec(['-i', 'in.webm', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', 'out.mp4'])
    const data = await inst.readFile('out.mp4') as Uint8Array
    dl(new Blob([data.buffer], { type: 'video/mp4' }), 'glare.mp4')
}

function dl(blob: Blob, name: string): void {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
}