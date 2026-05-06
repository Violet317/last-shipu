import { apiConfig } from './config'
import { request } from './client'
import { getJson, mockOk, setJson } from './mockStorage'

export type PantryStorage = 'fridge' | 'freezer' | 'room'
export type PantrySource = 'manual' | 'ocr_receipt' | 'ocr_fridge'

export interface PantryItem {
  id: string
  inventoryId: string
  storage: PantryStorage
  purchasedAtMs: number
  expiresAtMs: number
  source: PantrySource
  qty?: number
  updatedAtMs: number
}

export interface PantryUpsert {
  inventoryId: string
  storage: PantryStorage
  purchasedAtMs: number
  expiresAtMs: number
  source: PantrySource
  qty?: number
}

const STORAGE_KEY = 'mock_pantry_v1'

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`
}

function readAll(): PantryItem[] {
  return getJson<PantryItem[]>(STORAGE_KEY, [])
}

function writeAll(list: PantryItem[]): void {
  setJson(STORAGE_KEY, list)
}

export async function listPantry(): Promise<PantryItem[]> {
  if (!apiConfig.baseUrl) {
    const list = readAll().slice().sort((a, b) => a.expiresAtMs - b.expiresAtMs)
    const res = await mockOk(list, 120)
    return res.data
  }
  return await request<PantryItem[]>({ url: '/api/pantry', method: 'GET' })
}

export async function createPantryItem(body: PantryUpsert): Promise<PantryItem> {
  if (!apiConfig.baseUrl) {
    const list = readAll()
    const next: PantryItem = { id: uid('pan'), ...body, updatedAtMs: Date.now() }
    writeAll([...list, next])
    const res = await mockOk(next, 120)
    return res.data
  }
  return await request<PantryItem, PantryUpsert>({ url: '/api/pantry', method: 'POST', body })
}

export async function updatePantryItem(id: string, body: Partial<PantryUpsert>): Promise<PantryItem> {
  if (!apiConfig.baseUrl) {
    const list = readAll()
    const idx = list.findIndex((x) => x.id === id)
    if (idx < 0) {
      const res = await mockOk(null as unknown as PantryItem, 0)
      return res.data
    }
    const prev = list[idx]
    const next: PantryItem = { ...prev, ...body, updatedAtMs: Date.now() }
    const copy = list.slice()
    copy[idx] = next
    writeAll(copy)
    const res = await mockOk(next, 120)
    return res.data
  }
  return await request<PantryItem, Partial<PantryUpsert>>({ url: `/api/pantry/${encodeURIComponent(id)}`, method: 'PUT', body })
}

export async function deletePantryItem(id: string): Promise<{ ok: true }> {
  if (!apiConfig.baseUrl) {
    const list = readAll()
    writeAll(list.filter((x) => x.id !== id))
    const res = await mockOk({ ok: true as const }, 120)
    return res.data
  }
  return await request<{ ok: true }>({ url: `/api/pantry/${encodeURIComponent(id)}`, method: 'DELETE' })
}

