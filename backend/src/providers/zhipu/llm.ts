import type { Env } from '../../lib/env'
import { zhipuPostJsonBearer, ZhipuError } from './client'

const MOONSHOT_BASE_URL = 'https://api.moonshot.cn/v1'

async function callMoonshot(env: Env, payload: unknown, timeoutMs = 30000): Promise<ChatCompletionResponse> {
  const apiKey = env.MOONSHOT_API_KEY || env.LLM_API_KEY || ''
  if (!apiKey) throw new ZhipuError('MOONSHOT_NOT_CONFIGURED', 'Moonshot API Key 未配置', 500)

  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), timeoutMs)
  try {
    const res = await fetch(`${MOONSHOT_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: ac.signal,
    })

    const text = await res.text()
    let json: unknown = null
    try { json = text ? JSON.parse(text) : null } catch { json = null }

    if (!res.ok) {
      const msg = (json && typeof json === 'object' && (json as any).error?.message) || ''
      throw new ZhipuError('MOONSHOT_HTTP_ERROR', `Kimi 请求失败(${res.status})${msg ? '：' + msg : ''}`, res.status)
    }

    if (json == null) throw new ZhipuError('MOONSHOT_BAD_RESPONSE', 'Kimi 响应非 JSON', 502)
    return json as ChatCompletionResponse
  } catch (e) {
    if (e instanceof ZhipuError) throw e
    const msg = e instanceof Error ? e.message : 'unknown error'
    throw new ZhipuError('MOONSHOT_NETWORK_ERROR', msg, 502)
  } finally {
    clearTimeout(t)
  }
}

const SYSTEM_PROMPT = `你是一位专业的智能食材管家，擅长根据库存食材的临期状态制定最优消耗方案。

【核心原则】
1. **临期优先**：必须优先使用保质期剩余天数少（≤3天）的食材，按 [临期食材 > 普通食材 > 耐储存食材] 的顺序使用
2. **零浪费**：尽量让食谱消耗完整的一份食材（如用完整颗洋葱而非半个），避免剩余边角料
3. **时间约束**：严格遵守用户给出的时间限制（如15分钟），超时方案必须被拒绝

【输出格式】
你必须输出标准 JSON，格式如下：
{
  "title": "菜品名称（含emoji）",
  "description": "一句话描述菜品亮点，强调如何巧妙消耗临期食材",
  "difficulty": "简单|中等|困难",
  "estimatedTime": "XX分钟",
  "servings": 2,
  "tags": ["快手", "临期优先", "少油"],
  "nutrition": {
    "calories": 350,
    "protein": "20g",
    "notes": "适合减脂期"
  },
  "consumptionPlan": [
    {
      "ingredient": "食材名（需与输入的ingredients匹配）",
      "amount": "实际消耗量（如 2个、200g、半颗）",
      "expiryHandling": "临期/正常/耐储存"
    }
  ],
  "shoppingList": [
    {
      "item": "需购买的食材",
      "amount": "购买量",
      "urgency": "required|optional",
      "reason": "为什么需要（如：主料不足/提味用）"
    }
  ],
  "steps": [
    {
      "order": 1,
      "action": "具体动作",
      "duration": "3分钟",
      "tips": "关键技巧（可选）"
    }
  ]
}`

interface RecipeStep {
  index: number
  text: string
}

type Difficulty = '简单' | '中等' | '困难'

interface Nutrition {
  calories?: number
  protein?: string
  notes?: string
}

interface ConsumptionPlanItem {
  ingredient: string
  amount: string
  expiryHandling: string
}

interface ShoppingListItem {
  item: string
  amount: string
  urgency: string
  reason?: string
}

export interface RecipeDetail {
  id: string
  title: string
  coverUrl: string
  description: string
  tags: string[]
  kcal: number
  durationMinutes: number
  steps: RecipeStep[]
  difficulty?: Difficulty
  estimatedTime?: string
  servings?: number
  nutrition?: Nutrition
  consumptionPlan?: ConsumptionPlanItem[]
  shoppingList?: ShoppingListItem[]
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>
}

function applyContext(
  x: Omit<RecipeDetail, 'id'>,
  ctx: { ingredients: string[]; expiringCandidates: string[]; timeLimitMinutes: number | null }
): Omit<RecipeDetail, 'id'> {
  const ingredientsSet = new Set(ctx.ingredients)
  const expiringSet = new Set(ctx.expiringCandidates)

  const consumptionPlanValid =
    Array.isArray(x.consumptionPlan) &&
    x.consumptionPlan.length > 0 &&
    x.consumptionPlan.every((it) => it && ingredientsSet.has(it.ingredient))

  const consumptionPlan: ConsumptionPlanItem[] = consumptionPlanValid
    ? (x.consumptionPlan as ConsumptionPlanItem[])
    : ctx.ingredients.map((name) => ({
        ingredient: name,
        amount: '尽量用完',
        expiryHandling: expiringSet.has(name) ? '临期' : '正常',
      }))

  const tags = (() => {
    const base = Array.isArray(x.tags) ? x.tags.slice(0, 8) : []
    const set = new Set(base.map((t) => t.trim()).filter(Boolean))
    if (ctx.expiringCandidates.length) set.add('临期优先')
    if (!set.size) set.add('临期优先')
    return Array.from(set).slice(0, 8)
  })()

  const shoppingList: ShoppingListItem[] | undefined = Array.isArray(x.shoppingList)
    ? x.shoppingList
        .filter((it) => it && typeof it.item === 'string' && it.item.trim() && !ingredientsSet.has(it.item.trim()))
        .slice(0, 50)
    : undefined

  const durationMinutes =
    ctx.timeLimitMinutes != null ? Math.min(Math.max(0, x.durationMinutes), ctx.timeLimitMinutes) : x.durationMinutes
  const estimatedTime = x.estimatedTime || `${durationMinutes}分钟`

  return { ...x, tags, consumptionPlan, shoppingList, durationMinutes, estimatedTime }
}

function extractJsonObject(text: string): unknown {
  const s = text.trim()
  if (s.startsWith('{') && s.endsWith('}')) return JSON.parse(s)
  const a = s.indexOf('{')
  const b = s.lastIndexOf('}')
  if (a >= 0 && b > a) return JSON.parse(s.slice(a, b + 1))
  throw new Error('no json object')
}

function recipeCoverGradient(title: string): string {
  // 根据标题 hash 生成一个固定颜色，不依赖外部图片
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash + title.charCodeAt(i)) | 0
  }
  const h = Math.abs(hash) % 360
  return `linear-gradient(135deg, hsl(${h}, 70%, 85%), hsl(${(h + 40) % 360}, 60%, 75%))`
}

function normalizeRecipe(x: any): Omit<RecipeDetail, 'id'> {
  const title = String(x?.title ?? '').trim() || '快手做法'
  const coverUrl = '' // 不再依赖外部图片，前端用颜色块+emoji展示
  const description = String(x?.description ?? '').trim() || '临期优先的快手做法。'
  const tags = Array.isArray(x?.tags) ? x.tags.map((t: any) => String(t)).filter((t: string) => t.trim()).slice(0, 8) : ['临期优先']
  const kcal = Number.isFinite(Number(x?.nutrition?.calories))
    ? Math.max(0, Math.floor(Number(x.nutrition.calories)))
    : Number.isFinite(Number(x?.kcal))
      ? Math.max(0, Math.floor(Number(x.kcal)))
      : 0

  const estimatedTime = typeof x?.estimatedTime === 'string' && x.estimatedTime.trim() ? x.estimatedTime.trim() : undefined
  const durationFromEstimated = (() => {
    if (!estimatedTime) return null
    const m = /(\d{1,3})/.exec(estimatedTime)
    if (!m) return null
    const n = Number(m[1])
    return Number.isFinite(n) ? n : null
  })()
  const durationMinutes = Number.isFinite(Number(x?.durationMinutes))
    ? Math.max(0, Math.floor(Number(x.durationMinutes)))
    : durationFromEstimated != null
      ? Math.max(0, Math.floor(durationFromEstimated))
      : 15

  const steps: RecipeStep[] = (() => {
    const stepsRaw = Array.isArray(x?.steps) ? x.steps : []
    const hasV2 = stepsRaw.some((s: any) => s && (s.order != null || s.action != null))
    if (hasV2) {
      return stepsRaw
        .map((s: any, idx: number) => {
          const index = Number.isFinite(Number(s?.order)) ? Math.max(1, Math.floor(Number(s.order))) : idx + 1
          const action = String(s?.action ?? '').trim()
          const duration = String(s?.duration ?? '').trim()
          const tips = String(s?.tips ?? '').trim()
          const parts = [action]
          if (duration) parts.push(`（${duration}）`)
          if (tips) parts.push(`提示：${tips}`)
          return { index, text: parts.filter(Boolean).join(' ') }
        })
        .filter((s: RecipeStep) => s.text)
        .slice(0, 20)
    }
    return stepsRaw
      .map((s: any, idx: number) => ({
        index: Number.isFinite(Number(s?.index)) ? Math.max(1, Math.floor(Number(s.index))) : idx + 1,
        text: String(s?.text ?? '').trim(),
      }))
      .filter((s: RecipeStep) => s.text)
      .slice(0, 20)
  })()

  const difficulty =
    x?.difficulty === '简单' || x?.difficulty === '中等' || x?.difficulty === '困难' ? (x.difficulty as Difficulty) : undefined
  const servings = Number.isFinite(Number(x?.servings)) ? Math.max(1, Math.floor(Number(x.servings))) : undefined

  const nutrition: Nutrition | undefined =
    x?.nutrition && typeof x.nutrition === 'object'
      ? {
          calories: Number.isFinite(Number((x.nutrition as any).calories)) ? Math.max(0, Math.floor(Number((x.nutrition as any).calories))) : undefined,
          protein: typeof (x.nutrition as any).protein === 'string' ? String((x.nutrition as any).protein).trim() : undefined,
          notes: typeof (x.nutrition as any).notes === 'string' ? String((x.nutrition as any).notes).trim() : undefined,
        }
      : undefined

  const consumptionPlan: ConsumptionPlanItem[] | undefined = Array.isArray(x?.consumptionPlan)
    ? x.consumptionPlan
        .map((it: any) => ({
          ingredient: String(it?.ingredient ?? '').trim(),
          amount: String(it?.amount ?? '').trim(),
          expiryHandling: String(it?.expiryHandling ?? '').trim(),
        }))
        .filter((it: ConsumptionPlanItem) => it.ingredient && it.amount && it.expiryHandling)
        .slice(0, 50)
    : undefined

  const shoppingList: ShoppingListItem[] | undefined = Array.isArray(x?.shoppingList)
    ? x.shoppingList
        .map((it: any) => ({
          item: String(it?.item ?? '').trim(),
          amount: String(it?.amount ?? '').trim(),
          urgency: String(it?.urgency ?? '').trim(),
          reason: typeof it?.reason === 'string' ? String(it.reason).trim() : undefined,
        }))
        .filter((it: ShoppingListItem) => it.item && it.amount && it.urgency)
        .slice(0, 50)
    : undefined

  return {
    title,
    coverUrl,
    description,
    tags,
    kcal,
    durationMinutes,
    steps,
    difficulty,
    estimatedTime,
    servings,
    nutrition,
    consumptionPlan,
    shoppingList,
  }
}

export async function zhipuGenerateRecipe(env: Env, input: { prompt: string; ingredients: string[]; tools?: string[] }): Promise<Omit<RecipeDetail, 'id'>> {
  const model = (env.ZHIPU_LLM_MODEL || '').trim()
  if (!model) throw new ZhipuError('ZHIPU_NOT_CONFIGURED', 'ZHIPU_LLM_MODEL 未配置', 500)

  const prompt = input.prompt.trim()
  const ingredients = input.ingredients.map((x) => x.trim()).filter(Boolean).slice(0, 30)
  const tools = (input.tools ?? []).map((x) => x.trim()).filter(Boolean).slice(0, 30)

  const timeLimitMinutes = (() => {
    const m = /(\d{1,3})\s*分钟/.exec(prompt)
    if (!m) return null
    const n = Number(m[1])
    return Number.isFinite(n) ? Math.max(1, Math.floor(n)) : null
  })()
  const expiringCandidates = (() => {
    const hint = /(临期|快过期|快坏|还有\s*\d+\s*天|<=\s*\d+\s*天)/.test(prompt)
    if (!hint) return []
    return ingredients.filter((x) => prompt.includes(x)).slice(0, 10)
  })()

  const sys =
    `${SYSTEM_PROMPT}\n\n` +
    `【补充要求】\n` +
    `1. 只要 ingredients 非空，必须给出可执行方案；不要以“乱码/无法识别”为由拒绝。\n` +
    `2. 若缺少明确临期信息，允许基于用户描述推断；仍需输出 consumptionPlan 并标注 expiryHandling。\n` +
    `3. consumptionPlan[].ingredient 必须严格等于输入的 ingredients 中某一项，禁止使用“??/未知/占位符”。\n` +
    `4. shoppingList[].item 仅允许填写“需购买”的新物品；不要把已有 ingredients 填到购物清单里。\n` +
    `5. 全程只输出 JSON，不要输出 Markdown。\n`

  const user =
    `用户需求：${prompt}\n` +
    `时间限制：${timeLimitMinutes != null ? `${timeLimitMinutes}分钟` : '未给出'}\n` +
    `临期候选（<=3天，基于用户描述推断）：${expiringCandidates.join('、') || '未给出'}\n` +
    `食材（ingredients，可选且必须匹配）：${ingredients.join('、') || '无'}\n` +
    `厨具（tools）：${tools.join('、') || '无'}\n`

  const payload = {
    model,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: user },
    ],
    max_tokens: 2048,
    temperature: 0.6,
  }

  const res = await callMoonshot(env, { ...payload, model: 'moonshot-v1-8k' }, 60000)
  const content = res.choices?.[0]?.message?.content
  if (!content) throw new ZhipuError('LLM_BAD_RESPONSE', 'LLM 响应缺少内容', 502)

  try {
    const raw = extractJsonObject(content)
    const normalized = normalizeRecipe(raw)
    return applyContext(normalized, { ingredients, expiringCandidates, timeLimitMinutes })
  } catch {
    const normalized = normalizeRecipe({
      title: '快手做法',
      description: content,
      tags: ['临期优先'],
      kcal: 0,
      durationMinutes: 15,
      steps: [{ index: 1, text: content }],
    })
    return applyContext(normalized, { ingredients, expiringCandidates, timeLimitMinutes })
  }
}

/* ── 小票 OCR → LLM 解析 ── */

export interface ParsedReceiptItem {
  name: string
  qty: number
  unit: string
  purchasedAtMs: number
  shelfLifeDays: number
  storage: 'fridge' | 'freezer' | 'room'
}

function estimateShelfLife(name: string): number {
  const n = name.toLowerCase()
  // 精确匹配优先（放在前面）
  if (/白米豆|四季豆|豇豆|扁豆|毛豆|豌豆|蚕豆|芸豆|荷兰豆|甜豆|刀豆/.test(n)) return 5
  if (/菠菜|生菜|白菜|小青菜|油麦菜|茼蒿|芹菜|韭菜|香菜|小葱|蒜苗|牛心菜/.test(n)) return 3
  if (/土豆|胡萝卜|洋葱|红薯|紫薯|山药|芋头|莲藕|白萝卜/.test(n)) return 14
  if (/西芹|莴笋|芦笋|秋葵|芥蓝|菜心/.test(n)) return 7
  if (/蘑菇|香菇|平菇|金针菇|杏鲍菇|木耳|银耳/.test(n)) return 5
  if (/番茄|西红柿|辣椒|青椒|红椒|茄子|黄瓜|西葫芦|南瓜|冬瓜|牛椒|圆椒|尖椒/.test(n)) return 7
  if (/鸡胸肉|鸡腿|鸡翅|牛腩|牛里脊|猪里脊|五花肉|排骨|培根|火腿|香肠|肉/.test(n)) return 2
  if (/鸡|鸭|鹅|鱼|虾|蟹|贝/.test(n)) return 2
  if (/蛋|鸡蛋|鸭蛋|鹅蛋|鹌鹑蛋/.test(n)) return 14
  if (/豆腐|豆干|豆皮|腐竹|千张|素鸡/.test(n)) return 2
  if (/盐|糖|酱油|醋|料酒|油|酱|粉|香料|八角|桂皮|花椒|胡椒|生姜|大蒜/.test(n)) return 365
  if (/挂面|方便面|面条|米粉|粉丝/.test(n)) return 180
  if (/苹果|梨|橙子|橘子|柚子|柠檬|葡萄|香蕉|西瓜|哈密瓜|草莓|蓝莓/.test(n)) return 7
  return 3
}

function inferStorage(name: string): 'fridge' | 'freezer' | 'room' {
  const n = name.toLowerCase()
  if (/盐|糖|酱油|醋|料酒|油|酱|粉|香料|八角|桂皮|花椒|胡椒|生姜|大蒜/.test(n)) return 'room'
  if (/挂面|方便面|面条|米粉|粉丝|大米|小米|糯米/.test(n)) return 'room'
  if (/冷冻|冰鲜|速冻|冰块/.test(n)) return 'freezer'
  return 'fridge'
}

function normalizeQty(qty: number, unit: string): { qty: number; unit: string } {
  const u = unit.toLowerCase().trim()
  if (u === 'kg' || u === '千克') return { qty: Math.round(qty * 1000), unit: 'g' }
  if (u === '斤') return { qty: Math.round(qty * 500), unit: 'g' }
  if (u === '两') return { qty: Math.round(qty * 50), unit: 'g' }
  if (u === 'l' || u === '升') return { qty: Math.round(qty * 1000), unit: 'ml' }
  return { qty: Math.round(qty), unit: u || '个' }
}

function extractReceiptDate(text: string): number {
  const patterns = [
    /(\d{4})[-\/年](\d{1,2})[-\/月](\d{1,2})日?\s+(\d{1,2})[:：](\d{1,2})(?:[:：](\d{1,2}))?/,
    /(\d{4})(\d{2})(\d{2})\s+(\d{2})(\d{2})(\d{2})?/,
    /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/,
  ]
  for (const re of patterns) {
    const m = re.exec(text)
    if (m) {
      const y = Number(m[1])
      const mon = Number(m[2]) - 1
      const d = Number(m[3])
      const h = m[4] ? Number(m[4]) : 0
      const min = m[5] ? Number(m[5]) : 0
      const s = m[6] ? Number(m[6]) : 0
      const ts = new Date(y, mon, d, h, min, s).getTime()
      if (Number.isFinite(ts) && ts > 1600000000000) return ts
    }
  }
  return Date.now()
}

function isNonFoodLine(line: string): boolean {
  const t = line.trim()
  if (t.length === 0 || t.length > 50) return true
  const nonFood = /合计|总计|小计|应收|实收|找零|现金|刷卡|支付宝|微信|优惠|折扣|会员|积分|应付|支付|订单|单号|编号|时间|日期|地址|电话|欢迎|光临|谢谢|惠顾|客服|热线|门店|店铺|收银|机号|工号|流水|票号|原价|数量|单价|品名|NO\.?|Tel|TEL|导购|收银员|原价|实付|数量|找零|收银|小票|发票|打印|终端|机器|号|No|NO|条形码|二维码|温馨提示|注意事项|超市|生鲜| basket|market|store/
  if (nonFood.test(t)) return true
  if (/^\d{4,20}$/.test(t)) return true // 纯数字（单号、金额等）
  if (/^[¥￥$€£]/.test(t)) return true // 价格行
  return false
}

function parseReceiptLine(line: string): { name: string; qty: number; unit: string } | null {
  const t = line.trim()
  // 常见格式：
  // 1.小青菜 0.676kg 3.96 2.68
  // 小青菜 0.676kg
  // 1. 小青菜

  // 去掉序号前缀
  const cleaned = t.replace(/^\s*\d+[\.、)\】\〕]\s*/, '').trim()
  if (!cleaned) return null

  // 匹配 名称 + 重量
  const m1 = /^(.*?)\s+([\d\.]+)\s*(kg|g|斤|两|千克|克|L|l|升|ml|毫升|个|件|瓶|包|盒|袋|只|条|根|把|束|瓣|颗|片|块)/.exec(cleaned)
  if (m1) {
    const name = m1[1].trim()
    const rawQty = Number(m1[2])
    const rawUnit = m1[3]
    const { qty, unit } = normalizeQty(rawQty, rawUnit)
    return { name, qty, unit }
  }

  // 只有名称
  const name = cleaned.replace(/\s+\d+.*$/, '').trim() // 去掉后面的数字
  if (name.length >= 1 && name.length <= 15) {
    return { name, qty: 1, unit: '个' }
  }

  return null
}

function ruleParseReceipt(ocrText: string): ParsedReceiptItem[] {
  const purchasedAtMs = extractReceiptDate(ocrText)
  const lines = ocrText.split('\n').map((l) => l.trim())
  const items: ParsedReceiptItem[] = []

  for (const line of lines) {
    if (isNonFoodLine(line)) continue
    const parsed = parseReceiptLine(line)
    if (!parsed) continue
    // 去重
    if (items.some((x) => x.name === parsed.name)) continue
    items.push({
      name: parsed.name,
      qty: parsed.qty,
      unit: parsed.unit,
      purchasedAtMs,
      shelfLifeDays: estimateShelfLife(parsed.name),
      storage: inferStorage(parsed.name),
    })
  }

  return items
}

export async function parseReceiptWithLlm(env: Env, ocrText: string): Promise<ParsedReceiptItem[]> {
  const model = (env.ZHIPU_LLM_MODEL || '').trim()
  const now = Date.now()

  if (!model) {
    return ruleParseReceipt(ocrText)
  }

  const sys = `你是一位购物小票解析专家。请从 OCR 识别出的超市购物小票文字中，提取所有食材信息。

【任务】
1. 识别小票中的商品名称和重量。
2. 把重量统一转换成克（g）为单位的整数。
3. 估算每种食材的保质期（冷藏条件下的天数）。
4. 推断存储方式（fridge=冷藏, freezer=冷冻, room=常温）。

【输出格式】
只输出 JSON，不要任何解释：
{"items":[{"name":"食材名称","qty":676,"unit":"g","purchasedAtMs":1763615530000,"shelfLifeDays":3,"storage":"fridge"}]}

【规则】
- name：简体中文食材名称。例如"小青菜"、"胡萝卜"。不要包含序号、价格、单位。
- qty：整数克。0.676kg→676g，1斤→500g，0.5kg→500g。
- purchasedAtMs：从小票上的日期时间提取时间戳（毫秒）。如果没有日期，用当前时间戳 ${now}。
- shelfLifeDays：叶菜3天，根茎类14天，茄果类7天，菌菇5天，豆类5天，肉类2天，蛋类14天，豆制品2天，调料365天。
- storage：默认 fridge。只有明确标"冷冻"的用 freezer，调料/干货/米面用 room。
- 严格过滤非食材项：不要包含"合计"、"收银员"、"支付宝"、"微信"、"原价"、"实付"、"优惠"、"数量"、"单价"、"小计"、"超市"、"门店"、"单号"等。
- 如果某行只有纯数字（如"3.96"、"2.68"、"59.24"），忽略。
- 如果某行只有金额或价格符号（如"¥12.5"），忽略。
- 只返回真正的食材。`

  const payload = {
    model,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: `【OCR 小票原始文字】\n${ocrText.trim()}` },
    ],
    max_tokens: 2048,
    temperature: 0.1,
  }

  try {
    const res = await callMoonshot(env, { ...payload, model: 'moonshot-v1-8k' }, 25000)
    const content = res.choices?.[0]?.message?.content
    if (!content) throw new Error('empty response')
    const raw = extractJsonObject(content) as { items?: Array<Partial<ParsedReceiptItem>> }
    const items = (raw?.items ?? []).filter((x) => x && typeof x.name === 'string' && x.name.trim() && x.name.trim().length >= 1 && x.name.trim().length <= 20)
    if (items.length === 0) throw new Error('no items')
    return items.map((x) => {
      const name = x.name!.trim()
      const { qty, unit } = normalizeQty(Number(x.qty) || 1, String(x.unit || '个'))
      const purchasedAtMs = Number.isFinite(Number(x.purchasedAtMs)) ? Number(x.purchasedAtMs) : now
      const shelfLifeDays = Number.isFinite(Number(x.shelfLifeDays)) ? Number(x.shelfLifeDays) : estimateShelfLife(name)
      const storageRaw = String(x.storage || 'fridge')
      const storage: 'fridge' | 'freezer' | 'room' =
        storageRaw === 'freezer' || storageRaw === '冷冻' ? 'freezer' :
        storageRaw === 'room' || storageRaw === '常温' ? 'room' : 'fridge'
      return { name, qty, unit, purchasedAtMs, shelfLifeDays, storage }
    })
  } catch {
    // fallback 到规则解析
    return ruleParseReceipt(ocrText)
  }
}
