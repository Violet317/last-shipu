<script setup lang="ts">
import { computed, ref } from 'vue'
import { create as createQr } from 'qrcode'
import AccountLayout, { type AccountRouteKey } from '@/components/account/AccountLayout.vue'
import { useAchievementStore } from '@/stores/achievement'

const active: AccountRouteKey = 'achievement'
const store = useAchievementStore()

const errors = ref<Record<string, string>>({})

function canLeave(): boolean {
  return !store.isDirty
}

function validateGoal(id: string, value: number | null): string {
  const goal = store.goals.find((g) => g.id === id)
  if (!goal) return ''
  if (value == null || Number.isNaN(value)) return '请输入数值'
  if (value < goal.min || value > goal.max) return `范围 ${goal.min}–${goal.max}`
  return ''
}

function onGoalInput(id: string, v: string): void {
  const value = v.trim() ? Number(v) : null
  store.setGoalValue(id, value)
  const msg = validateGoal(id, value)
  errors.value = { ...errors.value, [id]: msg }
}

function onUnitInput(id: string, v: string): void {
  store.setGoalUnit(id, v)
}

function saveGoals(): void {
  const next: Record<string, string> = {}
  for (const g of store.goals) {
    next[g.id] = validateGoal(g.id, g.value)
  }
  errors.value = next
  if (Object.values(next).some((m) => m)) return
  store.markSaved()
  uni.showToast({ title: '已更新', icon: 'none' })
}

const detailVisible = ref<boolean>(false)
const detail = ref<{ title: string; desc: string; progress: number; unlocked: boolean }>({
  title: '',
  desc: '',
  progress: 0,
  unlocked: false,
})

const hoverEnabled = ref<boolean>(false)
const hoverId = ref<string>('')
// #ifdef H5
hoverEnabled.value = true
// #endif

function onEnter(id: string): void {
  if (!hoverEnabled.value) return
  hoverId.value = id
}

function onLeave(): void {
  if (!hoverEnabled.value) return
  hoverId.value = ''
}

function openDetail(id: string): void {
  const item = store.achievements.find((a) => a.id === id)
  if (!item) return
  detail.value = { title: item.title, desc: item.description, progress: item.progress, unlocked: item.unlocked }
  detailVisible.value = true
}

function closeDetail(): void {
  detailVisible.value = false
}

const shareVisible = ref<boolean>(false)
const posterUrl = ref<string>('')

function drawQr(ctx: UniApp.CanvasContext, text: string, x: number, y: number, size: number): void {
  const qr = createQr(text, { errorCorrectionLevel: 'M' })
  const count = qr.modules.size
  const cell = Math.floor(size / count)
  const actual = cell * count
  const ox = x + Math.floor((size - actual) / 2)
  const oy = y + Math.floor((size - actual) / 2)

  ctx.setFillStyle('#ffffff')
  ctx.fillRect(x, y, size, size)
  ctx.setFillStyle('#111111')
  for (let r = 0; r < count; r += 1) {
    for (let c = 0; c < count; c += 1) {
      if (qr.modules.get(r, c)) {
        ctx.fillRect(ox + c * cell, oy + r * cell, cell, cell)
      }
    }
  }
}

async function buildPoster(): Promise<void> {
  const w = 720
  const h = 1080
  const ctx = uni.createCanvasContext('poster')
  ctx.setFillStyle('#ffffff')
  ctx.fillRect(0, 0, w, h)
  ctx.setFillStyle('#1f1b17')
  ctx.setFontSize(28)
  ctx.fillText('我的成就', 48, 96)
  ctx.setFillStyle('#4f453a')
  ctx.setFontSize(18)
  ctx.fillText('扫描二维码查看分享链接', 48, 140)

  ctx.setFillStyle('#f6ece5')
  ctx.fillRect(48, 180, w - 96, 540)
  ctx.setFillStyle('#795520')
  ctx.setFontSize(20)
  ctx.fillText('已解锁', 72, 230)

  let y = 270
  for (const a of store.achievements.slice(0, 3)) {
    ctx.setFillStyle(a.unlocked ? '#047857' : '#817568')
    ctx.setFontSize(18)
    ctx.fillText(a.title, 72, y)
    ctx.setFillStyle('#d3c4b5')
    ctx.fillRect(72, y + 20, 420, 10)
    ctx.setFillStyle(a.unlocked ? '#047857' : '#817568')
    ctx.fillRect(72, y + 20, 420 * Math.max(0, Math.min(1, a.progress)), 10)
    y += 90
  }

  drawQr(ctx, '/pages/achievement', w - 48 - 180, 800, 180)

  await new Promise<void>((resolve) => ctx.draw(false, () => resolve()))

  const tmp = await new Promise<string>((resolve, reject) => {
    uni.canvasToTempFilePath({
      canvasId: 'poster',
      destWidth: w,
      destHeight: h,
      fileType: 'jpg',
      quality: 0.92,
      success: (r) => resolve(r.tempFilePath),
      fail: (e) => reject(e),
    })
  })
  posterUrl.value = tmp
}

async function openShare(): Promise<void> {
  shareVisible.value = true
  posterUrl.value = ''
  await buildPoster()
}

function closeShare(): void {
  shareVisible.value = false
}

function previewPoster(): void {
  if (!posterUrl.value) return
  uni.previewImage({ urls: [posterUrl.value] })
}
</script>

<template>
  <AccountLayout :active="active" :can-leave="canLeave">
    <view class="card">
      <text class="h font-headline">目标设置</text>
      <view class="goals">
        <view v-for="g in store.goals" :key="g.id" class="goal">
          <text class="label">{{ g.title }}</text>
          <view class="goal-row">
            <input
              class="input"
              type="number"
              :value="g.value == null ? '' : String(g.value)"
              @input="(e) => onGoalInput(g.id, (e as any).detail.value)"
            />
            <input class="unit" :value="g.unit" @input="(e) => onUnitInput(g.id, (e as any).detail.value)" />
          </view>
          <text v-if="errors[g.id]" class="err">{{ errors[g.id] }}</text>
        </view>
      </view>
      <button class="btn" @click="saveGoals">保存</button>
    </view>

    <view class="card card-gap">
      <view class="head-row">
        <view>
          <text class="h2 font-headline">成就展示</text>
          <text class="sub">点击查看条件与进度</text>
        </view>
        <button class="ghost" @click="openShare">分享</button>
      </view>

      <view class="grid">
        <view
          v-for="a in store.achievements"
          :key="a.id"
          class="ach"
          @click="openDetail(a.id)"
          @mouseenter="onEnter(a.id)"
          @mouseleave="onLeave"
        >
          <view class="icon" :class="a.unlocked ? 'icon--on' : 'icon--off'">
            <uni-icons :type="a.unlocked ? 'medal' : 'medal'" size="20" :color="a.unlocked ? 'var(--color-on-brand)' : 'var(--color-outline)'" />
          </view>
          <text class="ach-title">{{ a.title }}</text>
          <view v-if="hoverEnabled && hoverId === a.id" class="hover">
            <text class="hover-desc">{{ a.description }}</text>
            <view class="hover-bar">
              <view class="hover-bar-bg" />
              <view class="hover-bar-fill" :style="{ width: `${Math.round(a.progress * 100)}%` }" />
            </view>
            <text class="hover-meta">{{ Math.round(a.progress * 100) }}%</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="detailVisible" class="modal" @click="closeDetail">
      <view class="modal-backdrop" />
      <view class="modal-panel" @click.stop>
        <text class="modal-title font-headline">{{ detail.title }}</text>
        <text class="modal-desc">{{ detail.desc }}</text>
        <view class="pbar">
          <view class="pbar-bg" />
          <view class="pbar-fill" :style="{ width: `${Math.round(detail.progress * 100)}%` }" />
        </view>
        <text class="modal-meta">进度：{{ Math.round(detail.progress * 100) }}%</text>
        <button class="btn" @click="closeDetail">知道了</button>
      </view>
    </view>

    <view v-if="shareVisible" class="modal" @click="closeShare">
      <view class="modal-backdrop" />
      <view class="modal-panel" @click.stop>
        <text class="modal-title font-headline">分享预览</text>
        <view class="poster">
          <image v-if="posterUrl" class="poster-img" mode="aspectFit" :src="posterUrl" />
          <view v-else class="poster-ph">
            <text class="poster-ph-text">生成中...</text>
          </view>
        </view>
        <view class="share-actions">
          <button class="ghost" @click="closeShare">关闭</button>
          <button class="btn" :disabled="!posterUrl" @click="previewPoster">预览</button>
        </view>
        <canvas canvas-id="poster" class="hidden" />
      </view>
    </view>
  </AccountLayout>
</template>

<style lang="scss" scoped>
.card {
  padding: 48rpx;
  border-radius: var(--radius-xl);
  background-color: var(--color-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
}

.card-gap {
  margin-top: 32rpx;
}

.h {
  font-size: 40rpx;
  font-weight: 800;
  margin-bottom: 24rpx;
}

.h2 {
  font-size: 40rpx;
  font-weight: 800;
}

.sub {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--color-on-surface-variant);
}

.goals {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.label {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--color-on-surface-variant);
}

.goal-row {
  margin-top: 12rpx;
  display: grid;
  grid-template-columns: 1fr 200rpx;
  gap: 16rpx;
}

.input,
.unit {
  height: 88rpx;
  border-radius: 24rpx;
  background-color: var(--color-surface-container-low);
  padding: 0 24rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.err {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--color-error);
}

.btn {
  margin-top: 32rpx;
  height: 88rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 28rpx;
  font-weight: 800;
  line-height: 88rpx;
}

.ghost {
  height: 72rpx;
  padding: 0 32rpx;
  border-radius: var(--radius-full);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
  background-color: transparent;
  color: var(--color-on-surface);
  font-size: 24rpx;
  font-weight: 800;
  line-height: 72rpx;
}

.head-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 32rpx;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24rpx;
}

.ach {
  padding: 24rpx;
  border-radius: 24rpx;
  background-color: var(--color-surface-container-low);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  position: relative;
}

.icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon--on {
  background-color: var(--color-accent-600);
}

.icon--off {
  background-color: rgba(var(--rgb-black), 0.06);
}

.ach-title {
  font-size: 22rpx;
  font-weight: 800;
  text-align: center;
}

.hover {
  position: absolute;
  left: 12rpx;
  right: 12rpx;
  top: calc(100% + 10rpx);
  padding: 16rpx 16rpx 14rpx;
  border-radius: 20rpx;
  background-color: var(--color-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
  box-shadow: 0rpx 16rpx 48rpx rgba(var(--shadow-rgb), 0.12);
  z-index: 2;
}

.hover-desc {
  font-size: 20rpx;
  line-height: 1.5;
  color: var(--color-on-surface-variant);
}

.hover-bar {
  margin-top: 12rpx;
  height: 12rpx;
  border-radius: var(--radius-full);
  overflow: hidden;
  position: relative;
}

.hover-bar-bg {
  position: absolute;
  inset: 0;
  background-color: var(--color-surface-container-low);
}

.hover-bar-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background-color: var(--color-accent-600);
}

.hover-meta {
  margin-top: 8rpx;
  font-size: 20rpx;
  font-weight: 800;
  color: var(--color-on-surface);
}

.modal {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
}

.modal-backdrop {
  position: absolute;
  inset: 0;
  background-color: rgba(var(--rgb-black), 0.35);
  backdrop-filter: blur(10px);
}

.modal-panel {
  position: absolute;
  left: 48rpx;
  right: 48rpx;
  top: 18vh;
  border-radius: 32rpx;
  background-color: var(--color-surface);
  padding: 40rpx;
}

.modal-title {
  font-size: 36rpx;
  font-weight: 800;
  margin-bottom: 16rpx;
}

.modal-desc {
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--color-on-surface-variant);
}

.pbar {
  margin-top: 24rpx;
  height: 16rpx;
  border-radius: var(--radius-full);
  overflow: hidden;
  position: relative;
}

.pbar-bg {
  position: absolute;
  inset: 0;
  background-color: var(--color-surface-container-low);
}

.pbar-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background-color: var(--color-accent-600);
}

.modal-meta {
  margin-top: 16rpx;
  font-size: 22rpx;
  color: var(--color-on-surface-variant);
}

.poster {
  margin-top: 16rpx;
  height: 520rpx;
  border-radius: 24rpx;
  background-color: var(--color-surface-container-low);
  overflow: hidden;
}

.poster-img {
  width: 100%;
  height: 100%;
}

.poster-ph {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.poster-ph-text {
  font-size: 24rpx;
  color: var(--color-on-surface-variant);
}

.share-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}

.hidden {
  position: absolute;
  left: -9999px;
  top: -9999px;
  width: 1px;
  height: 1px;
}
</style>
