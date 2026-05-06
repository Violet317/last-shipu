import { defineStore, type DefineStoreOptions } from 'pinia'
import { createShoppingItem, deleteShoppingItem, listShopping, updateShoppingItem, type ShoppingItem, type ShoppingUpsert } from '@/api/shopping'

export interface ShoppingState {
  loading: boolean
  items: ShoppingItem[]
  error: string
}

export interface ShoppingGetters {
  openItems(state: ShoppingState): ShoppingItem[]
}

export interface ShoppingActions {
  fetch(): Promise<void>
  create(body: ShoppingUpsert): Promise<ShoppingItem | null>
  update(id: string, body: Partial<ShoppingUpsert>): Promise<ShoppingItem | null>
  remove(id: string): Promise<boolean>
  markPurchasedByNames(names: string[]): number
}

type ShoppingStoreOptions = Omit<DefineStoreOptions<'shopping', ShoppingState, ShoppingGetters, ShoppingActions>, 'id'>

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '')
}

const shoppingStoreOptions = {
  state: (): ShoppingState => ({
    loading: false,
    items: [],
    error: '',
  }),
  getters: {
    openItems: (state: ShoppingState) => state.items.filter((x) => !x.checked),
  },
  actions: {
    async fetch() {
      if (this.loading) return
      this.loading = true
      this.error = ''
      try {
        this.items = await listShopping()
      } catch (e) {
        this.error = e instanceof Error ? e.message : '加载失败'
      } finally {
        this.loading = false
      }
    },
    async create(body) {
      try {
        const created = await createShoppingItem(body)
        this.items = [...this.items, created].slice().sort((a, b) => Number(a.checked) - Number(b.checked) || b.updatedAtMs - a.updatedAtMs)
        return created
      } catch (e) {
        uni.showToast({ title: e instanceof Error ? e.message : '新增失败', icon: 'none' })
        return null
      }
    },
    async update(id, body) {
      try {
        const updated = await updateShoppingItem(id, body)
        this.items = this.items.map((x) => (x.id === id ? updated : x)).slice().sort((a, b) => Number(a.checked) - Number(b.checked) || b.updatedAtMs - a.updatedAtMs)
        return updated
      } catch (e) {
        uni.showToast({ title: e instanceof Error ? e.message : '更新失败', icon: 'none' })
        return null
      }
    },
    async remove(id) {
      try {
        await deleteShoppingItem(id)
        this.items = this.items.filter((x) => x.id !== id)
        return true
      } catch (e) {
        uni.showToast({ title: e instanceof Error ? e.message : '删除失败', icon: 'none' })
        return false
      }
    },
    markPurchasedByNames(names) {
      const set = new Set(names.map(normalizeName).filter(Boolean))
      let hit = 0
      this.items = this.items.map((x) => {
        if (x.checked) return x
        const k = normalizeName(x.name)
        if (!set.has(k)) return x
        hit += 1
        return { ...x, checked: true, updatedAtMs: Date.now() }
      })
      return hit
    },
  },
  persist: {
    key: 'shopping',
    mode: 'encrypted',
    paths: ['items'],
  },
} satisfies ShoppingStoreOptions

export const useShoppingStore = defineStore('shopping', shoppingStoreOptions)

