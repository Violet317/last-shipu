export interface ApiErrorPayload {
  code: string
  message: string
}

export class ApiError extends Error {
  public readonly code: string
  public readonly httpStatus?: number

  constructor(payload: ApiErrorPayload, httpStatus?: number) {
    super(payload.message)
    this.code = payload.code
    this.httpStatus = httpStatus
  }
}

export interface ApiResponse<T> {
  code: string
  message: string
  data: T
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export interface RequestOptions<TBody = unknown> {
  url: string
  method: HttpMethod
  body?: TBody
  headers?: Record<string, string>
  timeoutMs?: number
  retry?: number
  auth?: boolean
}
