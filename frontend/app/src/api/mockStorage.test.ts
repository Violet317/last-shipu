import { describe, expect, it } from 'vitest'
import { getJson, setJson } from './mockStorage'

describe('mockStorage', () => {
  it('setJson/getJson roundtrip and fallback on invalid json', () => {
    setJson('k1', { a: 1 })
    expect(getJson('k1', { a: 0 })).toEqual({ a: 1 })
    ;(globalThis as any).uni.setStorageSync('k2', '{bad json')
    expect(getJson('k2', { ok: true })).toEqual({ ok: true })
  })
})

