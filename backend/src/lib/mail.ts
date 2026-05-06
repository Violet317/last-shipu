import { createTransport, type Transporter } from 'nodemailer'
import type { Env } from './env'

let transporter: Transporter | null = null

export function initMailer(env: Env): Transporter | null {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return null
  if (transporter) return transporter

  transporter = createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  })
  return transporter
}

export async function sendLoginCode(
  env: Env,
  to: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const mailer = initMailer(env)
  if (!mailer) return { ok: false, error: 'SMTP 未配置' }

  const appName = '美食策展人'
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; color: #333;">
      <h2 style="font-size: 20px; margin-bottom: 16px; color: #4caf50;">${appName}</h2>
      <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px;">您的登录验证码为：</p>
      <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #4caf50; margin-bottom: 24px; padding: 16px; background: #f0f9f0; border-radius: 12px; text-align: center;">${code}</div>
      <p style="font-size: 13px; color: #888; line-height: 1.6;">验证码 10 分钟内有效，请勿泄露给他人。<br>如非本人操作，请忽略此邮件。</p>
    </div>
  `

  try {
    await mailer.sendMail({
      from: `"${appName}" <${env.SMTP_USER}>`,
      to,
      subject: `【${appName}】登录验证码 ${code}`,
      text: `您的登录验证码是 ${code}，10 分钟内有效。`,
      html,
    })
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return { ok: false, error: msg }
  }
}
