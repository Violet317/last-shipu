import { defineStore, type DefineStoreOptions } from 'pinia'
import {
  createInventoryItem,
  deleteInventoryItem,
  listInventory,
  updateInventoryItem,
  type InventoryCategory,
  type InventoryItem,
  type InventoryUpsert,
} from '@/api/inventory'

export interface InventoryState {
  loading: boolean
  items: InventoryItem[]
  error: string
}

export interface InventoryGetters {
  byCategory(state: InventoryState): (category: InventoryCategory) => InventoryItem[]
}

export interface InventoryActions {
  fetch(): Promise<void>
  create(body: InventoryUpsert): Promise<InventoryItem | null>
  update(id: string, body: InventoryUpsert & { sort?: number }): Promise<InventoryItem | null>
  remove(id: string): Promise<boolean>
}

type InventoryStoreOptions = Omit<DefineStoreOptions<'inventory', InventoryState, InventoryGetters, InventoryActions>, 'id'>

const inventoryStoreOptions = {
  state: (): InventoryState => ({
    loading: false,
    items: [],
    error: '',
  }),
  getters: {
    byCategory: (state: InventoryState) => (category: InventoryCategory) =>
      state.items.filter((x) => x.category === category).slice().sort((a, b) => a.sort - b.sort),
  },
  actions: {
    async fetch() {
      if (this.loading) return
      this.loading = true
      this.error = ''
      try {
        this.items = await listInventory()
      } catch (e) {
        this.error = e instanceof Error ? e.message : '加载失败'
      } finally {
        this.loading = false
      }
    },
    async create(body) {
      try {
        const created = await createInventoryItem(body)
        this.items = [...this.items, created].slice().sort((a, b) => a.sort - b.sort)
        return created
      } catch (e) {
        uni.showToast({ title: e instanceof Error ? e.message : '新增失败', icon: 'none' })
        return null
      }
    },
    async update(id, body) {
      try {
        const updated = await updateInventoryItem(id, body)
        this.items = this.items.map((x) => (x.id === id ? updated : x)).slice().sort((a, b) => a.sort - b.sort)
        return updated
      } catch (e) {
        uni.showToast({ title: e instanceof Error ? e.message : '更新失败', icon: 'none' })
        return null
      }
    },
    async remove(id) {
      try {
        await deleteInventoryItem(id)
        this.items = this.items.filter((x) => x.id !== id)
        return true
      } catch (e) {
        uni.showToast({ title: e instanceof Error ? e.message : '删除失败', icon: 'none' })
        return false
      }
    },
  },
} satisfies InventoryStoreOptions

export const useInventoryStore = defineStore('inventory', inventoryStoreOptions)

