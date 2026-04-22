import { apiConfig } from './config'
import { request } from './client'
import { getJson, mockOk, setJson } from './mockStorage'
import type { RecipeStep } from './recipe'
import { getNutritionToday } from './nutrition'
import { listInventory } from './inventory'

export interface DailyFeaturedItem {
  id: string
  title: string
  subtitle: string
  coverUrl: string
  tags: string[]
  kcal: number
  durationMinutes: number
  createdAtMs: number
  steps: RecipeStep[]
}

export interface DailyFeaturedData {
  date: string
  generatedAtMs: number
  reason: string
  hero: DailyFeaturedItem
  list: DailyFeaturedItem[]
}

const STORAGE_KEY = 'mock_daily_featured_v1'

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function formatDateLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`
}

function pick<T>(arr: T[], count: number): T[] {
  const copy = arr.slice()
  const out: T[] = []
  while (copy.length > 0 && out.length < count) {
    const idx = Math.floor(Math.random() * copy.length)
    out.push(copy[idx] as T)
    copy.splice(idx, 1)
  }
  return out
}

function buildSteps(ingredients: string[], tools: string[], style: string): RecipeStep[] {
  const ing = ingredients.slice(0, 6).join('、')
  const toolText = tools.length > 0 ? `（工具：${tools.slice(0, 3).join('、')}）` : ''
  return [
    { index: 1, text: `准备食材：${ing}。清洗切配，按口味少量盐/黑胡椒调味。${toolText}` },
    { index: 2, text: `主食材先处理：蛋白类先煎/焯/烤至定型，蔬菜保持脆爽口感。` },
    { index: 3, text: `组合调味：按“${style}”方向加入柠檬汁/橄榄油/少量酱油或酸奶酱，拌匀后装盘。` },
  ]
}

function makeItem(payload: {
  id: string
  title: string
  subtitle: string
  coverUrl: string
  tags: string[]
  kcal: number
  durationMinutes: number
  createdAtMs: number
  ingredients: string[]
  tools: string[]
  style: string
}): DailyFeaturedItem {
  return {
    id: payload.id,
    title: payload.title,
    subtitle: payload.subtitle,
    coverUrl: payload.coverUrl,
    tags: payload.tags,
    kcal: payload.kcal,
    durationMinutes: payload.durationMinutes,
    createdAtMs: payload.createdAtMs,
    steps: buildSteps(payload.ingredients, payload.tools, payload.style),
  }
}

function readAll(): Record<string, DailyFeaturedData> {
  return getJson<Record<string, DailyFeaturedData>>(STORAGE_KEY, {})
}

function writeAll(map: Record<string, DailyFeaturedData>): void {
  setJson(STORAGE_KEY, map)
}

async function buildDaily(date: string): Promise<DailyFeaturedData> {
  const nutrition = await getNutritionToday()
  const inventory = await listInventory()
  const veg = inventory.filter((x) => x.category === 'veg').map((x) => x.nameZh)
  const meat = inventory.filter((x) => x.category === 'meat').map((x) => x.nameZh)
  const tool = inventory.filter((x) => x.category === 'tool').map((x) => x.nameZh)

  const proteinGap = Math.max(0, nutrition.targets.protein - nutrition.total.protein)
  const kcalGap = Math.max(0, nutrition.targets.kcal - nutrition.total.kcal)

  const main = proteinGap >= 15 ? (pick(meat.length ? meat : ['鸡胸肉'], 1)[0] as string) : (pick(meat.length ? meat : ['三文鱼'], 1)[0] as string)
  const vegPick = pick(veg.length ? veg : ['西兰花', '番茄', '黄瓜'], 3)
  const toolsPick = pick(tool.length ? tool : ['平底锅'], 2)
  const ingredientsHero = [main, ...vegPick]

  const style = proteinGap >= 15 ? '高蛋白' : kcalGap <= 200 ? '轻盈' : '均衡'
  const reason =
    `基于今日摄入：已摄入 ${nutrition.total.kcal}/${nutrition.targets.kcal} kcal、蛋白质 ${nutrition.total.protein}/${nutrition.targets.protein}g。` +
    `本次推荐偏向「${style}」，并优先使用你当前食材库中的常见食材组合。`

  const now = Date.now()
  const heroId = `df_${date}_hero`
  const hero = makeItem({
    id: heroId,
    title: style === '高蛋白' ? `${main}能量碗` : `${main}清爽沙拉碗`,
    subtitle: '每日精选由 AI 基于你的营养摄入与食材库生成，凌晨更新。',
    coverUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCVWJj4s2LicnUDBDcy0eKPOOSC4asGlmoRW_pFqjsc6sghutd5VOHacMgd7aYEQCDJULTabLh8KjrcJdwe7-3Rohi657URv5A7UuFNH4Ciq3-4RF2icI3LdYzGwWHVZj8mu1uOF1hyZgES_sCpj_Z8VI1UoUSjR4lqpqttZAdQjcs0t-2zuRRmIrSSbN7AvtuhsJiPhdzAFZM7Ko5kduV9grvKeOAX8NMa9F6iMTZrirr8VChbZAiUjNY949mpI3ocEZJJDqXPrOHO',
    tags: ['AI', style],
    kcal: style === '高蛋白' ? 480 : 360,
    durationMinutes: style === '高蛋白' ? 22 : 15,
    createdAtMs: now,
    ingredients: ingredientsHero,
    tools: toolsPick,
    style,
  })

  const list: DailyFeaturedItem[] = [
    makeItem({
      id: `df_${date}_1`,
      title: '番茄菌菇快手炒',
      subtitle: '',
      coverUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuD2pVkdaPzStF-xt-UebWTLYtU07gg48SLk4gvxiBT9UTs8qI8NwLZQ_wQFxQKraqiTPmW6011tZU0mtPCQTeMc6TFPmP7CuHuiT9jo7t7QcdxUFyOS50QZLDWvvkrPfM0yahQBw7t5RmItGXGHD4pz6KRyA-kU8QVVZijsbMTT55qcwcnKYpdo0WhsSR7g-N3akfXclHAtdd0onNb9B8qsb7Hnk3a4_dB72DZw27SaHFE1gwK1JLASrMWDsSBGmBvn2KySzzfZ4Nrp',
      tags: ['快手', '清爽'],
      kcal: 320,
      durationMinutes: 12,
      createdAtMs: now,
      ingredients: ['番茄', '菌菇', ...pick(veg, 2)],
      tools: toolsPick,
      style: '快手',
    }),
    makeItem({
      id: `df_${date}_2`,
      title: '柠檬香草煎蛋白',
      subtitle: '',
      coverUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBG7FzgZmLmjwLpsBfuf6194XA_MYvjjhse6SXOdh9UAd2QBxlGPsWKN76lBrSsCj0PeiT_EmQw7Iy4jNuEOD8nSwHHPAGoQUBgHAvlsoW2j3nPD4nxqrCHwKLbCSlurVQlWSPiZ4Pr0ITdC5KY52s2aZds25fNnF_7_lvlQoeahwNcyi-Cx6-KVj5Z8enVXF4DNzIOf3-e5UqjjGiXbi4V2wuy0wwrifRcKUhjfgUYaexB8eO3cerwpfuNTuwYCVQ7yXXCKEs6Dh0h',
      tags: ['高蛋白'],
      kcal: 410,
      durationMinutes: 18,
      createdAtMs: now,
      ingredients: [main, ...pick(veg, 2)],
      tools: toolsPick,
      style: '高蛋白',
    }),
    makeItem({
      id: `df_${date}_3`,
      title: '时蔬清汤',
      subtitle: '',
      coverUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBG7FzgZmLmjwLpsBfuf6194XA_MYvjjhse6SXOdh9UAd2QBxlGPsWKN76lBrSsCj0PeiT_EmQw7Iy4jNuEOD8nSwHHPAGoQUBgHAvlsoW2j3nPD4nxqrCHwKLbCSlurVQlWSPiZ4Pr0ITdC5KY52s2aZds25fNnF_7_lvlQoeahwNcyi-Cx6-KVj5Z8enVXF4DNzIOf3-e5UqjjGiXbi4V2wuy0wwrifRcKUhjfgUYaexB8eO3cerwpfuNTuwYCVQ7yXXCKEs6Dh0h',
      tags: ['轻盈'],
      kcal: 180,
      durationMinutes: 16,
      createdAtMs: now,
      ingredients: pick(veg, 4),
      tools: pick(toolsPick, 1),
      style: '轻盈',
    }),
  ]

  return { date, generatedAtMs: now, reason, hero, list }
}

export async function getDailyFeatured(date?: string): Promise<DailyFeaturedData> {
  if (!apiConfig.baseUrl) {
    const d = date?.trim() || formatDateLocal(new Date())
    const map = readAll()
    const existing = map[d]
    if (existing) {
      const res = await mockOk(existing, 120)
      return res.data
    }
    const built = await buildDaily(d)
    writeAll({ ...map, [d]: built })
    const res = await mockOk(built, 220)
    return res.data
  }

  const q = date ? `?date=${encodeURIComponent(date)}` : ''
  return await request<DailyFeaturedData>({ url: `/api/featured/daily${q}`, method: 'GET' })
}

