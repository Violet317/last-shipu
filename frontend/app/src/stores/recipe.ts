import { defineStore, type DefineStoreOptions } from 'pinia'

export interface RecipeSummary {
  id: string
  title: string
  coverUrl: string
  tags: string[]
  kcal: number
  durationMinutes: number
  createdAtMs?: number
}

export interface RecipeState {
  favorites: Record<string, true>
  recent: RecipeSummary[]
}

export interface RecipeGetters {
  favoriteCount(state: RecipeState): number
  isFavorite(state: RecipeState): (id: string) => boolean
}

export interface RecipeActions {
  toggleFavorite(id: string): void
  setRecent(list: RecipeSummary[]): void
  clearRecent(): void
}

type RecipeStoreOptions = Omit<DefineStoreOptions<'recipe', RecipeState, RecipeGetters, RecipeActions>, 'id'>

const recipeStoreOptions = {
  state: (): RecipeState => ({
    favorites: {},
    recent: [],
  }),
  getters: {
    favoriteCount: (state: RecipeState) => Object.keys(state.favorites).length,
    isFavorite: (state: RecipeState) => (id: string) => Boolean(state.favorites[id]),
  },
  actions: {
    toggleFavorite(id: string) {
      if (this.favorites[id]) {
        const next = { ...this.favorites }
        delete next[id]
        this.favorites = next
        return
      }
      this.favorites = { ...this.favorites, [id]: true }
    },
    setRecent(list: RecipeSummary[]) {
      const now = Date.now()
      this.recent = list.map((x) => {
        if (typeof x.createdAtMs === 'number' && Number.isFinite(x.createdAtMs)) return x
        const m = /^mock_recipe_(\d+)$/.exec(x.id)
        const inferred = m ? Number(m[1]) : NaN
        return { ...x, createdAtMs: Number.isFinite(inferred) ? inferred : now }
      })
    },
    clearRecent() {
      this.recent = []
    },
  },
  persist: {
    key: 'recipe',
    mode: 'encrypted',
    paths: ['favorites', 'recent'],
  },
} satisfies RecipeStoreOptions

export const useRecipeStore = defineStore('recipe', recipeStoreOptions)
