import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

describe('inventory store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('fetches and exposes items by category', async () => {
    vi.resetModules()
    vi.doMock('@/api/inventory', async () => ({
      listInventory: vi.fn(async () => [
        {
          id: '1',
          category: 'veg',
          nameZh: '番茄',
          nameEn: 'Tomato',
          kcalPer100g: 18,
          unit: 'g',
          thumbnailUrl: 'x',
          sort: 10,
          updatedAtMs: 1,
        },
        {
          id: '2',
          category: 'tool',
          nameZh: '平底锅',
          nameEn: 'Pan',
          kcalPer100g: 0,
          unit: 'pcs',
          thumbnailUrl: 'y',
          sort: 20,
          updatedAtMs: 1,
        },
      ]),
      createInventoryItem: vi.fn(),
      updateInventoryItem: vi.fn(),
      deleteInventoryItem: vi.fn(),
    }))

    const { useInventoryStore } = await import('./inventory')
    const s = useInventoryStore()
    await s.fetch()
    expect(s.byCategory('veg').map((x) => x.nameZh)).toEqual(['番茄'])
    expect(s.byCategory('tool').map((x) => x.nameZh)).toEqual(['平底锅'])
  })

  it('create/update/remove updates local state and handles errors', async () => {
    vi.resetModules()
    const createInventoryItem = vi.fn(async () => ({
      id: '3',
      category: 'veg',
      nameZh: '黄瓜',
      nameEn: 'Cucumber',
      kcalPer100g: 15,
      unit: 'g',
      thumbnailUrl: 'z',
      sort: 30,
      updatedAtMs: 1,
    }))
    const updateInventoryItem = vi.fn(async (_id: string, body: any) => ({ id: _id, ...body, updatedAtMs: 2 }))
    const deleteInventoryItem = vi.fn(async () => ({ ok: true }))
    const listInventory = vi.fn(async () => [])
    vi.doMock('@/api/inventory', async () => ({
      listInventory,
      createInventoryItem,
      updateInventoryItem,
      deleteInventoryItem,
    }))

    const { useInventoryStore } = await import('./inventory')
    const s = useInventoryStore()
    await s.fetch()
    expect(s.items.length).toBe(0)

    const created = await s.create({
      category: 'veg',
      nameZh: '黄瓜',
      nameEn: 'Cucumber',
      kcalPer100g: 15,
      unit: 'g',
      thumbnailUrl: 'z',
    })
    expect(created?.id).toBe('3')
    expect(s.items.length).toBe(1)

    const updated = await s.update('3', {
      category: 'veg',
      nameZh: '黄瓜',
      nameEn: 'Cucumber',
      kcalPer100g: 16,
      unit: 'g',
      thumbnailUrl: 'z',
      sort: 1,
    })
    expect(updated?.kcalPer100g).toBe(16)

    const removed = await s.remove('3')
    expect(removed).toBe(true)
    expect(s.items.length).toBe(0)

    updateInventoryItem.mockRejectedValueOnce(new Error('x'))
    const bad = await s.update('3', {
      category: 'veg',
      nameZh: 'x',
      nameEn: 'x',
      kcalPer100g: 0,
      unit: 'g',
      thumbnailUrl: 'z',
    })
    expect(bad).toBeNull()
  })
})
