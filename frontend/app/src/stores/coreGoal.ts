import { defineStore, type DefineStoreOptions } from 'pinia'

export interface CoreGoalState {
  title: string
  subtitle: string
  updatedAtMs: number
}

export interface CoreGoalActions {
  setGoal(payload: { title: string; subtitle: string }): void
  reset(): void
}

type CoreGoalStoreOptions = Omit<DefineStoreOptions<'coreGoal', CoreGoalState, {}, CoreGoalActions>, 'id'>

const coreGoalStoreOptions = {
  state: (): CoreGoalState => ({
    title: '养成健康饮食习惯',
    subtitle: '通过地中海式膳食结构，逐步提升身体活力与免疫力。',
    updatedAtMs: Date.now(),
  }),
  actions: {
    setGoal(payload) {
      this.title = payload.title.trim()
      this.subtitle = payload.subtitle.trim()
      this.updatedAtMs = Date.now()
    },
    reset() {
      this.title = '养成健康饮食习惯'
      this.subtitle = '通过地中海式膳食结构，逐步提升身体活力与免疫力。'
      this.updatedAtMs = Date.now()
    },
  },
  persist: {
    key: 'coreGoal',
    mode: 'encrypted',
    paths: ['title', 'subtitle', 'updatedAtMs'],
  },
} satisfies CoreGoalStoreOptions

export const useCoreGoalStore = defineStore('coreGoal', coreGoalStoreOptions)

