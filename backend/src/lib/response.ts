import type { FastifyReply } from 'fastify'

export type ApiOk<T> = { code: '0'; message: 'ok'; data: T }
export type ApiErr = { code: string; message: string; data: null }

export function ok<T>(data: T): ApiOk<T> {
  return { code: '0', message: 'ok', data }
}

export function fail(reply: FastifyReply, statusCode: number, code: string, message: string): void {
  reply.status(statusCode).send({ code, message, data: null } satisfies ApiErr)
}

