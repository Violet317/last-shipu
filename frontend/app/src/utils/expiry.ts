import type { InventoryCategory } from '@/api/inventory'
import type { PantryStorage } from '@/api/pantry'

export type FreshnessLevel = 'fresh' | 'soon' | 'expired'

export const soonThresholdDays = 2

export function getDefaultShelfLifeDays(category: InventoryCategory, storage: PantryStorage): number {
  if (category === 'tool') return 3650
  if (category === 'veg') {
    if (storage === 'freezer') return 30
    if (storage === 'room') return 2
    return 3
  }
  if (storage === 'freezer') return 60
  if (storage === 'room') return 1
  return 2
}

export function getDaysLeft(expiresAtMs: number, nowMs: number): number {
  return Math.floor((expiresAtMs - nowMs) / (24 * 60 * 60 * 1000))
}

export function getFreshnessLevel(daysLeft: number): FreshnessLevel {
  if (daysLeft < 0) return 'expired'
  if (daysLeft <= soonThresholdDays) return 'soon'
  return 'fresh'
}

export function getFreshnessColor(level: FreshnessLevel): string {
  if (level === 'fresh') return '#4caf50'
  if (level === 'soon') return '#ffb300'
  return '#e53935'
}

