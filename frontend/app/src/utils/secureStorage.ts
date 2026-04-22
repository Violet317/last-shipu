import CryptoJS from 'crypto-js'

export interface SecureStorageOptions {
  namespace: string
  keyStorageKey: string
}

export interface SecureStorage {
  getItem<T>(key: string): T | null
  setItem<T>(key: string, value: T): void
  removeItem(key: string): void
}

function randomHex(bytes: number): string {
  const globalCrypto = typeof crypto !== 'undefined' ? crypto : null
  if (globalCrypto && 'getRandomValues' in globalCrypto) {
    const buf = new Uint8Array(bytes)
    globalCrypto.getRandomValues(buf)
    return Array.from(buf)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  return Array.from({ length: bytes }, () => Math.floor(Math.random() * 256))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function getOrCreateKey(keyStorageKey: string): string {
  const existing = uni.getStorageSync(keyStorageKey) as unknown
  if (typeof existing === 'string' && existing.length >= 32) return existing
  const created = randomHex(32)
  uni.setStorageSync(keyStorageKey, created)
  return created
}

export function createSecureStorage(options: SecureStorageOptions): SecureStorage {
  const keyMaterial = getOrCreateKey(options.keyStorageKey)

  const buildKey = (k: string) => `${options.namespace}:${k}`

  return {
    getItem<T>(key: string): T | null {
      const raw = uni.getStorageSync(buildKey(key)) as unknown
      if (typeof raw !== 'string' || raw.length === 0) return null
      try {
        const bytes = CryptoJS.AES.decrypt(raw, keyMaterial)
        const json = bytes.toString(CryptoJS.enc.Utf8)
        if (!json) return null
        return JSON.parse(json) as T
      } catch {
        return null
      }
    },
    setItem<T>(key: string, value: T): void {
      const json = JSON.stringify(value)
      const cipher = CryptoJS.AES.encrypt(json, keyMaterial).toString()
      uni.setStorageSync(buildKey(key), cipher)
    },
    removeItem(key: string): void {
      uni.removeStorageSync(buildKey(key))
    },
  }
}

