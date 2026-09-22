function waitEvent(video: HTMLVideoElement, event: 'loadeddata' | 'seeked', timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting ${event}`)), timeoutMs)
    const onDone = () => {
      clearTimeout(timer)
      video.removeEventListener(event, onDone)
      resolve()
    }
    video.addEventListener(event, onDone)
  })
}

export async function captureVideoThumbnail(file: File): Promise<Blob | null> {
  let url: string | null = null
  try {
    url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = url
    video.load()

    await waitEvent(video, 'loadeddata', 15000)
    if (video.videoWidth === 0 || video.videoHeight === 0) return null

    if (video.currentTime > 0.05) {
      await waitEvent(video, 'seeked', 5000)
    } else {
      video.currentTime = 0.1
      await waitEvent(video, 'seeked', 5000)
    }
    if (video.videoWidth === 0 || video.videoHeight === 0) return null

    const canvas = document.createElement('canvas')
    const scale = Math.min(1, 640 / video.videoWidth)
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.7))
    return blob
  } catch (err) {
    console.error('Thumbnail fallito per', file.name, err)
    return null
  } finally {
    if (url) URL.revokeObjectURL(url)
  }
}