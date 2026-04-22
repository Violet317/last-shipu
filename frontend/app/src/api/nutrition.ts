import { apiConfig } from './config'
import { request } from './client'
import { getJson, setJson } from './mockStorage'

export type MealType = 'breakfast' | 'lunch' | 'dinner'

export interface Macro {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface MealItem extends Macro {
  id: string
  name: string
  createdAtMs: number
}

export interface MealRecord {
  date: string
  meal: MealType
  items: MealItem[]
}

export interface NutritionTargets extends Macro {}

export interface WeeklyPoint {
  date: string
  total: Macro
}

export interface NutritionDay {
  date: string
  targets: NutritionTargets
  records: Record<MealType, MealRecord>
  total: Macro
  weekly: WeeklyPoint[]
}

export interface AddMealItemRequest {
  date: string
  meal: MealType
  name: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}

const STORAGE_KEY = 'mock_nutrition_meals_v1'

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`
}

function normalizeNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, n)
}

function emptyMacro(): Macro {
  return { kcal: 0, protein: 0, carbs: 0, fat: 0 }
}

function sumMacro(items: MealItem[]): Macro {
  return items.reduce<Macro>(
    (acc, it) => ({
      kcal: acc.kcal + it.kcal,
      protein: acc.protein + it.protein,
      carbs: acc.carbs + it.carbs,
      fat: acc.fat + it.fat,
    }),
    emptyMacro(),
  )
}

interface StorageShape {
  [date: string]: {
    [meal in MealType]?: MealItem[]
  }
}

function readStore(): StorageShape {
  return getJson<StorageShape>(STORAGE_KEY, {})
}

function writeStore(s: StorageShape): void {
  setJson(STORAGE_KEY, s)
}

function getTargets(): NutritionTargets {
  return { kcal: 2200, protein: 80, carbs: 250, fat: 60 }
}

function buildDay(date: string): NutritionDay {
  const store = readStore()
  const byDate = store[date] ?? {}
  const breakfastItems = (byDate.breakfast ?? []).slice()
  const lunchItems = (byDate.lunch ?? []).slice()
  const dinnerItems = (byDate.dinner ?? []).slice()

  const records: Record<MealType, MealRecord> = {
    breakfast: { date, meal: 'breakfast', items: breakfastItems },
    lunch: { date, meal: 'lunch', items: lunchItems },
    dinner: { date, meal: 'dinner', items: dinnerItems },
  }

  const total = {
    kcal: sumMacro(breakfastItems).kcal + sumMacro(lunchItems).kcal + sumMacro(dinnerItems).kcal,
    protein: sumMacro(breakfastItems).protein + sumMacro(lunchItems).protein + sumMacro(dinnerItems).protein,
    carbs: sumMacro(breakfastItems).carbs + sumMacro(lunchItems).carbs + sumMacro(dinnerItems).carbs,
    fat: sumMacro(breakfastItems).fat + sumMacro(lunchItems).fat + sumMacro(dinnerItems).fat,
  }

  const now = new Date()
  const base = new Date(`${date}T00:00:00`)
  const weekly: WeeklyPoint[] = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(base.getTime() - (6 - idx) * 24 * 3600 * 1000)
    const key = formatDate(d)
    const day = key === date ? total : sumMacro([...(store[key]?.breakfast ?? []), ...(store[key]?.lunch ?? []), ...(store[key]?.dinner ?? [])])
    const hasAny = day.kcal > 0 || day.protein > 0 || day.carbs > 0 || day.fat > 0
    if (hasAny) return { date: key, total: day }
    const seed = Number(`${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`) % 997
    const r = Math.abs(Math.sin(seed * 12.9898 + 78.233)) % 1
    const kcal = Math.floor(1200 + r * 900)
    const protein = Math.floor(45 + r * 40)
    const carbs = Math.floor(140 + r * 140)
    const fat = Math.floor(30 + r * 35)
    return { date: key, total: { kcal, protein, carbs, fat } }
  })

  void now

  return { date, targets: getTargets(), records, total, weekly }
}

export async function getNutritionToday(): Promise<NutritionDay> {
  if (!apiConfig.baseUrl) return buildDay(formatDate(new Date()))
  return await request<NutritionDay>({ url: '/api/nutrition/today', method: 'GET' })
}

export async function addMealItem(body: AddMealItemRequest): Promise<MealItem> {
  if (apiConfig.baseUrl) return await request<MealItem, AddMealItemRequest>({ url: '/api/nutrition/meal-items', method: 'POST', body })

  const store = readStore()
  const byDate = store[body.date] ?? {}
  const list = (byDate[body.meal] ?? []).slice()
  const item: MealItem = {
    id: uid('meal'),
    name: body.name.trim(),
    kcal: normalizeNumber(body.kcal),
    protein: normalizeNumber(body.protein),
    carbs: normalizeNumber(body.carbs),
    fat: normalizeNumber(body.fat),
    createdAtMs: Date.now(),
  }
  const next = [...list, item]
  store[body.date] = { ...byDate, [body.meal]: next }
  writeStore(store)
  return item
}

export async function deleteMealItem(date: string, meal: MealType, id: string): Promise<{ ok: true }> {
  if (apiConfig.baseUrl) return await request<{ ok: true }>({ url: `/api/nutrition/meal-items/${encodeURIComponent(id)}`, method: 'DELETE' })

  const store = readStore()
  const byDate = store[date] ?? {}
  const list = (byDate[meal] ?? []).slice()
  store[date] = { ...byDate, [meal]: list.filter((x) => x.id !== id) }
  writeStore(store)
  return { ok: true as const }
}

