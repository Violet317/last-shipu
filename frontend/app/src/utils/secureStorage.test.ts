import { describe, expect, it } from 'vitest'
import { createSecureStorage } from './secureStorage'

describe('secureStorage', () => {
  it('stores encrypted json and returns typed value', () => {
    const s = createSecureStorage({ namespace: 'ns', keyStorageKey: '__k__' })
    s.setItem('a', { x: 1, y: 'ok' })
    const v = s.getItem<{ x: number; y: string }>('a')
    expect(v).toEqual({ x: 1, y: 'ok' })
    s.removeItem('a')
    expect(s.getItem('a')).toBeNull()
  })

  it('returns null for invalid payload and works without crypto.getRandomValues', () => {
    const s = createSecureStorage({ namespace: 'ns2', keyStorageKey: '__k2__' })

    ;(globalThis as any).uni.setStorageSync('ns2:bad', 'not-a-cipher')
    expect(s.getItem('bad')).toBeNull()
  })
})
