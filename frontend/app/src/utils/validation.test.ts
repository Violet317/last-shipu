import { describe, expect, it } from 'vitest'
import { passwordStrength, validateFeedbackText, validateHeightCm, validateNickname, validateNewPassword, validateWeightKg } from './validation'

describe('validation', () => {
  it('validates nickname', () => {
    expect(validateNickname('').ok).toBe(false)
    expect(validateNickname('小明').ok).toBe(true)
    expect(validateNickname('管理员').ok).toBe(false)
    expect(validateNickname('a'.repeat(17)).ok).toBe(false)
  })

  it('validates feedback length', () => {
    expect(validateFeedbackText('123456789').ok).toBe(false)
    expect(validateFeedbackText('1234567890').ok).toBe(true)
  })

  it('password strength', () => {
    expect(passwordStrength('a').score).toBe(1)
    expect(passwordStrength('Abcdef12').score).toBeGreaterThanOrEqual(3)
    expect(validateNewPassword('Abcdef12').ok).toBe(true)
  })

  it('validates body data', () => {
    expect(validateHeightCm(89).ok).toBe(false)
    expect(validateHeightCm(90).ok).toBe(true)
    expect(validateHeightCm(251).ok).toBe(false)

    expect(validateWeightKg(29).ok).toBe(false)
    expect(validateWeightKg(30).ok).toBe(true)
    expect(validateWeightKg(201).ok).toBe(false)
  })
})
