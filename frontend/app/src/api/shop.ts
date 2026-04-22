import { apiConfig } from './config'
import { request } from './client'
import { getJson, mockOk, setJson } from './mockStorage'

export type ProductCategory = 'ingredient' | 'tool'

export interface ShopProduct {
  id: string
  category: ProductCategory
  title: string
  subtitle: string
  priceCents: number
  soldCount: number
  rating: number
  thumbnailEmoji: string
}

export interface CartItem {
  productId: string
  qty: number
}

export interface OrderSummary {
  orderId: string
  totalCents: number
  itemCount: number
}

const PRODUCTS_KEY = 'mock_shop_products_v1'
const CART_KEY = 'mock_shop_cart_v1'

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`
}

function seedIfEmpty(): void {
  const products = getJson<ShopProduct[]>(PRODUCTS_KEY, [])
  if (products.length > 0) return
  const seeded: ShopProduct[] = [
    { id: 't_pan', category: 'tool', title: '不粘平底锅 28cm', subtitle: '少油也不粘，适合快手菜', priceCents: 12900, soldCount: 1823, rating: 4.8, thumbnailEmoji: '🍳' },
    { id: 't_knife', category: 'tool', title: '家用刀具套装', subtitle: '切丝切片更省力', priceCents: 9900, soldCount: 932, rating: 4.6, thumbnailEmoji: '🔪' },
    { id: 't_board', category: 'tool', title: '抗菌砧板', subtitle: '双面分区更卫生', priceCents: 5900, soldCount: 1211, rating: 4.7, thumbnailEmoji: '🪵' },
    { id: 't_air', category: 'tool', title: '空气炸锅 4L', subtitle: '外酥里嫩，少油更轻盈', priceCents: 29900, soldCount: 640, rating: 4.5, thumbnailEmoji: '🍟' },
    { id: 'i_salmon', category: 'ingredient', title: '三文鱼切片 200g', subtitle: '高蛋白，适合轻食', priceCents: 3590, soldCount: 2340, rating: 4.9, thumbnailEmoji: '🐟' },
    { id: 'i_shrimp', category: 'ingredient', title: '虾仁 300g', subtitle: '开袋即烹，快手百搭', priceCents: 2890, soldCount: 3120, rating: 4.8, thumbnailEmoji: '🦐' },
    { id: 'i_egg', category: 'ingredient', title: '鸡蛋 10 枚', subtitle: '每日蛋白好搭档', priceCents: 1490, soldCount: 5200, rating: 4.7, thumbnailEmoji: '🥚' },
    { id: 'i_veg', category: 'ingredient', title: '时蔬组合装', subtitle: '三菜一汤更省心', priceCents: 1990, soldCount: 1780, rating: 4.4, thumbnailEmoji: '🥬' },
  ]
  setJson(PRODUCTS_KEY, seeded)
}

function readProducts(): ShopProduct[] {
  seedIfEmpty()
  return getJson<ShopProduct[]>(PRODUCTS_KEY, [])
}

function readCart(): CartItem[] {
  return getJson<CartItem[]>(CART_KEY, [])
}

function writeCart(items: CartItem[]): void {
  setJson(CART_KEY, items)
}

export async function listProducts(): Promise<ShopProduct[]> {
  if (!apiConfig.baseUrl) {
    const res = await mockOk(readProducts(), 160)
    return res.data
  }
  return await request<ShopProduct[]>({ url: '/api/shop/products', method: 'GET' })
}

export async function getCart(): Promise<CartItem[]> {
  if (!apiConfig.baseUrl) {
    const res = await mockOk(readCart(), 80)
    return res.data
  }
  return await request<CartItem[]>({ url: '/api/shop/cart', method: 'GET' })
}

export async function setCart(items: CartItem[]): Promise<CartItem[]> {
  if (!apiConfig.baseUrl) {
    writeCart(items)
    const res = await mockOk(readCart(), 80)
    return res.data
  }
  return await request<CartItem[], CartItem[]>({ url: '/api/shop/cart', method: 'PUT', body: items })
}

export async function checkout(): Promise<OrderSummary> {
  if (!apiConfig.baseUrl) {
    const products = readProducts()
    const cart = readCart()
    const totalCents = cart.reduce((acc, it) => {
      const p = products.find((x) => x.id === it.productId)
      return acc + (p ? p.priceCents * it.qty : 0)
    }, 0)
    const itemCount = cart.reduce((acc, it) => acc + it.qty, 0)
    writeCart([])
    const res = await mockOk({ orderId: uid('order'), totalCents, itemCount }, 220)
    return res.data
  }
  return await request<OrderSummary>({ url: '/api/shop/checkout', method: 'POST' })
}

