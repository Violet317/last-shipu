import { defineStore, type DefineStoreOptions } from 'pinia'
import type { RecipeDetail } from '@/api/recipe'

export type StoredRecipeDetail = RecipeDetail & { createdAtMs?: number }

export interface RecipeDetailsState {
  details: Record<string, StoredRecipeDetail>
}

export interface RecipeDetailsGetters {
  getById(state: RecipeDetailsState): (id: string) => StoredRecipeDetail | null
}

export interface RecipeDetailsActions {
  put(detail: StoredRecipeDetail): void
  clear(id: string): void
  clearAll(): void
}

type RecipeDetailsStoreOptions = Omit<DefineStoreOptions<'recipeDetails', RecipeDetailsState, RecipeDetailsGetters, RecipeDetailsActions>, 'id'>

const recipeDetailsStoreOptions = {
  state: (): RecipeDetailsState => ({ details: {} }),
  getters: {
    getById: (state: RecipeDetailsState) => (id: string) => state.details[id] ?? null,
  },
  actions: {
    put(detail) {
      if (!detail?.id) return
      this.details = { ...this.details, [detail.id]: detail }
    },
    clear(id) {
      if (!this.details[id]) return
      const next = { ...this.details }
      delete next[id]
      this.details = next
    },
    clearAll() {
      this.details = {}
    },
  },
  persist: {
    key: 'recipeDetails',
    mode: 'encrypted',
    paths: ['details'],
  },
} satisfies RecipeDetailsStoreOptions

export const useRecipeDetailsStore = defineStore('recipeDetails', recipeDetailsStoreOptions)

