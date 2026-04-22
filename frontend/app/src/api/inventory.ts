import { apiConfig } from './config'
import { request } from './client'
import { getJson, mockOk, setJson } from './mockStorage'

export type InventoryCategory = 'veg' | 'meat' | 'tool'

export interface InventoryItem {
  id: string
  category: InventoryCategory
  nameZh: string
  nameEn: string
  kcalPer100g: number
  unit: string
  thumbnailUrl: string
  sort: number
  updatedAtMs: number
}

export interface InventoryUpsert {
  category: InventoryCategory
  nameZh: string
  nameEn: string
  kcalPer100g: number
  unit: string
  thumbnailUrl: string
}

const STORAGE_KEY = 'mock_inventory_v1'

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`
}

function seedIfEmpty(): InventoryItem[] {
  const existing = getJson<InventoryItem[]>(STORAGE_KEY, [])
  if (existing.length > 0) return existing

  const vegThumb = '/static/images/design/食材库页.png'
  const meatThumb = '/static/images/design/首页.png'
  const toolThumb = '/static/images/design/扩展页.png'

  const veg: Array<Omit<InventoryItem, 'id' | 'updatedAtMs'>> = [
    { category: 'veg', nameZh: '土豆', nameEn: 'Potato', kcalPer100g: 77, unit: 'g', thumbnailUrl: vegThumb, sort: 10 },
    { category: 'veg', nameZh: '胡萝卜', nameEn: 'Carrot', kcalPer100g: 41, unit: 'g', thumbnailUrl: vegThumb, sort: 20 },
    { category: 'veg', nameZh: '花菜', nameEn: 'Cauliflower', kcalPer100g: 25, unit: 'g', thumbnailUrl: vegThumb, sort: 30 },
    { category: 'veg', nameZh: '西葫芦', nameEn: 'Zucchini', kcalPer100g: 17, unit: 'g', thumbnailUrl: vegThumb, sort: 40 },
    { category: 'veg', nameZh: '番茄', nameEn: 'Tomato', kcalPer100g: 18, unit: 'g', thumbnailUrl: vegThumb, sort: 50 },
    { category: 'veg', nameZh: '芹菜', nameEn: 'Celery', kcalPer100g: 16, unit: 'g', thumbnailUrl: vegThumb, sort: 60 },
    { category: 'veg', nameZh: '黄瓜', nameEn: 'Cucumber', kcalPer100g: 15, unit: 'g', thumbnailUrl: vegThumb, sort: 70 },
    { category: 'veg', nameZh: '洋葱', nameEn: 'Onion', kcalPer100g: 40, unit: 'g', thumbnailUrl: vegThumb, sort: 80 },
    { category: 'veg', nameZh: '茄子', nameEn: 'Eggplant', kcalPer100g: 25, unit: 'g', thumbnailUrl: vegThumb, sort: 90 },
    { category: 'veg', nameZh: '菌菇', nameEn: 'Mushroom', kcalPer100g: 22, unit: 'g', thumbnailUrl: vegThumb, sort: 100 },
    { category: 'veg', nameZh: '菠菜', nameEn: 'Spinach', kcalPer100g: 23, unit: 'g', thumbnailUrl: vegThumb, sort: 110 },
    { category: 'veg', nameZh: '生菜', nameEn: 'Lettuce', kcalPer100g: 15, unit: 'g', thumbnailUrl: vegThumb, sort: 120 },
    { category: 'veg', nameZh: '西兰花', nameEn: 'Broccoli', kcalPer100g: 34, unit: 'g', thumbnailUrl: vegThumb, sort: 130 },
    { category: 'veg', nameZh: '彩椒', nameEn: 'Bell Pepper', kcalPer100g: 31, unit: 'g', thumbnailUrl: vegThumb, sort: 140 },
    { category: 'veg', nameZh: '玉米', nameEn: 'Corn', kcalPer100g: 96, unit: 'g', thumbnailUrl: vegThumb, sort: 150 },
    { category: 'veg', nameZh: '南瓜', nameEn: 'Pumpkin', kcalPer100g: 26, unit: 'g', thumbnailUrl: vegThumb, sort: 160 },
    { category: 'veg', nameZh: '芦笋', nameEn: 'Asparagus', kcalPer100g: 20, unit: 'g', thumbnailUrl: vegThumb, sort: 170 },
    { category: 'veg', nameZh: '秋葵', nameEn: 'Okra', kcalPer100g: 33, unit: 'g', thumbnailUrl: vegThumb, sort: 180 },
    { category: 'veg', nameZh: '紫甘蓝', nameEn: 'Red Cabbage', kcalPer100g: 31, unit: 'g', thumbnailUrl: vegThumb, sort: 190 },
    { category: 'veg', nameZh: '菜花', nameEn: 'Cauliflower', kcalPer100g: 25, unit: 'g', thumbnailUrl: vegThumb, sort: 200 },
    { category: 'veg', nameZh: '四季豆', nameEn: 'Green Bean', kcalPer100g: 31, unit: 'g', thumbnailUrl: vegThumb, sort: 210 },
    { category: 'veg', nameZh: '豌豆', nameEn: 'Pea', kcalPer100g: 81, unit: 'g', thumbnailUrl: vegThumb, sort: 220 },
    { category: 'veg', nameZh: '白菜', nameEn: 'Chinese Cabbage', kcalPer100g: 13, unit: 'g', thumbnailUrl: vegThumb, sort: 230 },
    { category: 'veg', nameZh: '包菜', nameEn: 'Cabbage', kcalPer100g: 25, unit: 'g', thumbnailUrl: vegThumb, sort: 240 },
    { category: 'veg', nameZh: '莴笋', nameEn: 'Lettuce Stem', kcalPer100g: 15, unit: 'g', thumbnailUrl: vegThumb, sort: 250 },
    { category: 'veg', nameZh: '豆腐', nameEn: 'Tofu', kcalPer100g: 76, unit: 'g', thumbnailUrl: vegThumb, sort: 260 },
  ]

  const meat: Array<Omit<InventoryItem, 'id' | 'updatedAtMs'>> = [
    { category: 'meat', nameZh: '鸡胸肉', nameEn: 'Chicken Breast', kcalPer100g: 165, unit: 'g', thumbnailUrl: meatThumb, sort: 10 },
    { category: 'meat', nameZh: '鸡腿', nameEn: 'Chicken Leg', kcalPer100g: 215, unit: 'g', thumbnailUrl: meatThumb, sort: 20 },
    { category: 'meat', nameZh: '鸡翅', nameEn: 'Chicken Wing', kcalPer100g: 203, unit: 'g', thumbnailUrl: meatThumb, sort: 30 },
    { category: 'meat', nameZh: '牛里脊', nameEn: 'Beef Tenderloin', kcalPer100g: 218, unit: 'g', thumbnailUrl: meatThumb, sort: 40 },
    { category: 'meat', nameZh: '牛腩', nameEn: 'Beef Brisket', kcalPer100g: 250, unit: 'g', thumbnailUrl: meatThumb, sort: 50 },
    { category: 'meat', nameZh: '猪里脊', nameEn: 'Pork Tenderloin', kcalPer100g: 143, unit: 'g', thumbnailUrl: meatThumb, sort: 60 },
    { category: 'meat', nameZh: '五花肉', nameEn: 'Pork Belly', kcalPer100g: 518, unit: 'g', thumbnailUrl: meatThumb, sort: 70 },
    { category: 'meat', nameZh: '火腿', nameEn: 'Ham', kcalPer100g: 145, unit: 'g', thumbnailUrl: meatThumb, sort: 80 },
    { category: 'meat', nameZh: '香肠', nameEn: 'Sausage', kcalPer100g: 301, unit: 'g', thumbnailUrl: meatThumb, sort: 90 },
    { category: 'meat', nameZh: '鸡蛋', nameEn: 'Egg', kcalPer100g: 155, unit: 'pcs', thumbnailUrl: meatThumb, sort: 100 },
    { category: 'meat', nameZh: '虾仁', nameEn: 'Shrimp', kcalPer100g: 99, unit: 'g', thumbnailUrl: meatThumb, sort: 110 },
    { category: 'meat', nameZh: '鳕鱼', nameEn: 'Cod', kcalPer100g: 82, unit: 'g', thumbnailUrl: meatThumb, sort: 120 },
    { category: 'meat', nameZh: '三文鱼', nameEn: 'Salmon', kcalPer100g: 208, unit: 'g', thumbnailUrl: meatThumb, sort: 130 },
    { category: 'meat', nameZh: '龙利鱼', nameEn: 'Sole', kcalPer100g: 90, unit: 'g', thumbnailUrl: meatThumb, sort: 140 },
    { category: 'meat', nameZh: '鱿鱼', nameEn: 'Squid', kcalPer100g: 92, unit: 'g', thumbnailUrl: meatThumb, sort: 150 },
  ]

  const tool: Array<Omit<InventoryItem, 'id' | 'updatedAtMs'>> = [
    { category: 'tool', nameZh: '平底锅', nameEn: 'Frying Pan', kcalPer100g: 0, unit: 'pcs', thumbnailUrl: toolThumb, sort: 10 },
    { category: 'tool', nameZh: '炒锅', nameEn: 'Wok', kcalPer100g: 0, unit: 'pcs', thumbnailUrl: toolThumb, sort: 20 },
    { category: 'tool', nameZh: '汤锅', nameEn: 'Pot', kcalPer100g: 0, unit: 'pcs', thumbnailUrl: toolThumb, sort: 30 },
    { category: 'tool', nameZh: '蒸锅', nameEn: 'Steamer', kcalPer100g: 0, unit: 'pcs', thumbnailUrl: toolThumb, sort: 40 },
    { category: 'tool', nameZh: '压力锅', nameEn: 'Pressure Cooker', kcalPer100g: 0, unit: 'pcs', thumbnailUrl: toolThumb, sort: 50 },
    { category: 'tool', nameZh: '电饭煲', nameEn: 'Rice Cooker', kcalPer100g: 0, unit: 'pcs', thumbnailUrl: toolThumb, sort: 60 },
    { category: 'tool', nameZh: '空气炸锅', nameEn: 'Air Fryer', kcalPer100g: 0, unit: 'pcs', thumbnailUrl: toolThumb, sort: 70 },
    { category: 'tool', nameZh: '烤箱', nameEn: 'Oven', kcalPer100g: 0, unit: 'pcs', thumbnailUrl: toolThumb, sort: 80 },
    { category: 'tool', nameZh: '刀具', nameEn: 'Knife', kcalPer100g: 0, unit: 'pcs', thumbnailUrl: toolThumb, sort: 90 },
    { category: 'tool', nameZh: '砧板', nameEn: 'Cutting Board', kcalPer100g: 0, unit: 'pcs', thumbnailUrl: toolThumb, sort: 100 },
  ]

  const now = Date.now()
  const seeded = [...veg, ...meat, ...tool].map((x) => ({ ...x, id: uid('inv'), updatedAtMs: now }))
  setJson(STORAGE_KEY, seeded)
  return seeded
}

function readAll(): InventoryItem[] {
  return seedIfEmpty()
}

function writeAll(list: InventoryItem[]): void {
  setJson(STORAGE_KEY, list)
}

export async function listInventory(): Promise<InventoryItem[]> {
  if (!apiConfig.baseUrl) {
    const list = readAll().slice().sort((a, b) => a.sort - b.sort)
    const res = await mockOk(list, 180)
    return res.data
  }
  return await request<InventoryItem[]>({ url: '/api/inventory', method: 'GET' })
}

export async function createInventoryItem(body: InventoryUpsert): Promise<InventoryItem> {
  if (!apiConfig.baseUrl) {
    const list = readAll()
    const next: InventoryItem = {
      id: uid('inv'),
      ...body,
      sort: Math.max(0, ...list.map((x) => x.sort)) + 10,
      updatedAtMs: Date.now(),
    }
    writeAll([...list, next])
    const res = await mockOk(next, 180)
    return res.data
  }
  return await request<InventoryItem, InventoryUpsert>({ url: '/api/inventory', method: 'POST', body })
}

export async function updateInventoryItem(id: string, body: InventoryUpsert & { sort?: number }): Promise<InventoryItem> {
  if (!apiConfig.baseUrl) {
    const list = readAll()
    const idx = list.findIndex((x) => x.id === id)
    if (idx < 0) {
      const res = await mockOk(null as unknown as InventoryItem, 0)
      return res.data
    }
    const prev = list[idx]
    const next: InventoryItem = {
      ...prev,
      ...body,
      sort: body.sort ?? prev.sort,
      updatedAtMs: Date.now(),
    }
    const copy = list.slice()
    copy[idx] = next
    writeAll(copy)
    const res = await mockOk(next, 180)
    return res.data
  }
  return await request<InventoryItem, InventoryUpsert & { sort?: number }>({ url: `/api/inventory/${encodeURIComponent(id)}`, method: 'PUT', body })
}

export async function deleteInventoryItem(id: string): Promise<{ ok: true }> {
  if (!apiConfig.baseUrl) {
    const list = readAll()
    writeAll(list.filter((x) => x.id !== id))
    const res = await mockOk({ ok: true as const }, 180)
    return res.data
  }
  return await request<{ ok: true }>({ url: `/api/inventory/${encodeURIComponent(id)}`, method: 'DELETE' })
}

