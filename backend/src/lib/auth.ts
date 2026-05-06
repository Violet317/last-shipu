import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { fail } from './response'
import type { Env } from './env'
import { createHash } from 'node:crypto'

export function id(prefix: string): string {
  return `${prefix}_${nanoid(16)}`
}

export async function hashToken(raw: string): Promise<string> {
  return await bcrypt.hash(raw, 10)
}

export async function verifyHash(raw: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(raw, hash)
}

export function issueRefreshToken(): string {
  return nanoid(48)
}

export function digestToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex')
}

export function attachAuth(app: FastifyInstance, env: Env): void {
  app.register(import('@fastify/jwt'), { secret: env.JWT_SECRET })

  const isDev = env.NODE_ENV !== 'production'

  app.addHook('preHandler', async (req, reply) => {
    const url = req.url || ''
    if (!url.startsWith('/api/')) return

    // 公开接口：不需要认证
    const publicPaths = ['/api/auth/guest', '/api/auth/code', '/api/auth/login', '/api/auth/refresh', '/api/auth/me', '/api/ocr/recognize']
    if (publicPaths.some((p) => url.startsWith(p))) return

    try {
      await req.jwtVerify()
    } catch {
      if (!isDev) {
        fail(reply, 401, 'UNAUTHORIZED', '请先登录')
        return
      }
      // 开发模式：静默忽略，让 getUserId 兜底
    }
  })
}

export function getUserId(req: FastifyRequest): string {
  const anyReq = req as unknown as { user?: { sub?: string } }
  const sub = anyReq.user?.sub
  if (sub) return String(sub)
  // 开发模式兜底
  return 'dev_user'
}
