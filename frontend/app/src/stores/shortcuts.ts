import { defineStore, type DefineStoreOptions } from 'pinia'
import { createShortcut, deleteShortcut, listShortcuts, updateShortcut, type ShortcutTemplate, type ShortcutUpsert } from '@/api/shortcuts'

export interface ShortcutsState {
  loading: boolean
  list: ShortcutTemplate[]
  error: string
}

export interface ShortcutsGetters {
  enabled(state: ShortcutsState): ShortcutTemplate[]
}

export interface ShortcutsActions {
  fetch(): Promise<void>
  create(body: ShortcutUpsert): Promise<ShortcutTemplate | null>
  update(id: string, body: ShortcutUpsert & { sort?: number }): Promise<ShortcutTemplate | null>
  remove(id: string): Promise<boolean>
  move(id: string, dir: 'up' | 'down'): Promise<boolean>
}

type ShortcutsStoreOptions = Omit<DefineStoreOptions<'shortcuts', ShortcutsState, ShortcutsGetters, ShortcutsActions>, 'id'>

function sortAsc(a: ShortcutTemplate, b: ShortcutTemplate): number {
  return a.sort - b.sort
}

function normalizeSort(list: ShortcutTemplate[]): ShortcutTemplate[] {
  const sorted = list.slice().sort(sortAsc)
  return sorted.map((x, idx) => ({ ...x, sort: (idx + 1) * 10 }))
}

const shortcutsStoreOptions = {
  state: (): ShortcutsState => ({
    loading: false,
    list: [],
    error: '',
  }),
  getters: {
    enabled: (state: ShortcutsState) => state.list.filter((x) => x.enabled).slice().sort(sortAsc),
  },
  actions: {
    async fetch() {
      if (this.loading) return
      this.loading = true
      this.error = ''
      try {
        this.list = (await listShortcuts()).slice().sort(sortAsc)
      } catch (e) {
        this.error = e instanceof Error ? e.message : '加载失败'
      } finally {
        this.loading = false
      }
    },
    async create(body) {
      try {
        const created = await createShortcut(body)
        this.list = [...this.list, created].slice().sort(sortAsc)
        return created
      } catch (e) {
        uni.showToast({ title: e instanceof Error ? e.message : '新增失败', icon: 'none' })
        return null
      }
    },
    async update(id, body) {
      try {
        const updated = await updateShortcut(id, body)
        this.list = this.list.map((x) => (x.id === id ? updated : x)).slice().sort(sortAsc)
        return updated
      } catch (e) {
        uni.showToast({ title: e instanceof Error ? e.message : '更新失败', icon: 'none' })
        return null
      }
    },
    async remove(id) {
      try {
        await deleteShortcut(id)
        this.list = this.list.filter((x) => x.id !== id).slice().sort(sortAsc)
        return true
      } catch (e) {
        uni.showToast({ title: e instanceof Error ? e.message : '删除失败', icon: 'none' })
        return false
      }
    },
    async move(id, dir) {
      const idx = this.list.slice().sort(sortAsc).findIndex((x) => x.id === id)
      if (idx < 0) return false
      const target = dir === 'up' ? idx - 1 : idx + 1
      const sorted = this.list.slice().sort(sortAsc)
      if (target < 0 || target >= sorted.length) return false

      const copy = sorted.slice()
      const t = copy[idx]
      copy[idx] = copy[target]
      copy[target] = t

      const normalized = normalizeSort(copy)
      this.list = normalized

      const a = normalized[idx]
      const b = normalized[target]
      const okA = await this.update(a.id, { title: a.title, prompt: a.prompt, enabled: a.enabled, sort: a.sort })
      const okB = await this.update(b.id, { title: b.title, prompt: b.prompt, enabled: b.enabled, sort: b.sort })
      return Boolean(okA && okB)
    },
  },
} satisfies ShortcutsStoreOptions

export const useShortcutsStore = defineStore('shortcuts', shortcutsStoreOptions)

