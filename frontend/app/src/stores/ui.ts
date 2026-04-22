import { defineStore, type DefineStoreOptions } from 'pinia'

export interface UiState {
  globalLoading: boolean
}

export interface UiGetters {
  isLoading(state: UiState): boolean
}

export interface UiActions {
  setLoading(v: boolean): void
}

type UiStoreOptions = Omit<DefineStoreOptions<'ui', UiState, UiGetters, UiActions>, 'id'>

const uiStoreOptions = {
  state: (): UiState => ({
    globalLoading: false,
  }),
  getters: {
    isLoading: (state: UiState) => state.globalLoading,
  },
  actions: {
    setLoading(v: boolean) {
      this.globalLoading = v
    },
  },
} satisfies UiStoreOptions

export const useUiStore = defineStore('ui', uiStoreOptions)
