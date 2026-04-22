# 接口文档（前端预留）

统一约定：
- Base Path：`/api`
- Body：JSON
- 响应：`{ code: string, message: string, data: T }`（`code === "0"` 表示成功）

## Profile
### POST /api/profile
- Request
  - nickname: string
  - heightCm: number | null
  - weightKg: number | null
  - birthDate: string
  - gender: "male" | "female" | "other"
  - activityLevel: 1 | 2 | 3 | 4 | 5
  - avatar200Base64?: string
  - avatar100Base64?: string
- Response
  - ok: true

## Achievement
### GET /api/achievement
- Response
  - goals: Array<{ id, title, value, unit }>
  - achievements: Array<{ id, title, description, unlocked, progress }>

## Feedback
### POST /api/feedback
- Request
  - content: string
  - screenshots: Array<{ url?: string; base64?: string }>
- Response
  - ok: true
  - ticketId: string

## Settings
### POST /api/settings/password
- Request
  - oldPassword: string
  - newPassword: string
- Response
  - ok: true

## Recipe Log
### POST /api/recipe
- Request
  - name: string
  - kcal: number
  - ingredients: string[]
  - steps: string[]
  - imageBase64?: string
- Response
  - id: string

## Shortcuts
### GET /api/shortcuts
- Response
  - Array<{ id: string; title: string; prompt: string; sort: number; enabled: boolean; updatedAtMs: number }>

### POST /api/shortcuts
- Request
  - title: string
  - prompt: string
  - enabled: boolean
- Response
  - { id: string; title: string; prompt: string; sort: number; enabled: boolean; updatedAtMs: number }

### PUT /api/shortcuts/:id
- Request
  - title: string
  - prompt: string
  - enabled: boolean
  - sort?: number
- Response
  - { id: string; title: string; prompt: string; sort: number; enabled: boolean; updatedAtMs: number }

### DELETE /api/shortcuts/:id
- Response
  - ok: true

## Inventory
### GET /api/inventory
- Response
  - Array<{ id: string; category: "veg"|"meat"|"tool"; nameZh: string; nameEn: string; kcalPer100g: number; unit: string; thumbnailUrl: string; sort: number; updatedAtMs: number }>

### POST /api/inventory
- Request
  - category: "veg" | "meat" | "tool"
  - nameZh: string
  - nameEn: string
  - kcalPer100g: number
  - unit: string
  - thumbnailUrl: string
- Response
  - { id: string; category: "veg"|"meat"|"tool"; nameZh: string; nameEn: string; kcalPer100g: number; unit: string; thumbnailUrl: string; sort: number; updatedAtMs: number }

### PUT /api/inventory/:id
- Request
  - category: "veg" | "meat" | "tool"
  - nameZh: string
  - nameEn: string
  - kcalPer100g: number
  - unit: string
  - thumbnailUrl: string
  - sort?: number
- Response
  - { id: string; category: "veg"|"meat"|"tool"; nameZh: string; nameEn: string; kcalPer100g: number; unit: string; thumbnailUrl: string; sort: number; updatedAtMs: number }

### DELETE /api/inventory/:id
- Response
  - ok: true

## Recipe
### POST /api/recipes/generate
- Request
  - prompt: string
  - ingredients: string[]
  - tools?: string[]

## Featured
### GET /api/featured/daily
- Query
  - date?: string（YYYY-MM-DD，不传则默认今天；每日凌晨更新）
- Response
  - date: string
  - generatedAtMs: number
  - reason: string
  - hero: { id: string; title: string; subtitle: string; coverUrl: string; tags: string[]; kcal: number; durationMinutes: number; createdAtMs: number; steps: Array<{ index: number; text: string }> }
  - list: Array<{ id: string; title: string; subtitle: string; coverUrl: string; tags: string[]; kcal: number; durationMinutes: number; createdAtMs: number; steps: Array<{ index: number; text: string }> }>

## Forum
### GET /api/forum/posts
- Response
  - Array<{ id: string; author: { id: string; name: string }; content: string; createdAtMs: number; likeCount: number; commentCount: number; likedBy: string[] }>

### POST /api/forum/posts
- Request
  - content: string
- Response
  - { id: string; author: { id: string; name: string }; content: string; createdAtMs: number; likeCount: number; commentCount: number; likedBy: string[] }

### POST /api/forum/posts/:id/like
- Response
  - { id: string; author: { id: string; name: string }; content: string; createdAtMs: number; likeCount: number; commentCount: number; likedBy: string[] }

### GET /api/forum/posts/:id/comments
- Response
  - Array<{ id: string; postId: string; author: { id: string; name: string }; content: string; createdAtMs: number }>

### POST /api/forum/posts/:id/comments
- Request
  - content: string
- Response
  - { id: string; postId: string; author: { id: string; name: string }; content: string; createdAtMs: number }

## Shop
### GET /api/shop/products
- Response
  - Array<{ id: string; category: "ingredient"|"tool"; title: string; subtitle: string; priceCents: number; soldCount: number; rating: number; thumbnailEmoji: string }>

### GET /api/shop/cart
- Response
  - Array<{ productId: string; qty: number }>

### PUT /api/shop/cart
- Request
  - Array<{ productId: string; qty: number }>
- Response
  - Array<{ productId: string; qty: number }>

### POST /api/shop/checkout
- Response
  - orderId: string
  - totalCents: number
  - itemCount: number
