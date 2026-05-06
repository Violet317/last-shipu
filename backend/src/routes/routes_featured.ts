import type { FastifyInstance } from 'fastify'
import { ok } from '../lib/response'

interface RecipeStep {
  index: number
  text: string
}

interface DailyFeaturedItem {
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

interface DailyFeaturedData {
  date: string
  generatedAtMs: number
  reason: string
  hero: DailyFeaturedItem
  list: DailyFeaturedItem[]
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function formatDateLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
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
  const ing = payload.ingredients.slice(0, 6).join('、')
  const toolText = payload.tools.length > 0 ? `（工具：${payload.tools.slice(0, 3).join('、')}）` : ''
  return {
    id: payload.id,
    title: payload.title,
    subtitle: payload.subtitle,
    coverUrl: payload.coverUrl,
    tags: payload.tags,
    kcal: payload.kcal,
    durationMinutes: payload.durationMinutes,
    createdAtMs: payload.createdAtMs,
    steps: [
      { index: 1, text: `准备食材：${ing}。清洗切配，按口味少量盐/黑胡椒调味。${toolText}` },
      { index: 2, text: '主食材先处理：蛋白类先煎/焯/烤至定型，蔬菜保持脆爽口感。' },
      { index: 3, text: `组合调味：按"${payload.style}"方向加入柠檬汁/橄榄油/少量酱油或酸奶酱，拌匀后装盘。` },
    ],
  }
}

function buildDaily(date: string): DailyFeaturedData {
  const now = Date.now()
  const veg = ['西兰花', '番茄', '黄瓜', '胡萝卜', '菠菜', '洋葱']
  const meat = ['鸡胸肉', '三文鱼', '牛肉', '虾']
  const tools = ['平底锅', '烤箱', '炒锅']

  const main = pick(meat, 1)[0] as string
  const vegPick = pick(veg, 3)
  const toolsPick = pick(tools, 2)
  const ingredientsHero = [main, ...vegPick]
  const style = '均衡'

  const reason =
    `基于今日摄入情况，本次推荐偏向「${style}」，并优先使用常见食材组合。`

  const heroId = `df_${date}_hero`
  const hero = makeItem({
    id: heroId,
    title: `${main}能量碗`,
    subtitle: '每日精选由 AI 基于你的营养摄入与食材库生成，凌晨更新。',
    coverUrl: 'https://image.pollinations.ai/prompt/' + encodeURIComponent(`${main}能量碗 美食摄影 特写`) + '?width=512&height=512&nologo=true',
    tags: ['AI', style],
    kcal: 480,
    durationMinutes: 22,
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
      coverUrl: 'https://image.pollinations.ai/prompt/' + encodeURIComponent('番茄菌菇快手炒 美食摄影 特写') + '?width=512&height=512&nologo=true',
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
      coverUrl: 'https://image.pollinations.ai/prompt/' + encodeURIComponent('柠檬香草煎蛋白 美食摄影 特写') + '?width=512&height=512&nologo=true',
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
      coverUrl: 'https://image.pollinations.ai/prompt/' + encodeURIComponent('时蔬清汤 美食摄影 特写') + '?width=512&height=512&nologo=true',
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

export async function registerFeaturedRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/featured/daily', async (req) => {
    const q = (req.query as Record<string, string>)?.date
    const date = q?.trim() || formatDateLocal(new Date())
    return ok(buildDaily(date))
  })
}
