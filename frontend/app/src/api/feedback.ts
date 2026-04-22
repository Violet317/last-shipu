import { request } from './client'

export interface FeedbackSubmitRequest {
  content: string
  screenshots: Array<{ url?: string; base64?: string }>
}

export interface FeedbackSubmitResponse {
  ok: true
  ticketId: string
}

export async function submitFeedback(body: FeedbackSubmitRequest): Promise<FeedbackSubmitResponse> {
  return await request<FeedbackSubmitResponse, FeedbackSubmitRequest>({
    method: 'POST',
    url: '/api/feedback',
    body,
  })
}

