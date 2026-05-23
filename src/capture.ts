export let stream: MediaStream | null = null

export async function startCapture(): Promise<MediaStream> {
    stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 60 },
        audio: { echoCancellation: false, noiseSuppression: false }
    })
    return stream
}

export function stopCapture(): void {
    stream?.getTracks().forEach(t => t.stop())
    stream = null
}