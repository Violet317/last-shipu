export interface MockApiResponse<T> {
  code: string
  message: string
  data: T
}

export function ok<T>(data: T): MockApiResponse<T> {
  return { code: '0', message: 'OK', data }
}

