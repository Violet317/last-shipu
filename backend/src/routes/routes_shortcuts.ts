import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { getUserId, id } from '../lib/auth'
import { fail, ok } from '../lib/response'

const upsertSchema = z.object({
  title: z.string().min(1).max(30),
  prompt: z.string().min(1).max(2000),
  enabled: z.boolean(),
})

function toDto(x: { id: string; title: string; prompt: string; sort: number; enabled: boolean; updatedAtMs: bigint }) {
  return {
    id: x.id,
    title: x.title,
    prompt: x.prompt,
    sort: x.sort,
    enabled: x.enabled,
    updatedAtMs: Number(x.updatedAtMs),
  }
}

export async function seedBuiltInShortcutsIfNeeded(): Promise<void> {
  const count = await prisma.shortcutTemplate.count({ where: { userId: null } })
  if (count > 0) return
  const now = BigInt(Date.now())
  const seeded = [
    {
      title: '临期快手3个',
      prompt: '请基于我已选临期食材，给出 3 个快手做法（每个都要：用料清单、步骤、热量估算、可替代食材）。优先消耗最快过期的食材。',
      sort: 10,
      enabled: true,
    },
    {
      title: '快手菜',
      prompt: '请生成一份快手菜：15分钟内完成，步骤尽量少，调味简单，优先使用我已选食材。',
      sort: 20,
      enabled: true,
    },
    {
      title: '清冰箱',
      prompt: '请基于我已选食材，给出清冰箱方案：优先消耗临期食材，说明如何处理与保存，避免浪费，并给出两种替代搭配。',
      sort: 30,
      enabled: true,
    },
    {
      title: '减脂餐',
      prompt: '请生成一份减脂餐：高蛋白、低油低盐，优先使用我已选食材，给出详细步骤与热量估算。',
      sort: 40,
      enabled: true,
    },
  ] as const

  await prisma.shortcutTemplate.createMany({
    data: seeded.map((x) => ({
      id: id('sc'),
      userId: null,
      title: x.title,
      prompt: x.prompt,
      sort: x.sort,
      enabled: x.enabled,
      updatedAtMs: now,
    })),
  })
}

export async function registerShortcutsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/shortcuts', async (req, reply) => {
    const userId = getUserId(req)
    const list = await prisma.shortcutTemplate.findMany({
      where: { OR: [{ userId: null }, { userId }] },
      orderBy: [{ sort: 'asc' }, { updatedAtMs: 'desc' }],
    })
    return reply.send(ok(list.map(toDto)))
  })

  app.post('/api/shortcuts', async (req, reply) => {
    const userId = getUserId(req)
    const parsed = upsertSchema.safeParse(req.body)
    if (!parsed.success) return fail(reply, 400, 'BAD_REQUEST', '参数错误')
    const now = BigInt(Date.now())
    const maxSort = await prisma.shortcutTemplate.aggregate({
      where: { userId },
      _max: { sort: true },
    })
    const nextSort = (maxSort._max.sort ?? 0) + 10
    const created = await prisma.shortcutTemplate.create({
      data: {
        id: id('sc'),
        userId,
        title: parsed.data.title,
        prompt: parsed.data.prompt,
        enabled: parsed.data.enabled,
        sort: nextSort,
        updatedAtMs: now,
      },
    })
    return reply.send(ok(toDto(created)))
  })

  app.put('/api/shortcuts/:id', async (req, reply) => {
    const userId = getUserId(req)
    const sid = String((req.params as any).id || '')
    const parsed = upsertSchema.extend({ sort: z.number().int().optional() }).safeParse(req.body)
    if (!parsed.success) return fail(reply, 400, 'BAD_REQUEST', '参数错误')

    const existing = await prisma.shortcutTemplate.findUnique({ where: { id: sid } })
    if (!existing) return fail(reply, 404, 'NOT_FOUND', '不存在')
    if (existing.userId !== userId) return fail(reply, 403, 'FORBIDDEN', '无权限')
    const now = BigInt(Date.now())
    const updated = await prisma.shortcutTemplate.update({
      where: { id: sid },
      data: {
        title: parsed.data.title,
        prompt: parsed.data.prompt,
        enabled: parsed.data.enabled,
        sort: parsed.data.sort ?? existing.sort,
        updatedAtMs: now,
      },
    })
    return reply.send(ok(toDto(updated)))
  })

  app.delete('/api/shortcuts/:id', async (req, reply) => {
    const userId = getUserId(req)
    const sid = String((req.params as any).id || '')
    const existing = await prisma.shortcutTemplate.findUnique({ where: { id: sid } })
    if (!existing) return reply.send(ok({ ok: true }))
    if (existing.userId !== userId) return fail(reply, 403, 'FORBIDDEN', '无权限')
    await prisma.shortcutTemplate.delete({ where: { id: sid } })
    return reply.send(ok({ ok: true }))
  })
}

