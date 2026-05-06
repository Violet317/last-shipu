import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { getUserId, id } from '../lib/auth'
import { fail, ok } from '../lib/response'

const storageSchema = z.enum(['fridge', 'freezer', 'room'])
const sourceSchema = z.enum(['manual', 'ocr_receipt', 'ocr_fridge'])

const upsertSchema = z.object({
  inventoryId: z.string().min(1).max(80),
  storage: storageSchema,
  purchasedAtMs: z.number().int().positive(),
  expiresAtMs: z.number().int().positive(),
  source: sourceSchema,
  qty: z.number().int().positive().optional(),
})

function toDto(x: {
  id: string
  inventoryId: string
  storage: string
  purchasedAtMs: bigint
  expiresAtMs: bigint
  source: string
  qty: number | null
  updatedAtMs: bigint
}) {
  return {
    id: x.id,
    inventoryId: x.inventoryId,
    storage: x.storage,
    purchasedAtMs: Number(x.purchasedAtMs),
    expiresAtMs: Number(x.expiresAtMs),
    source: x.source,
    qty: x.qty ?? undefined,
    updatedAtMs: Number(x.updatedAtMs),
  }
}

export async function registerPantryRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/pantry', async (req, reply) => {
    const userId = getUserId(req)
    const list = await prisma.pantryItem.findMany({ where: { userId }, orderBy: { expiresAtMs: 'asc' } })
    return reply.send(ok(list.map(toDto)))
  })

  app.post('/api/pantry', async (req, reply) => {
    const userId = getUserId(req)
    const parsed = upsertSchema.safeParse(req.body)
    if (!parsed.success) return fail(reply, 400, 'BAD_REQUEST', '参数错误')
    const now = BigInt(Date.now())
    const created = await prisma.pantryItem.create({
      data: {
        id: id('pan'),
        userId,
        inventoryId: parsed.data.inventoryId,
        storage: parsed.data.storage,
        purchasedAtMs: BigInt(parsed.data.purchasedAtMs),
        expiresAtMs: BigInt(parsed.data.expiresAtMs),
        source: parsed.data.source,
        qty: parsed.data.qty ?? null,
        updatedAtMs: now,
      },
    })
    return reply.send(ok(toDto(created)))
  })

  app.put('/api/pantry/:id', async (req, reply) => {
    const userId = getUserId(req)
    const panId = String((req.params as any).id || '')
    const parsed = upsertSchema.partial().safeParse(req.body)
    if (!parsed.success) return fail(reply, 400, 'BAD_REQUEST', '参数错误')
    const existing = await prisma.pantryItem.findUnique({ where: { id: panId } })
    if (!existing) return fail(reply, 404, 'NOT_FOUND', '不存在')
    if (existing.userId !== userId) return fail(reply, 403, 'FORBIDDEN', '无权限')
    const now = BigInt(Date.now())
    const updated = await prisma.pantryItem.update({
      where: { id: panId },
      data: {
        inventoryId: parsed.data.inventoryId ?? existing.inventoryId,
        storage: parsed.data.storage ?? existing.storage,
        purchasedAtMs: parsed.data.purchasedAtMs ? BigInt(parsed.data.purchasedAtMs) : existing.purchasedAtMs,
        expiresAtMs: parsed.data.expiresAtMs ? BigInt(parsed.data.expiresAtMs) : existing.expiresAtMs,
        source: parsed.data.source ?? existing.source,
        qty: parsed.data.qty === undefined ? existing.qty : parsed.data.qty ?? null,
        updatedAtMs: now,
      },
    })
    return reply.send(ok(toDto(updated)))
  })

  app.delete('/api/pantry/:id', async (req, reply) => {
    const userId = getUserId(req)
    const panId = String((req.params as any).id || '')
    const existing = await prisma.pantryItem.findUnique({ where: { id: panId } })
    if (!existing) return reply.send(ok({ ok: true }))
    if (existing.userId !== userId) return fail(reply, 403, 'FORBIDDEN', '无权限')
    await prisma.pantryItem.delete({ where: { id: panId } })
    return reply.send(ok({ ok: true }))
  })
}

