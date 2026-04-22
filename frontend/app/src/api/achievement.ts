import { request } from './client'

export interface GoalSettingDto {
  id: string
  title: string
  value: number | null
  unit: string
}

export interface AchievementDto {
  id: string
  title: string
  description: string
  unlocked: boolean
  progress: number
}

export interface AchievementOverviewResponse {
  goals: GoalSettingDto[]
  achievements: AchievementDto[]
}

export async function fetchAchievementOverview(): Promise<AchievementOverviewResponse> {
  return await request<AchievementOverviewResponse>({
    method: 'GET',
    url: '/api/achievement',
  })
}

