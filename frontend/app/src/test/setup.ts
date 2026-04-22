import { vi } from 'vitest'

const storage = new Map<string, string>()

const uniMock = {
  getStorageSync: (key: string) => storage.get(key) ?? '',
  setStorageSync: (key: string, value: string) => {
    storage.set(key, value)
  },
  removeStorageSync: (key: string) => {
    storage.delete(key)
  },
  showToast: vi.fn(),
  showModal: vi.fn(),
  getSystemInfoSync: () => ({ theme: 'light' }),
  navigateTo: vi.fn(),
  switchTab: vi.fn(),
  navigateBack: vi.fn(),
  request: vi.fn(),
} as const

;(globalThis as unknown as { uni: typeof uniMock }).uni = uniMock

