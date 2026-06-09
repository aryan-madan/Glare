export let stream: MediaStream | null = null
export let micStream: MediaStream | null = null
export let camStream: MediaStream | null = null

export async function startCapture(): Promise<MediaStream> {
  stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 60 },
    audio: { echoCancellation: false, noiseSuppression: false }
  })
  return stream
}

export async function startMic(deviceId?: string): Promise<MediaStream> {
  micStream = await navigator.mediaDevices.getUserMedia({
    audio: deviceId
      ? { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true }
      : { echoCancellation: true, noiseSuppression: true }
  })
  return micStream
}

export async function startCam(deviceId?: string): Promise<MediaStream> {
  camStream = await navigator.mediaDevices.getUserMedia({
    video: deviceId
      ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
      : { width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false
  })
  return camStream
}

export function stopCapture(): void {
  stream?.getTracks().forEach(t => t.stop())
  stream = null
  micStream?.getTracks().forEach(t => t.stop())
  micStream = null
  camStream?.getTracks().forEach(t => t.stop())
  camStream = null
}

export async function enumerateDevices(): Promise<{ mics: MediaDeviceInfo[]; cams: MediaDeviceInfo[] }> {
  const perm = await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).catch(() =>
    navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null)
  )
  perm?.getTracks().forEach(t => t.stop())
  const all = await navigator.mediaDevices.enumerateDevices()
  return {
    mics: all.filter(d => d.kind === 'audioinput'),
    cams: all.filter(d => d.kind === 'videoinput')
  }
}