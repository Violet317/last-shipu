import { defineStore, type DefineStoreOptions } from 'pinia'

export interface GoalSetting {
  id: string
  title: string
  value: number | null
  unit: string
  min: number
  max: number
}

export interface AchievementItem {
  id: string
  title: string
  description: string
  unlocked: boolean
  progress: number
}

export interface AchievementState {
  goals: GoalSetting[]
  achievements: AchievementItem[]
  dirty: boolean
}

export interface AchievementGetters {
  isDirty(state: AchievementState): boolean
}

export interface AchievementActions {
  setGoalValue(id: string, value: number | null): void
  setGoalUnit(id: string, unit: string): void
  markSaved(): void
}

type AchievementStoreOptions = Omit<
  DefineStoreOptions<'achievement', AchievementState, AchievementGetters, AchievementActions>,
  'id'
>

const achievementStoreOptions = {
  state: (): AchievementState => ({
    goals: [
      { id: 'weight', title: '体重差值', value: 0, unit: 'kg', min: -50, max: 50 },
      { id: 'sport', title: '运动次数', value: 0, unit: '次/月', min: 0, max: 60 },
      { id: 'water', title: '饮水天数', value: 0, unit: '天/月', min: 0, max: 31 },
    ],
    achievements: [
      { id: 'a1', title: '新手主厨', description: '生成并完成 1 道食谱', unlocked: true, progress: 1 },
      { id: 'a2', title: '连续打卡', description: '连续记录 7 天饮食', unlocked: false, progress: 0.5 },
      { id: 'a3', title: '清爽达人', description: '生成 10 道轻食', unlocked: false, progress: 0.2 },
    ],
    dirty: false,
  }),
  getters: {
    isDirty: (state: AchievementState) => state.dirty,
  },
  actions: {
    setGoalValue(id: string, value: number | null) {
      this.goals = this.goals.map((g) => (g.id === id ? { ...g, value } : g))
      this.dirty = true
    },
    setGoalUnit(id: string, unit: string) {
      this.goals = this.goals.map((g) => (g.id === id ? { ...g, unit } : g))
      this.dirty = true
    },
    markSaved() {
      this.dirty = false
    },
  },
} satisfies AchievementStoreOptions

export const useAchievementStore = defineStore('achievement', achievementStoreOptions)

