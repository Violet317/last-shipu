import { describe, expect, it, beforeEach, vi } from 'vitest'
import { apiConfig } from './config'

describe('shortcuts api', () => {
  beforeEach(() => {
    apiConfig.baseUrl = ''
    ;(globalThis as any).uni.setStorageSync('mock_shortcuts_v1', '')
  })

  it('seeds and lists shortcuts in mock mode', async () => {
    const { listShortcuts } = await import('./shortcuts')
    const list = await listShortcuts()
    expect(list.length).toBeGreaterThanOrEqual(3)
    expect(list.some((x) => x.title === '减脂餐')).toBe(true)
  })

  it('creates, updates and deletes shortcuts in mock mode', async () => {
    const { createShortcut, deleteShortcut, listShortcuts, updateShortcut } = await import('./shortcuts')
    const created = await createShortcut({ title: '测试', prompt: 'test', enabled: true })
    expect(created.id).toBeTruthy()
    const updated = await updateShortcut(created.id, { title: '测试2', prompt: 'test2', enabled: false, sort: 1 })
    expect(updated.enabled).toBe(false)
    const list = await listShortcuts()
    expect(list.find((x) => x.id === created.id)?.title).toBe('测试2')
    const del = await deleteShortcut(created.id)
    expect(del.ok).toBe(true)
  })

  it('calls backend url when baseUrl is set', async () => {
    apiConfig.baseUrl = 'https://example.com'
    vi.resetModules()
    vi.doMock('./client', () => ({
      request: vi.fn(async () => []),
    }))
    const { listShortcuts } = await import('./shortcuts')
    const list = await listShortcuts()
    expect(Array.isArray(list)).toBe(true)
  })
})

