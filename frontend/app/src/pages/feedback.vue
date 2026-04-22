<script setup lang="ts">
import { computed, ref } from 'vue'
import AccountLayout, { type AccountRouteKey } from '@/components/account/AccountLayout.vue'
import { useFeedbackStore, type FeedbackImage } from '@/stores/feedback'
import { validateFeedbackText } from '@/utils/validation'

const active: AccountRouteKey = 'feedback'
const store = useFeedbackStore()

const hoverId = ref<string | null>(null)

const text = computed<string>({
  get: () => store.text,
  set: (v) => store.setText(v),
})

const count = computed<number>(() => text.value.length)
const err = ref<string>('')

function canLeave(): boolean {
  return !store.isDirty
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`
}

async function pickImages(): Promise<void> {
  if (store.images.length >= 3) return
  const res = await uni.chooseImage({ count: 3 - store.images.length, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
  const raw = res.tempFiles
  const files: Array<{ path: string; size: number }> = Array.isArray(raw)
    ? raw.map((f) => ({ path: (f as { path: string }).path, size: (f as { size: number }).size }))
    : raw
      ? [{ path: (raw as { path: string }).path, size: (raw as { size: number }).size }]
      : []
  const list: FeedbackImage[] = []
  for (const f of files) {
    if (f.size > 1024 * 1024) {
      uni.showToast({ title: '单张截图需 ≤1MB', icon: 'none' })
      continue
    }
    list.push({ id: uid('img'), path: f.path, sizeBytes: f.size })
  }
  store.addImages(list)
}

function remove(id: string): void {
  store.removeImage(id)
}

const dragFrom = ref<number | null>(null)

function startDrag(i: number): void {
  dragFrom.value = i
}

function dropTo(i: number): void {
  const from = dragFrom.value
  dragFrom.value = null
  if (from == null) return
  store.reorder(from, i)
}

function onDragStart(i: number): void {
  startDrag(i)
}

function onDrop(i: number): void {
  dropTo(i)
}

function onDragEnd(): void {
  dragFrom.value = null
}

function validate(): boolean {
  const r = validateFeedbackText(text.value)
  err.value = r.ok ? '' : r.message ?? '内容不合法'
  return r.ok
}

async function submit(): Promise<void> {
  if (store.submitting) return
  if (!validate()) return
  store.submitting = true
  try {
    await new Promise<void>((r) => setTimeout(r, 700))
    store.reset()
    store.showThanks()
    setTimeout(() => store.hideThanks(), 3000)
  } finally {
    store.submitting = false
  }
}
</script>

<template>
  <AccountLayout :active="active" :can-leave="canLeave">
    <view class="card">
      <text class="h font-headline">反馈</text>
      <text class="sub">告诉我们你的想法，我们会持续改进。</text>

      <view class="field">
        <view class="label-row">
          <text class="label">内容</text>
          <text class="count">{{ count }}/500</text>
        </view>
        <textarea v-model="text" class="textarea" maxlength="500" placeholder="至少输入10个字..." @blur="validate" />
        <text v-if="err" class="err">{{ err }}</text>
      </view>

      <view class="field">
        <view class="label-row">
          <text class="label">截图（最多3张）</text>
          <button class="link" @click="pickImages">添加</button>
        </view>

        <view class="imgs">
          <view
            v-for="(img, idx) in store.images"
            :key="img.id"
            class="img"
            hover-class="img--pressed"
            @longpress="startDrag(idx)"
            @click="dropTo(idx)"
            @touchstart="hoverId = img.id"
            @touchend="hoverId = null"
            @touchcancel="hoverId = null"
            @mouseenter="hoverId = img.id"
            @mouseleave="hoverId = null"
            :draggable="true"
            @dragstart="onDragStart(idx)"
            @dragover.prevent
            @drop="onDrop(idx)"
            @dragend="onDragEnd"
          >
            <image class="img-pic" mode="aspectFill" :src="img.path" />
            <view class="img-x" @click.stop="remove(img.id)">
              <uni-icons type="close" size="14" color="var(--color-on-brand)" />
            </view>
            <view v-if="hoverId === img.id" class="badge">
              <text class="badge-text">{{ idx + 1 }}</text>
            </view>
          </view>
          <view v-if="store.images.length < 3" class="img add" hover-class="img--pressed" @click="pickImages">
            <uni-icons type="plus" size="22" color="var(--color-on-surface-variant)" />
            <text class="add-text">添加</text>
          </view>
        </view>

        <text class="tip">桌面端支持拖拽排序；移动端可长按一张图片进入排序模式，再点击目标位置完成交换。</text>
      </view>

      <button class="btn" :disabled="store.submitting" @click="submit">
        {{ store.submitting ? '提交中...' : '提交反馈' }}
      </button>
    </view>

    <view v-if="store.thanksVisible" class="thanks">
      <view class="thanks-backdrop" />
      <view class="thanks-panel">
        <text class="thanks-title font-headline">感谢您的反馈</text>
        <text class="thanks-sub">我们已收到，会尽快处理。</text>
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

.field {
  margin-top: 32rpx;
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

.count {
  font-size: 20rpx;
  color: var(--color-outline);
}

.link {
  padding: 0;
  background-color: transparent;
  color: var(--color-primary);
  font-size: 22rpx;
  font-weight: 800;
}

.textarea {
  margin-top: 12rpx;
  width: 100%;
  min-height: 240rpx;
  border-radius: 24rpx;
  background-color: var(--color-surface-container-low);
  padding: 24rpx 28rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-on-surface);
}

.err {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--color-error);
}

.imgs {
  margin-top: 16rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.img {
  position: relative;
  height: 180rpx;
  border-radius: 24rpx;
  overflow: hidden;
  background-color: var(--color-surface-container-low);
}

.img--pressed {
  transform: scale(0.98);
}

.img-pic {
  width: 100%;
  height: 100%;
}

.img-x {
  position: absolute;
  right: 10rpx;
  top: 10rpx;
  width: 44rpx;
  height: 44rpx;
  border-radius: var(--radius-full);
  background-color: rgba(var(--rgb-black), 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge {
  position: absolute;
  left: 10rpx;
  top: 10rpx;
  padding: 0 14rpx;
  height: 44rpx;
  border-radius: var(--radius-full);
  background-color: rgba(var(--rgb-black), 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-text {
  font-size: 20rpx;
  font-weight: 800;
  color: var(--color-on-brand);
}

.add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.add-text {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--color-on-surface-variant);
}

.tip {
  margin-top: 12rpx;
  font-size: 20rpx;
  color: var(--color-outline);
}

.btn {
  margin-top: 48rpx;
  height: 96rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 28rpx;
  font-weight: 800;
  line-height: 96rpx;
}

.thanks {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
}

.thanks-backdrop {
  position: absolute;
  inset: 0;
  background-color: rgba(var(--rgb-black), 0.35);
  backdrop-filter: blur(10px);
}

.thanks-panel {
  position: absolute;
  left: 48rpx;
  right: 48rpx;
  top: 32vh;
  border-radius: 32rpx;
  background-color: var(--color-surface);
  padding: 48rpx;
  text-align: center;
}

.thanks-title {
  font-size: 36rpx;
  font-weight: 800;
  margin-bottom: 12rpx;
}

.thanks-sub {
  font-size: 24rpx;
  color: var(--color-on-surface-variant);
}
</style>
