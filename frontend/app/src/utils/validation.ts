export interface ValidationResult {
  ok: boolean
  message?: string
}

const sensitiveWords = ['测试', '管理员', '外挂']

export function validateNickname(value: string): ValidationResult {
  const v = value.trim()
  if (v.length === 0) return { ok: false, message: '昵称不能为空' }
  if (v.length > 16) return { ok: false, message: '昵称最多16个字符' }
  if (sensitiveWords.some((w) => v.includes(w))) return { ok: false, message: '昵称包含敏感词' }
  return { ok: true }
}

export function validateHeightCm(n: number): ValidationResult {
  if (!Number.isFinite(n)) return { ok: false, message: '身高格式错误' }
  if (n < 90 || n > 250) return { ok: false, message: '身高范围 90–250cm' }
  return { ok: true }
}

export function validateWeightKg(n: number): ValidationResult {
  if (!Number.isFinite(n)) return { ok: false, message: '体重格式错误' }
  if (n < 30 || n > 200) return { ok: false, message: '体重范围 30–200kg' }
  return { ok: true }
}

export function validateFeedbackText(v: string): ValidationResult {
  const t = v.trim()
  if (t.length < 10) return { ok: false, message: '至少输入10个字' }
  if (t.length > 500) return { ok: false, message: '最多500个字' }
  return { ok: true }
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4
  label: string
}

export function passwordStrength(pwd: string): PasswordStrength {
  const v = pwd
  let score: 0 | 1 | 2 | 3 | 4 = 0
  if (v.length >= 8) score = (score + 1) as PasswordStrength['score']
  if (/[A-Z]/.test(v)) score = (score + 1) as PasswordStrength['score']
  if (/[a-z]/.test(v)) score = (score + 1) as PasswordStrength['score']
  if (/\d/.test(v) || /[^A-Za-z0-9]/.test(v)) score = (score + 1) as PasswordStrength['score']

  const label =
    score <= 1 ? '弱' : score === 2 ? '一般' : score === 3 ? '较强' : '强'
  return { score, label }
}

export function validateNewPassword(pwd: string): ValidationResult {
  const s = passwordStrength(pwd)
  if (s.score < 3) return { ok: false, message: '密码强度不足（至少8位且包含大小写与数字/符号）' }
  return { ok: true }
}

