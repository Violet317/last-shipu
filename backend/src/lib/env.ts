import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(8787),
  HOST: z.string().default('0.0.0.0'),
  JWT_SECRET: z.string().min(16),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(30 * 24 * 60 * 60),
  ZHIPU_API_KEY: z.string().optional().default(''),
  ZHIPU_BASE_URL: z.string().optional().default('https://open.bigmodel.cn/api/paas/v4'),
  ZHIPU_OCR_MODEL: z.string().optional().default('glm-ocr'),
  ZHIPU_LLM_MODEL: z.string().optional().default('glm-4.7'),
  OCR_PROVIDER: z.string().optional().default(''),
  OCR_API_KEY: z.string().optional().default(''),
  OCR_API_SECRET: z.string().optional().default(''),
  LLM_PROVIDER: z.string().optional().default(''),
  LLM_API_KEY: z.string().optional().default(''),
  MOONSHOT_API_KEY: z.string().optional().default(''),
  ALIYUN_OCR_APPCODE: z.string().optional().default(''),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  APP_URL: z.string().optional().default(''),
  NODE_ENV: z.string().optional().default('development'),
})

export type Env = z.infer<typeof schema>

export function loadEnv(): Env {
  const raw = {
    DATABASE_URL: process.env.DATABASE_URL,
    PORT: process.env.PORT,
    HOST: process.env.HOST,
    JWT_SECRET: process.env.JWT_SECRET,
    ACCESS_TOKEN_TTL_SECONDS: process.env.ACCESS_TOKEN_TTL_SECONDS,
    REFRESH_TOKEN_TTL_SECONDS: process.env.REFRESH_TOKEN_TTL_SECONDS,
    ZHIPU_API_KEY: process.env.ZHIPU_API_KEY,
    ZHIPU_BASE_URL: process.env.ZHIPU_BASE_URL,
    ZHIPU_OCR_MODEL: process.env.ZHIPU_OCR_MODEL,
    ZHIPU_LLM_MODEL: process.env.ZHIPU_LLM_MODEL,
    OCR_PROVIDER: process.env.OCR_PROVIDER,
    OCR_API_KEY: process.env.OCR_API_KEY,
    OCR_API_SECRET: process.env.OCR_API_SECRET,
    LLM_PROVIDER: process.env.LLM_PROVIDER,
    LLM_API_KEY: process.env.LLM_API_KEY,
    MOONSHOT_API_KEY: process.env.MOONSHOT_API_KEY,
    ALIYUN_OCR_APPCODE: process.env.ALIYUN_OCR_APPCODE,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    APP_URL: process.env.APP_URL,
    NODE_ENV: process.env.NODE_ENV,
  }
  return schema.parse(raw)
}
