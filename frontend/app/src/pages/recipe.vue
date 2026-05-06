<script setup lang="ts">
import { computed, ref } from 'vue'
import AccountLayout, { type AccountRouteKey } from '@/components/account/AccountLayout.vue'
import { useRecipeLogStore } from '@/stores/recipeLog'
import { canvasToTempFilePathWithLimit, getFileSizeBytes, pathToBase64 } from '@/utils/imageBase64'

const active: AccountRouteKey = 'recipe'
const store = useRecipeLogStore()

const top3 = computed(() => store.top3)

const drawerOpen = ref<boolean>(false)
const saving = ref<boolean>(false)

const err = ref<Record<string, string>>({})

const cropVisible = ref<boolean>(false)
const cropSrc = ref<string>('')
const cropping = ref<boolean>(false)

function canLeave(): boolean {
  return true
}

function openDrawer(): void {
  drawerOpen.value = true
}

function closeDrawer(): void {
  drawerOpen.value = false
}

function setName(v: string): void {
  store.setDraft('name', v)
}

function setIngredients(v: string): void {
  store.setDraft('ingredientsText', v)
}

function setSteps(v: string): void {
  store.setDraft('stepsText', v)
}

function setKcal(v: string): void {
  const n = v.trim() ? Number(v) : null
  store.setDraft('kcal', n)
}

async function pickImage(): Promise<void> {
  const res = await uni.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
  const path = res.tempFilePaths[0]
  if (!path) return

  try {
    const info = await uni.getImageInfo({ src: path })
    const ext = info.type ? String(info.type).toLowerCase() : ''
    if (ext && ext !== 'jpg' && ext !== 'jpeg' && ext !== 'png') {
      uni.showToast({ title: '仅支持 jpg/png', icon: 'none' })
      return
    }
    const sizeBytes = await getFileSizeBytes(path)
    store.setDraft('imageFile', {
      path,
      sizeBytes,
      name: `recipe.${ext === 'png' ? 'png' : 'jpg'}`,
      type: ext === 'png' ? 'image/png' : 'image/jpeg',
      file: undefined,
    })
  } catch {
    store.setDraft('imageFile', { path })
  }

  cropSrc.value = path
  cropVisible.value = true
}

async function confirmCrop(): Promise<void> {
  if (cropping.value) return
  cropping.value = true
  try {
    const info = await uni.getImageInfo({ src: cropSrc.value })
    const size = Math.min(info.width, info.height)
    const sx = Math.floor((info.width - size) / 2)
    const sy = Math.floor((info.height - size) / 2)

    const ctx = uni.createCanvasContext('recipeImg')
    ctx.clearRect(0, 0, 600, 600)
    ctx.drawImage(cropSrc.value, sx, sy, size, size, 0, 0, 600, 600)
    await new Promise<void>((resolve) => ctx.draw(false, () => resolve()))

    const r = await canvasToTempFilePathWithLimit({
      canvasId: 'recipeImg',
      destWidth: 600,
      destHeight: 600,
      fileType: 'jpg',
      maxBytes: 500 * 1024,
      initialQuality: 0.9,
      minQuality: 0.45,
      qualityStep: 0.08,
    })

    store.setDraft('imagePath', r.tempFilePath)
    store.setDraft('imageBase64', await pathToBase64(r.tempFilePath))
    cropVisible.value = false

    if (r.bytes > 500 * 1024) {
      uni.showToast({ title: '压缩后仍可能 > 500KB，请换更小图片', icon: 'none' })
    }
  } finally {
    cropping.value = false
  }
}

function cancelCrop(): void {
  cropVisible.value = false
}

function validate(): boolean {
  const next: Record<string, string> = {}
  if (!store.draft.name.trim()) next.name = '请输入食谱名称'
  if (store.draft.kcal == null || !Number.isFinite(store.draft.kcal) || store.draft.kcal <= 0) next.kcal = '请输入热量估算'
  if (!store.draft.ingredientsText.trim()) next.ingredients = '请输入食材清单'
  if (!store.draft.stepsText.trim()) next.steps = '请输入制作步骤'
  err.value = next
  return Object.keys(next).length === 0
}

async function submit(): Promise<void> {
  if (saving.value) return
  if (!validate()) return
  saving.value = true
  try {
    await new Promise<void>((r) => setTimeout(r, 400))
    store.addFromDraft()
    uni.showToast({ title: '已添加', icon: 'none' })
    closeDrawer()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AccountLayout :active="active" :can-leave="canLeave">
    <view class="card">
      <text class="h font-headline">食谱记录</text>
      <text class="sub">以下为前端 mock 示例数据（字段对齐后端可直接替换）。</text>

      <view class="cards">
        <view v-for="r in top3" :key="r.id" class="rcard">
          <image class="rcard-img" mode="aspectFill" :src="r.imageUrl" />
          <view class="rcard-body">
            <text class="rcard-title">{{ r.name }}</text>
            <text class="rcard-meta">{{ r.kcal }} kcal</text>
          </view>
        </view>
      </view>
    </view>

    <view class="fab" hover-class="fab--hover" @click="openDrawer">
      <uni-icons type="plus" size="22" color="var(--color-on-primary)" />
    </view>

    <view v-if="drawerOpen" class="drawer" @click="closeDrawer">
      <view class="drawer-backdrop" />
      <view class="drawer-panel" @click.stop>
        <view class="drawer-head">
          <text class="drawer-title font-headline">添加食谱</text>
          <view class="drawer-close" hover-class="drawer-close--hover" @click="closeDrawer">
            <uni-icons type="close" size="18" color="var(--color-on-surface)" />
          </view>
        </view>

        <view class="field">
          <text class="label">食谱名称</text>
          <input class="input" :value="store.draft.name" maxlength="40" @input="(e) => setName((e as any).detail.value)" />
          <text v-if="err.name" class="err">{{ err.name }}</text>
        </view>

        <view class="field">
          <text class="label">食材清单</text>
          <textarea class="textarea" :value="store.draft.ingredientsText" @input="(e) => setIngredients((e as any).detail.value)" />
          <text v-if="err.ingredients" class="err">{{ err.ingredients }}</text>
        </view>

        <view class="field">
          <text class="label">制作步骤</text>
          <textarea class="textarea" :value="store.draft.stepsText" @input="(e) => setSteps((e as any).detail.value)" />
          <text v-if="err.steps" class="err">{{ err.steps }}</text>
        </view>

        <view class="field">
          <text class="label">热量估算 (kcal)</text>
          <input class="input" type="number" :value="store.draft.kcal == null ? '' : String(store.draft.kcal)" @input="(e) => setKcal((e as any).detail.value)" />
          <text v-if="err.kcal" class="err">{{ err.kcal }}</text>
        </view>

        <view class="field">
          <view class="label-row">
            <text class="label">成品图</text>
            <button class="link" @click="pickImage">上传</button>
          </view>
          <view class="imgbox" hover-class="imgbox--hover" @click="pickImage">
            <image v-if="store.draft.imageBase64 || store.draft.imagePath" class="img" mode="aspectFill" :src="store.draft.imageBase64 || store.draft.imagePath" />
            <view v-else class="imgph">
              <uni-icons type="camera" size="24" color="var(--color-on-surface-variant)" />
              <text class="imgph-text">点击上传</text>
            </view>
          </view>
        </view>

        <button class="btn" :disabled="saving" @click="submit">{{ saving ? '提交中...' : '保存' }}</button>

        <canvas canvas-id="recipeImg" class="hidden" />
      </view>
    </view>

    <view v-if="cropVisible" class="crop">
      <view class="crop-backdrop" @click="cancelCrop" />
      <view class="crop-panel" @click.stop>
        <text class="crop-title font-headline">裁剪图片</text>
        <view class="crop-preview">
          <image class="crop-img" mode="aspectFit" :src="cropSrc" />
          <view class="crop-mask crop-mask--square" />
        </view>
        <view class="crop-actions">
          <button class="ghost" :disabled="cropping" @click="cancelCrop">取消</button>
          <button class="primary" :disabled="cropping" @click="confirmCrop">确认</button>
        </view>
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

.h {
  font-size: 48rpx;
  font-weight: 800;
  margin-bottom: 8rpx;
}

.sub {
  font-size: 24rpx;
  color: var(--color-on-surface-variant);
  margin-bottom: 32rpx;
}

.cards {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.rcard {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 20rpx;
  border-radius: 24rpx;
  background-color: var(--color-surface-container-lowest);
  box-shadow: 0rpx 2rpx 8rpx rgba(var(--shadow-rgb), 0.06);
}

.rcard-img {
  width: 112rpx;
  height: 112rpx;
  border-radius: 16rpx;
}

.rcard-body {
  flex: 1;
  min-width: 0;
}

.rcard-title {
  font-size: 28rpx;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rcard-meta {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--color-on-surface-variant);
}

.fab {
  position: fixed;
  right: 40rpx;
  bottom: 160rpx;
  width: 112rpx;
  height: 112rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0rpx 16rpx 48rpx rgba(var(--shadow-rgb), 0.14);
  z-index: var(--z-overlay);
}

.fab--hover {
  transform: scale(0.98);
}

.drawer {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
}

.drawer-backdrop {
  position: absolute;
  inset: 0;
  background-color: rgba(var(--rgb-black), 0.35);
  backdrop-filter: blur(10px);
}

.drawer-panel {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  border-top-left-radius: 32rpx;
  border-top-right-radius: 32rpx;
  background-color: var(--color-surface);
  padding: 40rpx 48rpx 48rpx;
  max-height: 84vh;
  overflow: auto;
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.drawer-title {
  font-size: 36rpx;
  font-weight: 800;
}

.drawer-close {
  width: 72rpx;
  height: 72rpx;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

.drawer-close--hover {
  background-color: rgba(var(--rgb-black), 0.04);
}

.field {
  margin-top: 24rpx;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.label {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--color-on-surface-variant);
}

.link {
  padding: 0;
  background-color: transparent;
  color: var(--color-primary);
  font-size: 22rpx;
  font-weight: 800;
}

.input {
  height: 88rpx;
  margin-top: 12rpx;
  border-radius: 24rpx;
  background-color: var(--color-surface-container-low);
  padding: 0 24rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.textarea {
  margin-top: 12rpx;
  width: 100%;
  min-height: 160rpx;
  border-radius: 24rpx;
  background-color: var(--color-surface-container-low);
  padding: 24rpx 28rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.err {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--color-error);
}

.imgbox {
  margin-top: 12rpx;
  height: 320rpx;
  border-radius: 24rpx;
  background-color: var(--color-surface-container-low);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.imgbox--hover {
  transform: scale(0.99);
}

.img {
  width: 100%;
  height: 100%;
}

.imgph {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.imgph-text {
  font-size: 22rpx;
  color: var(--color-on-surface-variant);
  font-weight: 700;
}

.btn {
  margin-top: 40rpx;
  height: 96rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 28rpx;
  font-weight: 800;
  line-height: 96rpx;
}

.hidden {
  position: absolute;
  left: -9999px;
  top: -9999px;
  width: 1px;
  height: 1px;
}

.crop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
}

.crop-backdrop {
  position: absolute;
  inset: 0;
  background-color: rgba(var(--rgb-black), 0.35);
  backdrop-filter: blur(10px);
}

.crop-panel {
  position: absolute;
  left: 48rpx;
  right: 48rpx;
  top: 18vh;
  border-radius: 32rpx;
  background-color: var(--color-surface);
  padding: 40rpx;
}

.crop-title {
  font-size: 36rpx;
  font-weight: 800;
}

.crop-preview {
  margin-top: 16rpx;
  height: 480rpx;
  border-radius: 24rpx;
  background-color: var(--color-surface-container-low);
  position: relative;
  overflow: hidden;
}

.crop-img {
  width: 100%;
  height: 100%;
}

.crop-mask {
  position: absolute;
  inset: 0;
  background: rgba(var(--rgb-black), 0.25);
}

.crop-mask--square {
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  padding: 72rpx;
}

.crop-actions {
  margin-top: 24rpx;
  display: flex;
  gap: 16rpx;
}

.ghost {
  flex: 1;
  height: 88rpx;
  border-radius: var(--radius-full);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
  background-color: transparent;
  color: var(--color-on-surface);
  font-size: 28rpx;
  font-weight: 800;
  line-height: 88rpx;
}

.primary {
  flex: 1;
  height: 88rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 28rpx;
  font-weight: 800;
  line-height: 88rpx;
}
</style>
