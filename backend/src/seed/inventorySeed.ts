export type SeedCategory = 'veg' | 'meat' | 'tool'

export interface SeedInventoryItem {
  category: SeedCategory
  nameZh: string
  nameEn: string
  kcalPer100g: number
  unit: string
  thumbnailUrl: string
  sort: number
}

const vegThumb = '/static/images/design/食材库页.png'
const meatThumb = '/static/images/design/首页.png'
const toolThumb = '/static/images/design/扩展页.png'

export const seedInventory: SeedInventoryItem[] = [
  { category: 'veg', nameZh: '土豆', nameEn: 'Potato', kcalPer100g: 77, unit: 'g', thumbnailUrl: vegThumb, sort: 10 },
  { category: 'veg', nameZh: '胡萝卜', nameEn: 'Carrot', kcalPer100g: 41, unit: 'g', thumbnailUrl: vegThumb, sort: 20 },
  { category: 'veg', nameZh: '花菜', nameEn: 'Cauliflower', kcalPer100g: 25, unit: 'g', thumbnailUrl: vegThumb, sort: 30 },
  { category: 'veg', nameZh: '西兰花', nameEn: 'Broccoli', kcalPer100g: 34, unit: 'g', thumbnailUrl: vegThumb, sort: 40 },
  { category: 'veg', nameZh: '番茄', nameEn: 'Tomato', kcalPer100g: 18, unit: 'g', thumbnailUrl: vegThumb, sort: 50 },
  { category: 'veg', nameZh: '黄瓜', nameEn: 'Cucumber', kcalPer100g: 15, unit: 'g', thumbnailUrl: vegThumb, sort: 60 },
  { category: 'veg', nameZh: '洋葱', nameEn: 'Onion', kcalPer100g: 40, unit: 'g', thumbnailUrl: vegThumb, sort: 70 },
  { category: 'veg', nameZh: '茄子', nameEn: 'Eggplant', kcalPer100g: 25, unit: 'g', thumbnailUrl: vegThumb, sort: 80 },
  { category: 'veg', nameZh: '菌菇', nameEn: 'Mushroom', kcalPer100g: 22, unit: 'g', thumbnailUrl: vegThumb, sort: 90 },
  { category: 'veg', nameZh: '菠菜', nameEn: 'Spinach', kcalPer100g: 23, unit: 'g', thumbnailUrl: vegThumb, sort: 100 },
  { category: 'veg', nameZh: '生菜', nameEn: 'Lettuce', kcalPer100g: 15, unit: 'g', thumbnailUrl: vegThumb, sort: 110 },
  { category: 'veg', nameZh: '豆腐', nameEn: 'Tofu', kcalPer100g: 76, unit: 'g', thumbnailUrl: vegThumb, sort: 120 },

  { category: 'meat', nameZh: '鸡胸肉', nameEn: 'Chicken Breast', kcalPer100g: 165, unit: 'g', thumbnailUrl: meatThumb, sort: 10 },
  { category: 'meat', nameZh: '鸡蛋', nameEn: 'Egg', kcalPer100g: 155, unit: 'pcs', thumbnailUrl: meatThumb, sort: 20 },
  { category: 'meat', nameZh: '虾仁', nameEn: 'Shrimp', kcalPer100g: 99, unit: 'g', thumbnailUrl: meatThumb, sort: 30 },
  { category: 'meat', nameZh: '三文鱼', nameEn: 'Salmon', kcalPer100g: 208, unit: 'g', thumbnailUrl: meatThumb, sort: 40 },
  { category: 'meat', nameZh: '龙利鱼', nameEn: 'Sole', kcalPer100g: 90, unit: 'g', thumbnailUrl: meatThumb, sort: 50 },

  { category: 'tool', nameZh: '平底锅', nameEn: 'Frying Pan', kcalPer100g: 0, unit: 'pcs', thumbnailUrl: toolThumb, sort: 10 },
  { category: 'tool', nameZh: '炒锅', nameEn: 'Wok', kcalPer100g: 0, unit: 'pcs', thumbnailUrl: toolThumb, sort: 20 },
  { category: 'tool', nameZh: '电饭煲', nameEn: 'Rice Cooker', kcalPer100g: 0, unit: 'pcs', thumbnailUrl: toolThumb, sort: 30 }
]

