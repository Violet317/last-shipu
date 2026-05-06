<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import type { InventoryCategory } from '@/api/inventory'
import type { PantrySource, PantryStorage } from '@/api/pantry'
import { ocrParseReceipt, ocrTextRegions } from '@/api/ocr'
import { pathToBase64, canvasToTempFilePathWithLimit } from '@/utils/imageBase64'
import { getDefaultShelfLifeDays } from '@/utils/expiry'
import { useInventoryStore } from '@/stores/inventory'
import { usePantryStore } from '@/stores/pantry'
import { useShoppingStore } from '@/stores/shoppingList'
import ImageRegionPicker, { type RegionRect } from '@/components/pantry/ImageRegionPicker.vue'

type Mode = 'receipt' | 'fridge'

interface DraftItem {
  nameZh: string
  category: InventoryCategory
  storage: PantryStorage
  shelfLifeDays: number
  purchasedAtMs: number
  expiresAtMs: number
  source: PantrySource
  qty?: number
}

const mode = ref<Mode>('receipt')
const imagePath = ref<string>('')
const imageInfo = ref<{ width: number; height: number } | null>(null)
const loading = ref<boolean>(false)
const detecting = ref<boolean>(false)
const err = ref<string>('')

const regions = ref<RegionRect[]>([])

const inventoryStore = useInventoryStore()
const pantryStore = usePantryStore()
const shoppingStore = useShoppingStore()

const items = ref<DraftItem[]>([])

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '')
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${m}/${day}`
}

function inferCategory(name: string): InventoryCategory {
  const n = name.trim()
  if (!n) return 'veg'
  if (n.includes('鸡') || n.includes('牛') || n.includes('猪') || n.includes('鱼') || n.includes('虾') || n.includes('蛋')) return 'meat'
  return 'veg'
}

function buildDraft(nameZh: string, source: PantrySource): DraftItem {
  const category = inferCategory(nameZh)
  const storage: PantryStorage = 'fridge'
  const shelfLifeDays = getDefaultShelfLifeDays(category, storage)
  const purchasedAtMs = Date.now()
  const expiresAtMs = purchasedAtMs + shelfLifeDays * 24 * 60 * 60 * 1000
  return { nameZh: nameZh.trim(), category, storage, shelfLifeDays, purchasedAtMs, expiresAtMs, source }
}

function buildDraftFromParsed(parsed: { name: string; qty: number; unit: string; purchasedAtMs: number; shelfLifeDays: number; storage: PantryStorage }, source: PantrySource): DraftItem {
  const category = inferCategory(parsed.name)
  const expiresAtMs = parsed.purchasedAtMs + parsed.shelfLifeDays * 24 * 60 * 60 * 1000
  return {
    nameZh: parsed.name.trim(),
    category,
    storage: parsed.storage,
    shelfLifeDays: parsed.shelfLifeDays,
    purchasedAtMs: parsed.purchasedAtMs,
    expiresAtMs,
    source,
    qty: parsed.qty,
  }
}

async function prepareImage(): Promise<string> {
  const info = await uni.getImageInfo({ src: imagePath.value })
  imageInfo.value = { width: info.width, height: info.height }

  const maxSide = 1200
  const scale = Math.min(1, maxSide / Math.max(info.width, info.height))
  const dw = Math.max(1, Math.floor(info.width * scale))
  const dh = Math.max(1, Math.floor(info.height * scale))

  const ctx = uni.createCanvasContext('pantryOcr')
  ctx.clearRect(0, 0, maxSide, maxSide)
  ctx.drawImage(imagePath.value, 0, 0, info.width, info.height, 0, 0, dw, dh)
  await new Promise<void>((resolve) => ctx.draw(false, () => resolve()))

  const r = await canvasToTempFilePathWithLimit({
    canvasId: 'pantryOcr',
    destWidth: dw,
    destHeight: dh,
    fileType: 'jpg',
    maxBytes: 900 * 1024,
    initialQuality: 0.9,
    minQuality: 0.45,
    qualityStep: 0.08,
  })
  return await pathToBase64(r.tempFilePath)
}

async function runReceiptOcr(): Promise<void> {
  if (detecting.value) return
  detecting.value = true
  err.value = ''
  try {
    const base64 = await prepareImage()
    const res = await ocrParseReceipt({ imageBase64: base64 })
    items.value = res.items.map((it) => buildDraftFromParsed(it, 'ocr_receipt'))
    const names = res.items.map((x) => x.name)
    const hit = shoppingStore.markPurchasedByNames(names)
    if (hit > 0) {
      for (const it of shoppingStore.items.filter((x) => x.checked)) {
        await shoppingStore.update(it.id, { checked: true })
      }
    }
  } catch (e) {
    err.value = e instanceof Error ? e.message : '识别失败'
  } finally {
    detecting.value = false
  }
}

async function cropRegionToBase64(rect: RegionRect): Promise<string> {
  const info = await uni.getImageInfo({ src: imagePath.value })
  const w = Math.max(1, Math.floor(rect.w * info.width))
  const h = Math.max(1, Math.floor(rect.h * info.height))
  const sx = Math.max(0, Math.floor(rect.x * info.width))
  const sy = Math.max(0, Math.floor(rect.y * info.height))

  const destMax = 700
  const scale = Math.min(1, destMax / Math.max(w, h))
  const dw = Math.max(1, Math.floor(w * scale))
  const dh = Math.max(1, Math.floor(h * scale))

  const ctx = uni.createCanvasContext('pantryOcr')
  ctx.clearRect(0, 0, destMax, destMax)
  ctx.drawImage(imagePath.value, sx, sy, w, h, 0, 0, dw, dh)
  await new Promise<void>((resolve) => ctx.draw(false, () => resolve()))

  const r = await canvasToTempFilePathWithLimit({
    canvasId: 'pantryOcr',
    destWidth: dw,
    destHeight: dh,
    fileType: 'jpg',
    maxBytes: 500 * 1024,
    initialQuality: 0.9,
    minQuality: 0.45,
    qualityStep: 0.08,
  })
  return await pathToBase64(r.tempFilePath)
}

async function runFridgeOcr(): Promise<void> {
  if (detecting.value) return
  if (regions.value.length === 0) {
    uni.showToast({ title: '请先圈选区域', icon: 'none' })
    return
  }
  detecting.value = true
  err.value = ''
  try {
    const base64List: string[] = []
    for (const r of regions.value.slice(0, 10)) {
      base64List.push(await cropRegionToBase64(r))
    }
    const res = await ocrTextRegions({ regions: base64List.map((imageBase64) => ({ imageBase64 })) })
    const names = res.texts.map((x) => x.trim()).filter(Boolean)
    items.value = names.map((n) => buildDraft(n, 'ocr_fridge'))
  } catch (e) {
    err.value = e instanceof Error ? e.message : '识别失败'
  } finally {
    detecting.value = false
  }
}

function removeDraft(idx: number): void {
  items.value = items.value.filter((_, i) => i !== idx)
}

function setShelfLifeDays(idx: number, days: number): void {
  const copy = items.value.slice()
  const it = copy[idx]
  const d = Math.max(0, Math.min(3650, Math.floor(days)))
  it.shelfLifeDays = d
  it.expiresAtMs = it.purchasedAtMs + d * 24 * 60 * 60 * 1000
  items.value = copy
}

function setStorage(idx: number, storage: PantryStorage): void {
  const copy = items.value.slice()
  const it = copy[idx]
  it.storage = storage
  const d = getDefaultShelfLifeDays(it.category, storage)
  it.shelfLifeDays = d
  it.expiresAtMs = it.purchasedAtMs + d * 24 * 60 * 60 * 1000
  items.value = copy
}

async function confirmImport(): Promise<void> {
  if (loading.value) return
  if (items.value.length === 0) {
    uni.showToast({ title: '没有可入库的条目', icon: 'none' })
    return
  }
  loading.value = true
  try {
    if (inventoryStore.items.length === 0) await inventoryStore.fetch()
    if (pantryStore.items.length === 0) await pantryStore.fetch()

    let count = 0
    for (const d of items.value) {
      if (!d.nameZh.trim()) continue
      let inv = inventoryStore.items.find((x) => x.nameZh === d.nameZh && x.category === d.category)
      if (!inv) {
        const newInv = await inventoryStore.create({
          category: d.category,
          nameZh: d.nameZh,
          nameEn: d.nameZh,
          kcalPer100g: 0,
          unit: d.category === 'tool' ? 'pcs' : 'g',
          thumbnailUrl: '/static/images/design/screen.png',
        })
        if (!newInv) continue
        inv = newInv
      }
      if (!inv) continue

      const created = await pantryStore.create({
        inventoryId: inv.id,
        storage: d.storage,
        purchasedAtMs: d.purchasedAtMs,
        expiresAtMs: d.expiresAtMs,
        source: d.source,
        qty: d.qty,
      })
      if (created) count += 1
    }
    uni.showToast({ title: count > 0 ? `已入库 ${count} 项` : '未入库', icon: 'none' })
    uni.switchTab({ url: '/pages/ingredients' })
  } finally {
    loading.value = false
  }
}

const title = computed(() => (mode.value === 'receipt' ? '小票入库' : '冰箱圈选入库'))

onLoad((q) => {
  const m = (q as any)?.mode
  const p = (q as any)?.path
  if (m === 'fridge') mode.value = 'fridge'
  if (typeof p === 'string') imagePath.value = decodeURIComponent(p)
})

onMounted(async () => {
  if (!imagePath.value) {
    err.value = '缺少图片'
    return
  }
  if (mode.value === 'receipt') await runReceiptOcr()
})
</script>

<template>
  <view class="page">
    <view class="top">
      <view class="top-left" @click="uni.navigateBack()">
        <uni-icons type="left" size="20" color="var(--color-on-surface)" />
      </view>
      <text class="top-title font-headline">{{ title }}</text>
      <view class="top-right" />
    </view>

    <view class="body">
      <image class="img" mode="widthFix" :src="imagePath" />

      <view v-if="mode === 'fridge'" class="picker">
        <ImageRegionPicker :src="imagePath" v-model:regions="regions" />
        <button class="btn" :disabled="detecting" @click="runFridgeOcr">
          {{ detecting ? '识别中…' : '识别圈选' }}
        </button>
      </view>

      <view v-if="err" class="hint">
        <text class="hint-text">{{ err }}</text>
      </view>

      <view v-if="items.length > 0" class="list">
        <view v-for="(it, idx) in items" :key="`${it.nameZh}_${idx}`" class="row">
          <view class="row-main">
            <view class="name-row">
              <input class="name" v-model="it.nameZh" />
              <text v-if="it.qty" class="qty">{{ it.qty }}{{ it.qty === 1 ? '' : it.unit === 'g' ? 'g' : it.unit }}</text>
            </view>
            <view class="meta">
              <picker mode="selector" :range="['冷藏', '冷冻', '常温']" @change="(e: any) => setStorage(idx, (['fridge','freezer','room'] as PantryStorage[])[e.detail.value])">
                <text class="pill">{{ it.storage === 'fridge' ? '冷藏' : it.storage === 'freezer' ? '冷冻' : '常温' }}</text>
              </picker>
              <input class="days" type="number" :value="String(it.shelfLifeDays)" @input="(e: any) => setShelfLifeDays(idx, Number(e.detail.value))" />
              <text class="pill">天</text>
              <text class="pill date">{{ formatDate(it.purchasedAtMs) }}</text>
            </view>
          </view>
          <view class="row-del" hover-class="row-del--hover" @click="removeDraft(idx)">
            <uni-icons type="trash" size="18" color="var(--color-danger)" />
          </view>
        </view>
      </view>

      <button class="primary" :disabled="loading || items.length === 0" @click="confirmImport">
        {{ loading ? '入库中…' : '确认入库' }}
      </button>
    </view>

    <canvas canvas-id="pantryOcr" class="canvas" />
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background-color: var(--color-background);
  color: var(--color-on-surface);
}

.top {
  height: 104rpx;
  padding: 0 36rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.top-left,
.top-right {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.top-title {
  font-size: 34rpx;
  font-weight: 900;
}

.body {
  padding: 18rpx 36rpx 40rpx;
}

.img {
  width: 100%;
  border-radius: 20rpx;
  overflow: hidden;
}

.picker {
  margin-top: 16rpx;
  padding: 16rpx;
  border-radius: 20rpx;
  background-color: rgba(var(--rgb-black), 0.04);
}

.btn {
  margin-top: 12rpx;
  height: 72rpx;
  border-radius: var(--radius-full);
  background-color: rgba(var(--rgb-black), 0.06);
  color: var(--color-on-surface);
  font-weight: 800;
  line-height: 72rpx;
}

.hint {
  margin-top: 18rpx;
  padding: 18rpx;
  border-radius: 18rpx;
  background-color: rgba(var(--rgb-danger), 0.12);
}

.hint-text {
  color: var(--color-danger);
  font-weight: 700;
}

.list {
  margin-top: 18rpx;
}

.row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 14rpx 12rpx;
  border-radius: 18rpx;
  background-color: rgba(var(--rgb-black), 0.04);
  margin-bottom: 12rpx;
}

.row-main {
  flex: 1;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.name {
  height: 72rpx;
  font-size: 30rpx;
  font-weight: 900;
  flex: 1;
}

.qty {
  font-size: 24rpx;
  font-weight: 800;
  color: var(--color-on-surface-variant);
  white-space: nowrap;
}

.meta {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.pill {
  padding: 8rpx 12rpx;
  border-radius: var(--radius-full);
  background-color: rgba(var(--rgb-black), 0.06);
  font-size: 22rpx;
  font-weight: 800;
  color: var(--color-on-surface-variant);
}

.pill.date {
  background-color: rgba(var(--rgb-primary), 0.08);
  color: var(--color-primary);
}

.days {
  width: 120rpx;
  height: 56rpx;
  border-radius: 14rpx;
  background-color: rgba(var(--rgb-black), 0.06);
  padding: 0 12rpx;
  font-weight: 900;
}

.row-del {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
}

.row-del--hover {
  background-color: rgba(var(--rgb-danger), 0.08);
}

.primary {
  margin-top: 18rpx;
  height: 84rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: 900;
  line-height: 84rpx;
}

.primary[disabled] {
  opacity: 0.45;
}

.canvas {
  position: absolute;
  left: -9999px;
  top: -9999px;
  width: 1200px;
  height: 1200px;
}
</style>

