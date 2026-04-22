import { apiConfig } from './config'
import { request } from './client'

export interface VitalityMetric {
  key: 'score' | 'steps' | 'activeMinutes' | 'sleepHours' | 'waterMl' | 'kcalBalance'
  label: string
  value: number
  unit: string
  target: number
}

export interface VitalityTrendPoint {
  date: string
  score: number
}

export interface VitalityToday {
  date: string
  updatedAtMs: number
  score: number
  scoreTarget: number
  kcalIn: number
  kcalOut: number
  metrics: VitalityMetric[]
  trend7d: VitalityTrendPoint[]
  suggestions: string[]
  highlights: string[]
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function seeded(n: number): () => number {
  let x = n | 0
  return () => {
    x ^= x << 13
    x ^= x >> 17
    x ^= x << 5
    return (x >>> 0) / 0xffffffff
  }
}

function buildMockToday(): VitalityToday {
  const now = new Date()
  const date = formatDate(now)
  const seed = Number(`${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`)
  const r = seeded(seed)

  const steps = Math.floor(3500 + r() * 9000)
  const activeMinutes = Math.floor(18 + r() * 55)
  const sleepHours = Math.round((5.5 + r() * 3.0) * 10) / 10
  const waterMl = Math.floor(900 + r() * 1500)
  const kcalIn = Math.floor(1300 + r() * 900)
  const kcalOut = Math.floor(1600 + r() * 800)
  const kcalBalance = kcalIn - kcalOut

  const scoreSteps = clamp(Math.round((steps / 8000) * 30), 0, 30)
  const scoreActive = clamp(Math.round((activeMinutes / 45) * 25), 0, 25)
  const scoreSleep = clamp(Math.round((sleepHours / 8) * 20), 0, 20)
  const scoreWater = clamp(Math.round((waterMl / 1800) * 15), 0, 15)
  const scoreBalance = clamp(10 - Math.round(Math.abs(kcalBalance) / 180), 0, 10)
  const score = clamp(scoreSteps + scoreActive + scoreSleep + scoreWater + scoreBalance, 0, 100)

  const highlights: string[] = []
  if (steps >= 9000) highlights.push('步数达标，保持这个节奏')
  if (activeMinutes >= 45) highlights.push('运动时长优秀，注意拉伸恢复')
  if (sleepHours >= 7.5) highlights.push('睡眠充足，精神状态更稳定')
  if (waterMl >= 1600) highlights.push('饮水量不错，继续分次补水')
  if (highlights.length === 0) highlights.push('今天从一小步开始也很棒')

  const suggestions: string[] = []
  if (steps < 7000) suggestions.push('安排一次 15–20 分钟快走，补足步数缺口')
  if (activeMinutes < 30) suggestions.push('做一组 8–12 分钟的居家燃脂训练')
  if (sleepHours < 7) suggestions.push('今晚提前 30 分钟上床，避免睡前刷屏')
  if (waterMl < 1400) suggestions.push('每餐前后各补水 200ml，减少一次性猛灌')
  if (kcalBalance > 300) suggestions.push('下一餐减少油脂与精制主食，优先蛋白+蔬菜')
  if (kcalBalance < -400) suggestions.push('今天消耗偏高，补一份优质碳水避免疲劳')
  if (suggestions.length === 0) suggestions.push('维持当前节奏，适当加一份蔬菜与蛋白更稳')

  const metrics: VitalityMetric[] = [
    { key: 'steps', label: '步数', value: steps, unit: '步', target: 8000 },
    { key: 'activeMinutes', label: '运动', value: activeMinutes, unit: '分钟', target: 45 },
    { key: 'sleepHours', label: '睡眠', value: sleepHours, unit: '小时', target: 8 },
    { key: 'waterMl', label: '饮水', value: waterMl, unit: 'ml', target: 1800 },
    { key: 'kcalBalance', label: '热量差', value: kcalBalance, unit: 'kcal', target: 0 },
  ]

  const trend7d: VitalityTrendPoint[] = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(now.getTime() - (6 - idx) * 24 * 3600 * 1000)
    const base = clamp(score + Math.round((r() - 0.5) * 18), 35, 95)
    return { date: formatDate(d), score: base }
  })

  return {
    date,
    updatedAtMs: Date.now(),
    score,
    scoreTarget: 85,
    kcalIn,
    kcalOut,
    metrics,
    trend7d,
    suggestions,
    highlights,
  }
}

export async function getVitalityToday(): Promise<VitalityToday> {
  if (!apiConfig.baseUrl) return buildMockToday()
  return await request<VitalityToday>({ url: '/api/vitality/today', method: 'GET' })
}

