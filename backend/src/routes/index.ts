import type { FastifyInstance } from 'fastify'
import type { Env } from '../lib/env'
import { ok } from '../lib/response'
import { prisma } from '../lib/db'
import { seedInventory } from '../seed/inventorySeed'
import { id } from '../lib/auth'
import { registerAuthRoutes } from './routes_auth'
import { registerInventoryRoutes } from './routes_inventory'
import { registerPantryRoutes } from './routes_pantry'
import { registerShoppingRoutes } from './routes_shopping'
import { registerOcrRoutes } from './routes_ocr'
import { registerRecipeRoutes } from './routes_recipes'
import { registerFeaturedRoutes } from './routes_featured'
import { registerShortcutsRoutes, seedBuiltInShortcutsIfNeeded } from './routes_shortcuts'

async function seedBuiltInInventoryIfNeeded(): Promise<void> {
  const count = await prisma.inventoryItem.count({ where: { userId: null } })
  if (count > 0) return
  const now = BigInt(Date.now())
  await prisma.inventoryItem.createMany({
    data: seedInventory.map((x) => ({
      id: id('inv'),
      userId: null,
      category: x.category,
      nameZh: x.nameZh,
      nameEn: x.nameEn,
      kcalPer100g: x.kcalPer100g,
      unit: x.unit,
      thumbnailUrl: x.thumbnailUrl,
      sort: x.sort,
      updatedAtMs: now,
    })),
  })
}

async function seedDevUserIfNeeded(): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { id: 'dev_user' } })
  if (existing) return
  const now = BigInt(Date.now())
  await prisma.user.create({
    data: {
      id: 'dev_user',
      email: 'dev@localhost',
      nickname: '开发用户',
      createdAtMs: now,
    },
  })
}

export async function registerRoutes(app: FastifyInstance, env: Env): Promise<void> {
  app.get('/', async () =>
    ok({
      service: 'last-shipu-backend',
      health: '/health',
      apiBase: '/api',
    })
  )
  app.get('/health', async () => ok({ ok: true }))

  await seedBuiltInInventoryIfNeeded()
  await seedBuiltInShortcutsIfNeeded()
  await seedDevUserIfNeeded()

  await registerAuthRoutes(app, env)
  await registerInventoryRoutes(app)
  await registerPantryRoutes(app)
  await registerShoppingRoutes(app)
  await registerShortcutsRoutes(app)
  await registerOcrRoutes(app, env)
  await registerRecipeRoutes(app, env)
  await registerFeaturedRoutes(app)
}
