import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { loadEnv } from './lib/env'
import { attachAuth } from './lib/auth'
import { registerRoutes } from './routes'
import { fail } from './lib/response'
import { ZhipuError } from './providers/zhipu/client'

export async function buildApp() {
  const env = loadEnv()

  const app = Fastify({
    logger: {
      level: 'info',
      redact: ['req.headers.authorization'],
    },
    bodyLimit: 4 * 1024 * 1024,
  })

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZhipuError) {
      fail(reply, err.status || 502, err.code, err.message)
      return
    }
    app.log.error(err)
    fail(reply, 500, 'INTERNAL_ERROR', '服务器异常')
  })

  await app.register(cors, {
    origin: true,
    credentials: true,
  })

  await app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: '1 minute',
  })

  attachAuth(app, env)
  await registerRoutes(app, env)

  return { app, env }
}
