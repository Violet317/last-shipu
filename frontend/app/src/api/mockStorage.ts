import type { ApiResponse } from './types'

export function sleep(ms: number): Promise<void> {
  return new Promise<void>((r) => setTimeout(r, ms))
}

export function getJson<T>(key: string, fallback: T): T {
  try {
    const raw = uni.getStorageSync(key) as unknown
    if (!raw) return fallback
    if (typeof raw === 'string') return JSON.parse(raw) as T
    return raw as T
  } catch {
    return fallback
  }
}

export function setJson<T>(key: string, value: T): void {
  uni.setStorageSync(key, JSON.stringify(value))
}

export async function mockOk<T>(data: T, delayMs = 180): Promise<ApiResponse<T>> {
  await sleep(delayMs)
  return { code: '0', message: 'OK', data }
}

