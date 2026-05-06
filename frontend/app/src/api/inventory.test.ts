import { describe, expect, it, beforeEach, vi } from 'vitest'
import { apiConfig } from './config'

describe('inventory api', () => {
  beforeEach(() => {
    apiConfig.baseUrl = ''
    ;(globalThis as any).uni.setStorageSync('mock_inventory_v1', '')
  })

  it('seeds and lists inventory in mock mode', async () => {
    const { listInventory } = await import('./inventory')
    const list = await listInventory()
    expect(list.length).toBeGreaterThan(30)
    expect(list.some((x) => x.category === 'veg' && x.nameZh && x.nameEn)).toBe(true)
    expect(list.some((x) => x.category === 'meat')).toBe(true)
    expect(list.some((x) => x.category === 'tool')).toBe(true)
  })

  it('creates, updates and deletes inventory in mock mode', async () => {
    const { createInventoryItem, deleteInventoryItem, listInventory, updateInventoryItem } = await import('./inventory')
    const created = await createInventoryItem({
      category: 'veg',
      nameZh: '西芹',
      nameEn: 'Celery',
      kcalPer100g: 16,
      unit: 'g',
      thumbnailUrl: '/static/images/design/ingredients.png',
    })
    expect(created.id).toBeTruthy()

    const updated = await updateInventoryItem(created.id, {
      category: 'veg',
      nameZh: '西芹',
      nameEn: 'Celery',
      kcalPer100g: 17,
      unit: 'g',
      thumbnailUrl: '/static/images/design/ingredients.png',
      sort: 5,
    })
    expect(updated.kcalPer100g).toBe(17)

    const list = await listInventory()
    expect(list.find((x) => x.id === created.id)?.sort).toBe(5)

    const del = await deleteInventoryItem(created.id)
    expect(del.ok).toBe(true)
    const list2 = await listInventory()
    expect(list2.some((x) => x.id === created.id)).toBe(false)
  })

  it('calls backend url when baseUrl is set', async () => {
    apiConfig.baseUrl = 'https://example.com'
    vi.resetModules()
    vi.doMock('./client', () => ({
      request: vi.fn(async () => []),
    }))
    const { listInventory } = await import('./inventory')
    const list = await listInventory()
    expect(Array.isArray(list)).toBe(true)
  })
})

