import { getJson, setJson } from '@/api/mockStorage'

export function runMigrations(): void {
  const invKey = 'mock_inventory_v1'
  const scKey = 'mock_shortcuts_v1'

  const inv = getJson<unknown>(invKey, null)
  if (!Array.isArray(inv)) setJson(invKey, [])

  const sc = getJson<unknown>(scKey, null)
  if (!Array.isArray(sc)) setJson(scKey, [])
}

