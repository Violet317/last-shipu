import { apiConfig } from './config'
import { request } from './client'
import { getJson, mockOk, setJson } from './mockStorage'

export interface ShoppingItem {
  id: string
  name: string
  qty?: number
  checked: boolean
  updatedAtMs: number
}

export interface ShoppingUpsert {
  name: string
  qty?: number
  checked?: boolean
}

const STORAGE_KEY = 'mock_shopping_v1'

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`
}

function readAll(): ShoppingItem[] {
  return getJson<ShoppingItem[]>(STORAGE_KEY, [])
}

function writeAll(list: ShoppingItem[]): void {
  setJson(STORAGE_KEY, list)
}

export async function listShopping(): Promise<ShoppingItem[]> {
  if (!apiConfig.baseUrl) {
    const list = readAll().slice().sort((a, b) => Number(a.checked) - Number(b.checked) || b.updatedAtMs - a.updatedAtMs)
    const res = await mockOk(list, 120)
    return res.data
  }
  return await request<ShoppingItem[]>({ url: '/api/shopping', method: 'GET' })
}

export async function createShoppingItem(body: ShoppingUpsert): Promise<ShoppingItem> {
  if (!apiConfig.baseUrl) {
    const list = readAll()
    const next: ShoppingItem = {
      id: uid('shop'),
      name: body.name,
      qty: body.qty,
      checked: body.checked ?? false,
      updatedAtMs: Date.now(),
    }
    writeAll([...list, next])
    const res = await mockOk(next, 120)
    return res.data
  }
  return await request<ShoppingItem, ShoppingUpsert>({ url: '/api/shopping', method: 'POST', body })
}

export async function updateShoppingItem(id: string, body: Partial<ShoppingUpsert>): Promise<ShoppingItem> {
  if (!apiConfig.baseUrl) {
    const list = readAll()
    const idx = list.findIndex((x) => x.id === id)
    if (idx < 0) {
      const res = await mockOk(null as unknown as ShoppingItem, 0)
      return res.data
    }
    const prev = list[idx]
    const next: ShoppingItem = {
      ...prev,
      name: body.name ?? prev.name,
      qty: body.qty === undefined ? prev.qty : body.qty,
      checked: body.checked ?? prev.checked,
      updatedAtMs: Date.now(),
    }
    const copy = list.slice()
    copy[idx] = next
    writeAll(copy)
    const res = await mockOk(next, 120)
    return res.data
  }
  return await request<ShoppingItem, Partial<ShoppingUpsert>>({
    url: `/api/shopping/${encodeURIComponent(id)}`,
    method: 'PUT',
    body,
  })
}

export async function deleteShoppingItem(id: string): Promise<{ ok: true }> {
  if (!apiConfig.baseUrl) {
    writeAll(readAll().filter((x) => x.id !== id))
    const res = await mockOk({ ok: true as const }, 120)
    return res.data
  }
  return await request<{ ok: true }>({ url: `/api/shopping/${encodeURIComponent(id)}`, method: 'DELETE' })
}

