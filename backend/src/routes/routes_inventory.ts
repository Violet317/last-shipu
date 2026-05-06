import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { getUserId, id } from '../lib/auth'
import { fail, ok } from '../lib/response'

const categorySchema = z.enum(['veg', 'meat', 'tool'])

const upsertSchema = z.object({
  category: categorySchema,
  nameZh: z.string().min(1).max(50),
  nameEn: z.string().min(1).max(50),
  kcalPer100g: z.number().int().min(0).max(5000),
  unit: z.string().min(1).max(10),
  thumbnailUrl: z.string().min(1).max(500),
})

function toDto(x: {
  id: string
  category: string
  nameZh: string
  nameEn: string
  kcalPer100g: number
  unit: string
  thumbnailUrl: string
  sort: number
  updatedAtMs: bigint
}) {
  return {
    id: x.id,
    category: x.category,
    nameZh: x.nameZh,
    nameEn: x.nameEn,
    kcalPer100g: x.kcalPer100g,
    unit: x.unit,
    thumbnailUrl: x.thumbnailUrl,
    sort: x.sort,
    updatedAtMs: Number(x.updatedAtMs),
  }
}

export async function registerInventoryRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/inventory', async (req, reply) => {
    const userId = getUserId(req)
    const list = await prisma.inventoryItem.findMany({
      where: { OR: [{ userId: null }, { userId }] },
      orderBy: [{ category: 'asc' }, { sort: 'asc' }],
    })
    return reply.send(ok(list.map(toDto)))
  })

  app.post('/api/inventory', async (req, reply) => {
    const userId = getUserId(req)
    const parsed = upsertSchema.safeParse(req.body)
    if (!parsed.success) return fail(reply, 400, 'BAD_REQUEST', '参数错误')
    const now = BigInt(Date.now())

    const maxSort = await prisma.inventoryItem.aggregate({
      where: { userId, category: parsed.data.category },
      _max: { sort: true },
    })
    const nextSort = (maxSort._max.sort ?? 0) + 10

    try {
      const created = await prisma.inventoryItem.create({
        data: {
          id: id('inv'),
          userId,
          ...parsed.data,
          sort: nextSort,
          updatedAtMs: now,
        },
      })
      return reply.send(ok(toDto(created)))
    } catch {
      return fail(reply, 409, 'ALREADY_EXISTS', '已存在')
    }
  })

  app.put('/api/inventory/:id', async (req, reply) => {
    const userId = getUserId(req)
    const invId = String((req.params as any).id || '')
    const parsed = upsertSchema.extend({ sort: z.number().int().optional() }).safeParse(req.body)
    if (!parsed.success) return fail(reply, 400, 'BAD_REQUEST', '参数错误')

    const existing = await prisma.inventoryItem.findUnique({ where: { id: invId } })
    if (!existing) return fail(reply, 404, 'NOT_FOUND', '不存在')
    if (existing.userId !== userId) return fail(reply, 403, 'FORBIDDEN', '无权限')

    const now = BigInt(Date.now())
    const updated = await prisma.inventoryItem.update({
      where: { id: invId },
      data: { ...parsed.data, sort: parsed.data.sort ?? existing.sort, updatedAtMs: now },
    })
    return reply.send(ok(toDto(updated)))
  })

  app.delete('/api/inventory/:id', async (req, reply) => {
    const userId = getUserId(req)
    const invId = String((req.params as any).id || '')
    const existing = await prisma.inventoryItem.findUnique({ where: { id: invId } })
    if (!existing) return reply.send(ok({ ok: true }))
    if (existing.userId !== userId) return fail(reply, 403, 'FORBIDDEN', '内置食材不可删除')
    await prisma.inventoryItem.delete({ where: { id: invId } })
    return reply.send(ok({ ok: true }))
  })
}

