export interface Base64Result {
  dataUrl: string
  bytes: number
  mime: string
}

export async function pathToBase64(path: string): Promise<string> {
  return (await pathToBase64WithMeta(path)).dataUrl
}

export async function pathToBase64WithMeta(path: string): Promise<Base64Result> {
  const anyUni = uni as unknown as { getFileSystemManager?: () => any }
  if (typeof anyUni.getFileSystemManager === 'function') {
    const fsm = anyUni.getFileSystemManager()
    const base64: string = await new Promise((resolve, reject) => {
      fsm.readFile({
        filePath: path,
        encoding: 'base64',
        success: (res: { data: string }) => resolve(res.data),
        fail: (err: unknown) => reject(err),
      })
    })
    const bytes = Math.floor((base64.length * 3) / 4)
    return { dataUrl: `data:image/jpeg;base64,${base64}`, bytes, mime: 'image/jpeg' }
  }

  const res = await fetch(path)
  const blob = await res.blob()
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('read base64 failed'))
    reader.readAsDataURL(blob)
  })
  const m = /^data:([^;]+);base64,/.exec(dataUrl)
  return { dataUrl, bytes: blob.size, mime: m?.[1] ?? blob.type ?? '' }
}

export async function getFileSizeBytes(filePath: string): Promise<number> {
  try {
    const info = await uni.getFileInfo({ filePath })
    return info.size
  } catch {
    const res = await fetch(filePath)
    const blob = await res.blob()
    return blob.size
  }
}

export type CanvasFileType = 'jpg' | 'png'

export interface CanvasToTempFileLimitOptions {
  canvasId: string
  destWidth: number
  destHeight: number
  fileType: CanvasFileType
  maxBytes: number
  initialQuality?: number
  minQuality?: number
  qualityStep?: number
}

export async function canvasToTempFilePathWithLimit(
  opts: CanvasToTempFileLimitOptions
): Promise<{ tempFilePath: string; bytes: number; quality: number }> {
  const initialQuality = opts.initialQuality ?? 0.92
  const minQuality = opts.minQuality ?? 0.5
  const qualityStep = opts.qualityStep ?? 0.08

  let quality = initialQuality
  while (true) {
    const tempFilePath = await new Promise<string>((resolve, reject) => {
      uni.canvasToTempFilePath({
        canvasId: opts.canvasId,
        destWidth: opts.destWidth,
        destHeight: opts.destHeight,
        fileType: opts.fileType,
        quality,
        success: (r) => resolve(r.tempFilePath),
        fail: (e) => reject(e),
      })
    })

    const bytes = await getFileSizeBytes(tempFilePath)
    if (bytes <= opts.maxBytes) return { tempFilePath, bytes, quality }

    if (opts.fileType !== 'jpg') return { tempFilePath, bytes, quality }

    const nextQuality = Number((quality - qualityStep).toFixed(2))
    if (nextQuality < minQuality) return { tempFilePath, bytes, quality }
    quality = nextQuality
  }
}
