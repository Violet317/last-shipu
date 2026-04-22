import { apiConfig } from './config'
import { request } from './client'
import { getJson, mockOk, setJson } from './mockStorage'

export interface ShortcutTemplate {
  id: string
  title: string
  prompt: string
  sort: number
  enabled: boolean
  updatedAtMs: number
}

export interface ShortcutUpsert {
  title: string
  prompt: string
  enabled: boolean
}

const STORAGE_KEY = 'mock_shortcuts_v1'

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`
}

function seedIfEmpty(): ShortcutTemplate[] {
  const existing = getJson<ShortcutTemplate[]>(STORAGE_KEY, [])
  if (existing.length > 0) return existing
  const now = Date.now()
  const seeded: ShortcutTemplate[] = [
    {
      id: uid('sc'),
      title: '减脂餐',
      prompt: '请生成一份减脂餐：高蛋白、低油低盐，优先使用我已选食材，给出详细步骤与热量估算。',
      sort: 10,
      enabled: true,
      updatedAtMs: now,
    },
    {
      id: uid('sc'),
      title: '快手菜',
      prompt: '请生成一份快手菜：15分钟内完成，步骤尽量少，调味简单，优先使用我已选食材。',
      sort: 20,
      enabled: true,
      updatedAtMs: now,
    },
    {
      id: uid('sc'),
      title: '创意菜',
      prompt: '请根据我已选食材做一道创意菜：口味有亮点，搭配合理，给出摆盘建议与替代食材。',
      sort: 30,
      enabled: true,
      updatedAtMs: now,
    },
  ]
  setJson(STORAGE_KEY, seeded)
  return seeded
}

function readAll(): ShortcutTemplate[] {
  return seedIfEmpty()
}

function writeAll(list: ShortcutTemplate[]): void {
  setJson(STORAGE_KEY, list)
}

export async function listShortcuts(): Promise<ShortcutTemplate[]> {
  if (!apiConfig.baseUrl) {
    const list = readAll().slice().sort((a, b) => a.sort - b.sort)
    const res = await mockOk(list, 160)
    return res.data
  }
  return await request<ShortcutTemplate[]>({ url: '/api/shortcuts', method: 'GET' })
}

export async function createShortcut(body: ShortcutUpsert): Promise<ShortcutTemplate> {
  if (!apiConfig.baseUrl) {
    const list = readAll()
    const next: ShortcutTemplate = {
      id: uid('sc'),
      ...body,
      sort: Math.max(0, ...list.map((x) => x.sort)) + 10,
      updatedAtMs: Date.now(),
    }
    writeAll([...list, next])
    const res = await mockOk(next, 160)
    return res.data
  }
  return await request<ShortcutTemplate, ShortcutUpsert>({ url: '/api/shortcuts', method: 'POST', body })
}

export async function updateShortcut(id: string, body: ShortcutUpsert & { sort?: number }): Promise<ShortcutTemplate> {
  if (!apiConfig.baseUrl) {
    const list = readAll()
    const idx = list.findIndex((x) => x.id === id)
    if (idx < 0) {
      const res = await mockOk(null as unknown as ShortcutTemplate, 0)
      return res.data
    }
    const prev = list[idx]
    const next: ShortcutTemplate = {
      ...prev,
      ...body,
      sort: body.sort ?? prev.sort,
      updatedAtMs: Date.now(),
    }
    const copy = list.slice()
    copy[idx] = next
    writeAll(copy)
    const res = await mockOk(next, 160)
    return res.data
  }
  return await request<ShortcutTemplate, ShortcutUpsert & { sort?: number }>({ url: `/api/shortcuts/${encodeURIComponent(id)}`, method: 'PUT', body })
}

export async function deleteShortcut(id: string): Promise<{ ok: true }> {
  if (!apiConfig.baseUrl) {
    const list = readAll()
    writeAll(list.filter((x) => x.id !== id))
    const res = await mockOk({ ok: true as const }, 160)
    return res.data
  }
  return await request<{ ok: true }>({ url: `/api/shortcuts/${encodeURIComponent(id)}`, method: 'DELETE' })
}

