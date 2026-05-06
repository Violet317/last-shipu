import type { FastifyInstance } from 'fastify'

import { z } from 'zod'

import type { Env } from '../lib/env'

import { prisma } from '../lib/db'

import { fail, ok } from '../lib/response'

import { digestToken, getUserId, id, issueRefreshToken, verifyHash } from '../lib/auth'

import { sendLoginCode } from '../lib/mail'

import bcrypt from 'bcryptjs'

const emailSchema = z.string().email().min(3).max(255)

function nowMs(): bigint {
  return BigInt(Date.now())
}

function addSeconds(t: bigint, seconds: number): bigint {
  return t + BigInt(seconds) * BigInt(1000)
}

async function issueTokens(app: FastifyInstance, env: Env, user: { id: string; email: string }) {
  const accessToken = await app.jwt.sign(
    { sub: user.id, email: user.email },
    { expiresIn: env.ACCESS_TOKEN_TTL_SECONDS }
  )
  const refreshToken = issueRefreshToken()
  const refreshHash = digestToken(refreshToken)
  const createdAt = nowMs()
  await prisma.refreshToken.create({
    data: {
      id: id('rt'),
      userId: user.id,
      tokenHash: refreshHash,
      expiresAtMs: addSeconds(createdAt, env.REFRESH_TOKEN_TTL_SECONDS),
      createdAtMs: createdAt,
    },
  })
  return { accessToken, refreshToken, expiresAtMs: Number(addSeconds(createdAt, env.ACCESS_TOKEN_TTL_SECONDS)) }
}

export async function registerAuthRoutes(app: FastifyInstance, env: Env): Promise<void> {

  app.get('/api/auth/me', async (req, reply) => {

    const userId = getUserId(req)

    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user) return fail(reply, 401, 'UNAUTHORIZED', '用户不存在')

    return reply.send(ok({ id: user.id, email: user.email, nickname: user.nickname }))

  })



  app.post('/api/auth/guest', async (_req, reply) => {
    const email = `guest+${id('g').slice(2)}@guest.local`
    const user = await prisma.user.create({
      data: { id: id('u'), email, nickname: '访客', createdAtMs: nowMs() },
    })
    const tokens = await issueTokens(app, env, user)
    return reply.send(ok(tokens))
  })

  app.post('/api/auth/code', async (req, reply) => {
    const parsed = z.object({ email: emailSchema }).safeParse(req.body)
    if (!parsed.success) return fail(reply, 400, 'BAD_REQUEST', '参数错误')
    const email = parsed.data.email.toLowerCase()

    const code = String(Math.floor(100000 + Math.random() * 900000))
    const codeHash = await bcrypt.hash(code, 10)
    const now = nowMs()
    await prisma.authCode.create({
      data: {
        id: id('code'),
        email,
        codeHash,
        createdAtMs: now,
        expiresAtMs: addSeconds(now, 10 * 60),
      },
    })

    const sendRes = await sendLoginCode(env, email, code)
    if (!sendRes.ok) {
      app.log.error({ email, error: sendRes.error }, 'SMTP send failed')
      return fail(reply, 500, 'SMTP_ERROR', '邮件发送失败，请稍后重试')
    }
    app.log.info({ email }, 'login code sent via SMTP')
    return reply.send(ok({ sent: true }))
  })

  app.post('/api/auth/login', async (req, reply) => {
    const parsed = z.object({ email: emailSchema, code: z.string().min(4).max(16) }).safeParse(req.body)
    if (!parsed.success) return fail(reply, 400, 'BAD_REQUEST', '参数错误')
    const email = parsed.data.email.toLowerCase()
    const code = parsed.data.code.trim()

    const candidates = await prisma.authCode.findMany({
      where: { email, expiresAtMs: { gt: nowMs() } },
      orderBy: { createdAtMs: 'desc' },
      take: 5,
    })
    let matched = false
    for (const c of candidates) {
      if (await verifyHash(code, c.codeHash)) {
        matched = true
        break
      }
    }
    if (!matched) return fail(reply, 401, 'INVALID_CODE', '验证码错误或已过期')

    const existing = await prisma.user.findUnique({ where: { email } })
    const user =
      existing ??
      (await prisma.user.create({
        data: { id: id('u'), email, nickname: email.split('@')[0] || '用户', createdAtMs: nowMs() },
      }))

    const tokens = await issueTokens(app, env, user)
    return reply.send(ok(tokens))
  })

  app.post('/api/auth/refresh', async (req, reply) => {
    const parsed = z.object({ refreshToken: z.string().min(10).max(200) }).safeParse(req.body)
    if (!parsed.success) return fail(reply, 400, 'BAD_REQUEST', '参数错误')
    const refreshToken = parsed.data.refreshToken

    const tokenHash = digestToken(refreshToken)
    const matched = await prisma.refreshToken.findUnique({ where: { tokenHash } })
    if (!matched) return fail(reply, 401, 'INVALID_REFRESH', 'refresh token 无效')
    if (matched.revokedAtMs) return fail(reply, 401, 'INVALID_REFRESH', 'refresh token 无效')
    if (matched.expiresAtMs <= nowMs()) return fail(reply, 401, 'INVALID_REFRESH', 'refresh token 无效')

    await prisma.refreshToken.update({ where: { id: matched.id }, data: { revokedAtMs: nowMs() } })
    const user = await prisma.user.findUnique({ where: { id: matched.userId } })
    if (!user) return fail(reply, 401, 'INVALID_REFRESH', 'refresh token 无效')

    const tokens = await issueTokens(app, env, user)
    return reply.send(ok(tokens))
  })
}

