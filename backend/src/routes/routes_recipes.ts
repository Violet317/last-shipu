import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { Env } from '../lib/env'
import { getUserId, id } from '../lib/auth'
import { prisma } from '../lib/db'
import { fail, ok } from '../lib/response'
import { zhipuGenerateRecipe } from '../providers/zhipu/llm'

const bodySchema = z.object({
  prompt: z.string().min(1).max(2000),
  ingredients: z.array(z.string().min(1).max(80)).max(50),
  tools: z.array(z.string().min(1).max(80)).max(50).optional(),
})

function stubRecipe(ingredients: string[]) {
  const hasChicken = ingredients.some((x) => x.includes('鸡'))
  const title = hasChicken ? '快手清炒鸡胸菠菜' : '快手蒜香菠菜蛋'
  return {
    title,
    coverUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC7g9Xubj1mw5Nqvwh8GQjITBuDD4S4L1tVZbbqL4iOoIQ7EozhKX2qAI7JxZcXxG3yT9L8cxlYrrTs7qJDTqad7q2hQZr8m8kgKJmR5Bv8cX4c0fD1Q9dS5w7E4o0bPrVQK',
    description: '围绕临期食材的 15 分钟快手做法，步骤清晰，失败率低。',
    tags: ['快手', '临期优先'],
    kcal: 350,
    durationMinutes: 15,
    steps: [
      { index: 1, text: '处理临期食材：清洗沥干，按口感需要切段。' },
      { index: 2, text: '热锅少油，下蒜末爆香，快速翻炒主食材。' },
      { index: 3, text: '调味出锅：盐/生抽少量，保持清爽。' },
    ],
  }
}

export async function registerRecipeRoutes(app: FastifyInstance, env: Env): Promise<void> {
  app.post('/api/recipes/generate', async (req, reply) => {
    // 临时：为测试目的，如果没有认证用户，使用默认测试用户ID
    let userId: string
    try {
      userId = getUserId(req)
    } catch {
      // 如果没有认证，使用临时测试用户ID
      userId = 'test_user_' + Date.now()
    }

    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) return fail(reply, 400, 'BAD_REQUEST', '参数错误')

    if (!env.LLM_PROVIDER) {
      return fail(reply, 501, 'LLM_NOT_CONFIGURED', 'LLM 未配置')
    }

    if (env.LLM_PROVIDER === 'mock') {
      const now = Date.now()
      const stub = stubRecipe(parsed.data.ingredients)
      const detail = { id: id('r'), ...stub }
      await prisma.recipe.create({
        data: {
          id: detail.id,
          userId,
          title: detail.title,
          coverUrl: detail.coverUrl,
          tagsJson: JSON.stringify(detail.tags),
          kcal: detail.kcal,
          durationMinutes: detail.durationMinutes,
          stepsJson: JSON.stringify(detail.steps),
          sourceIngredientsJson: JSON.stringify(parsed.data.ingredients),
          createdAtMs: BigInt(now),
        },
      })
      return reply.send(ok(detail))
    }

    if (env.LLM_PROVIDER === 'zhipu' || env.LLM_PROVIDER === 'moonshot') {
      const now = Date.now()
      const generated = await zhipuGenerateRecipe(env, parsed.data)
      const detail = { id: id('r'), ...generated }
      await prisma.recipe.create({
        data: {
          id: detail.id,
          userId,
          title: detail.title,
          coverUrl: detail.coverUrl,
          tagsJson: JSON.stringify(detail.tags),
          kcal: detail.kcal,
          durationMinutes: detail.durationMinutes,
          stepsJson: JSON.stringify(detail.steps),
          sourceIngredientsJson: JSON.stringify(parsed.data.ingredients),
          createdAtMs: BigInt(now),
        },
      })
      return reply.send(ok(detail))
    }
    return fail(reply, 501, 'LLM_NOT_IMPLEMENTED', 'LLM 后端尚未接入')
  })
}
