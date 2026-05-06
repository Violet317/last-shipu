import { defineStore, type DefineStoreOptions } from 'pinia'
import { createPantryItem, deletePantryItem, listPantry, updatePantryItem, type PantryItem, type PantryUpsert } from '@/api/pantry'

export interface PantryState {
  loading: boolean
  items: PantryItem[]
  error: string
}

export interface PantryGetters {
  byInventoryId(state: PantryState): (inventoryId: string) => PantryItem[]
}

export interface PantryActions {
  fetch(): Promise<void>
  create(body: PantryUpsert): Promise<PantryItem | null>
  update(id: string, body: Partial<PantryUpsert>): Promise<PantryItem | null>
  remove(id: string): Promise<boolean>
  removeByInventoryId(inventoryId: string): Promise<number>
}

type PantryStoreOptions = Omit<DefineStoreOptions<'pantry', PantryState, PantryGetters, PantryActions>, 'id'>

const pantryStoreOptions = {
  state: (): PantryState => ({
    loading: false,
    items: [],
    error: '',
  }),
  getters: {
    byInventoryId: (state: PantryState) => (inventoryId: string) =>
      state.items.filter((x) => x.inventoryId === inventoryId).slice().sort((a, b) => a.expiresAtMs - b.expiresAtMs),
  },
  actions: {
    async fetch() {
      if (this.loading) return
      this.loading = true
      this.error = ''
      try {
        this.items = await listPantry()
      } catch (e) {
        this.error = e instanceof Error ? e.message : '加载失败'
      } finally {
        this.loading = false
      }
    },
    async create(body) {
      try {
        const created = await createPantryItem(body)
        this.items = [...this.items, created].slice().sort((a, b) => a.expiresAtMs - b.expiresAtMs)
        return created
      } catch (e) {
        uni.showToast({ title: e instanceof Error ? e.message : '入库失败', icon: 'none' })
        return null
      }
    },
    async update(id, body) {
      try {
        const updated = await updatePantryItem(id, body)
        this.items = this.items.map((x) => (x.id === id ? updated : x)).slice().sort((a, b) => a.expiresAtMs - b.expiresAtMs)
        return updated
      } catch (e) {
        uni.showToast({ title: e instanceof Error ? e.message : '更新失败', icon: 'none' })
        return null
      }
    },
    async remove(id) {
      try {
        await deletePantryItem(id)
        this.items = this.items.filter((x) => x.id !== id)
        return true
      } catch (e) {
        uni.showToast({ title: e instanceof Error ? e.message : '删除失败', icon: 'none' })
        return false
      }
    },
    async removeByInventoryId(inventoryId) {
      const list = this.items.filter((x) => x.inventoryId === inventoryId)
      let okCount = 0
      for (const it of list) {
        const ok = await this.remove(it.id)
        if (ok) okCount += 1
      }
      return okCount
    },
  },
  persist: {
    key: 'pantry',
    mode: 'encrypted',
    paths: ['items'],
  },
} satisfies PantryStoreOptions

export const usePantryStore = defineStore('pantry', pantryStoreOptions)

