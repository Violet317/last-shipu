import { describe, expect, it } from 'vitest'
import { contrastRatio, hexToRgb } from './colorMath'

describe('colorMath', () => {
  it('computes contrast ratio', () => {
    const white = hexToRgb('#ffffff')
    const black = hexToRgb('#000000')
    expect(white).not.toBeNull()
    expect(black).not.toBeNull()
    expect(contrastRatio(white!, black!)).toBeGreaterThanOrEqual(21)
  })
})

