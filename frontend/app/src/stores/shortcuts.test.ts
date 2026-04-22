import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

describe('shortcuts store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('filters enabled shortcuts and preserves order', async () => {
    vi.resetModules()
    vi.doMock('@/api/shortcuts', async () => ({
      listShortcuts: vi.fn(async () => [
        { id: 'a', title: 'A', prompt: 'a', sort: 20, enabled: true, updatedAtMs: 1 },
        { id: 'b', title: 'B', prompt: 'b', sort: 10, enabled: false, updatedAtMs: 1 },
        { id: 'c', title: 'C', prompt: 'c', sort: 30, enabled: true, updatedAtMs: 1 },
      ]),
      createShortcut: vi.fn(),
      updateShortcut: vi.fn(async (_id: string, body: any) => ({ id: _id, ...body, updatedAtMs: 1 })),
      deleteShortcut: vi.fn(),
    }))

    const { useShortcutsStore } = await import('./shortcuts')
    const s = useShortcutsStore()
    await s.fetch()
    expect(s.enabled.map((x) => x.id)).toEqual(['a', 'c'])
  })

  it('supports create/update/remove and move', async () => {
    vi.resetModules()
    const listShortcuts = vi.fn(async () => [
      { id: 'a', title: 'A', prompt: 'a', sort: 10, enabled: true, updatedAtMs: 1 },
      { id: 'b', title: 'B', prompt: 'b', sort: 20, enabled: true, updatedAtMs: 1 },
    ])
    const createShortcut = vi.fn(async (body: any) => ({ id: 'c', ...body, sort: 30, updatedAtMs: 1 }))
    const updateShortcut = vi.fn(async (_id: string, body: any) => ({ id: _id, ...body, updatedAtMs: 2 }))
    const deleteShortcut = vi.fn(async () => ({ ok: true }))
    vi.doMock('@/api/shortcuts', async () => ({
      listShortcuts,
      createShortcut,
      updateShortcut,
      deleteShortcut,
    }))

    const { useShortcutsStore } = await import('./shortcuts')
    const s = useShortcutsStore()
    await s.fetch()
    const created = await s.create({ title: 'C', prompt: 'c', enabled: true })
    expect(created?.id).toBe('c')
    const updated = await s.update('c', { title: 'C2', prompt: 'c2', enabled: false })
    expect(updated?.enabled).toBe(false)

    const moved = await s.move('b', 'up')
    expect(moved).toBe(true)

    const removed = await s.remove('c')
    expect(removed).toBe(true)

    createShortcut.mockRejectedValueOnce(new Error('x'))
    const bad = await s.create({ title: 'x', prompt: 'x', enabled: true })
    expect(bad).toBeNull()
  })
})
