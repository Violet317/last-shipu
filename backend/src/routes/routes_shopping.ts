import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { getUserId, id } from '../lib/auth'
import { fail, ok } from '../lib/response'

const upsertSchema = z.object({
  name: z.string().min(1).max(80),
  qty: z.number().int().positive().optional(),
  checked: z.boolean().optional(),
})

function toDto(x: { id: string; name: string; qty: number | null; checked: boolean; updatedAtMs: bigint }) {
  return {
    id: x.id,
    name: x.name,
    qty: x.qty ?? undefined,
    checked: x.checked,
    updatedAtMs: Number(x.updatedAtMs),
  }
}

export async function registerShoppingRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/shopping', async (req, reply) => {
    const userId = getUserId(req)
    const list = await prisma.shoppingItem.findMany({ where: { userId }, orderBy: [{ checked: 'asc' }, { updatedAtMs: 'desc' }] })
    return reply.send(ok(list.map(toDto)))
  })

  app.post('/api/shopping', async (req, reply) => {
    const userId = getUserId(req)
    const parsed = upsertSchema.safeParse(req.body)
    if (!parsed.success) return fail(reply, 400, 'BAD_REQUEST', '参数错误')
    const now = BigInt(Date.now())
    const created = await prisma.shoppingItem.create({
      data: {
        id: id('shop'),
        userId,
        name: parsed.data.name,
        qty: parsed.data.qty ?? null,
        checked: parsed.data.checked ?? false,
        updatedAtMs: now,
      },
    })
    return reply.send(ok(toDto(created)))
  })

  app.put('/api/shopping/:id', async (req, reply) => {
    const userId = getUserId(req)
    const sid = String((req.params as any).id || '')
    const parsed = upsertSchema.partial().safeParse(req.body)
    if (!parsed.success) return fail(reply, 400, 'BAD_REQUEST', '参数错误')
    const existing = await prisma.shoppingItem.findUnique({ where: { id: sid } })
    if (!existing) return fail(reply, 404, 'NOT_FOUND', '不存在')
    if (existing.userId !== userId) return fail(reply, 403, 'FORBIDDEN', '无权限')
    const now = BigInt(Date.now())
    const updated = await prisma.shoppingItem.update({
      where: { id: sid },
      data: {
        name: parsed.data.name ?? existing.name,
        qty: parsed.data.qty === undefined ? existing.qty : parsed.data.qty ?? null,
        checked: parsed.data.checked ?? existing.checked,
        updatedAtMs: now,
      },
    })
    return reply.send(ok(toDto(updated)))
  })

  app.delete('/api/shopping/:id', async (req, reply) => {
    const userId = getUserId(req)
    const sid = String((req.params as any).id || '')
    const existing = await prisma.shoppingItem.findUnique({ where: { id: sid } })
    if (!existing) return reply.send(ok({ ok: true }))
    if (existing.userId !== userId) return fail(reply, 403, 'FORBIDDEN', '无权限')
    await prisma.shoppingItem.delete({ where: { id: sid } })
    return reply.send(ok({ ok: true }))
  })
}

