<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCoreGoalStore } from '@/stores/coreGoal'

const store = useCoreGoalStore()

const title = ref<string>(store.title)
const subtitle = ref<string>(store.subtitle)

const titleCount = computed(() => title.value.trim().length)

function onBack(): void {
  uni.navigateBack()
}

function onReset(): void {
  store.reset()
  title.value = store.title
  subtitle.value = store.subtitle
  uni.showToast({ title: '已重置', icon: 'none' })
}

function onSave(): void {
  const t = title.value.trim()
  const s = subtitle.value.trim()
  if (!t) {
    uni.showToast({ title: '请输入目标标题', icon: 'none' })
    return
  }
  store.setGoal({ title: t, subtitle: s })
  uni.showToast({ title: '已保存', icon: 'none' })
}
</script>

<template>
  <view class="page">
    <view class="header">
      <view class="back" hover-class="back--hover" @click="onBack">
        <uni-icons type="left" size="20" color="var(--color-on-surface)" />
      </view>
      <text class="title font-headline">核心目标设置</text>
      <view class="header-actions">
        <view class="ghost" hover-class="ghost--hover" @click="onReset">重置</view>
      </view>
    </view>

    <view class="content">
      <view class="card shadow-editorial">
        <text class="h font-headline">核心目标</text>

        <view class="field">
          <view class="label-row">
            <text class="label">标题</text>
            <text class="hint">{{ titleCount }}/20</text>
          </view>
          <input v-model="title" class="input" maxlength="20" placeholder="例如：养成健康饮食习惯" />
        </view>

        <view class="field">
          <view class="label-row">
            <text class="label">说明</text>
            <text class="hint">可选</text>
          </view>
          <textarea v-model="subtitle" class="textarea" maxlength="120" placeholder="写一句你的目标说明..." />
        </view>

        <button class="btn" @click="onSave">保存</button>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: var(--color-background);
  color: var(--color-on-surface);
}

.header {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  height: 112rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: var(--z-header);
  background-color: rgba(var(--rgb-appbar-bg), 0.92);
  backdrop-filter: blur(18px);
  border-bottom-width: 1rpx;
  border-bottom-style: solid;
  border-bottom-color: rgba(var(--rgb-black), 0.06);
}

.back {
  width: 72rpx;
  height: 72rpx;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

.back--hover {
  background-color: rgba(var(--rgb-black), 0.04);
}

.title {
  font-size: 36rpx;
  font-weight: 800;
}

.header-actions {
  width: 120rpx;
  display: flex;
  justify-content: flex-end;
}

.ghost {
  height: 72rpx;
  padding: 0 20rpx;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 800;
  color: var(--color-primary);
}

.ghost--hover {
  background-color: rgba(var(--rgb-accent-100), 0.6);
}

.content {
  padding: 144rpx 48rpx 220rpx;
  max-width: 1024px;
  margin: 0 auto;
}

.card {
  padding: 48rpx;
  border-radius: var(--radius-xl);
  background-color: var(--color-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
}

.h {
  font-size: 44rpx;
  font-weight: 800;
  margin-bottom: 24rpx;
}

.field {
  margin-top: 28rpx;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.label {
  font-size: 24rpx;
  font-weight: 800;
}

.hint {
  font-size: 22rpx;
  color: var(--color-on-surface-variant);
}

.input {
  height: 88rpx;
  padding: 0 24rpx;
  border-radius: 24rpx;
  background-color: var(--color-surface-container-lowest);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
  font-size: 28rpx;
}

.textarea {
  width: 100%;
  height: 220rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background-color: var(--color-surface-container-lowest);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
  font-size: 28rpx;
  line-height: 1.6;
}

.btn {
  margin-top: 40rpx;
  height: 96rpx;
  border-radius: 28rpx;
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: 800;
}
</style>

