export interface SecureStorageOptions {
  namespace: string
  keyStorageKey: string
}

export interface SecureStorage {
  getItem<T>(key: string): T | null
  setItem<T>(key: string, value: T): void
  removeItem(key: string): void
}

export function createSecureStorage(options: SecureStorageOptions): SecureStorage {
  const buildKey = (k: string) => `${options.namespace}:${k}`

  return {
    getItem<T>(key: string): T | null {
      const raw = uni.getStorageSync(buildKey(key)) as unknown
      if (typeof raw !== 'string' || raw.length === 0) return null
      try {
        return JSON.parse(raw) as T
      } catch {
        return null
      }
    },
    setItem<T>(key: string, value: T): void {
      uni.setStorageSync(buildKey(key), JSON.stringify(value))
    },
    removeItem(key: string): void {
      uni.removeStorageSync(buildKey(key))
    },
  }
}
