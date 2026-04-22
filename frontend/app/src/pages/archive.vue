<script setup lang="ts">
import { computed } from 'vue'
import { useRecipeStore } from '@/stores/recipe'

const recipeStore = useRecipeStore()

const items = computed(() =>
  recipeStore.recent
    .slice()
    .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0))
)

function onBack(): void {
  uni.navigateBack()
}

function openRecipe(id: string): void {
  uni.navigateTo({ url: `/pages/recipeDetail?id=${encodeURIComponent(id)}` })
}

function fmt(ms: number | undefined): string {
  if (!ms) return ''
  return new Date(ms).toLocaleString()
}
</script>

<template>
  <view class="page">
    <view class="appbar">
      <view class="btn" hover-class="btn--hover" @click="onBack">
        <uni-icons type="left" size="20" color="var(--color-on-surface)" />
      </view>
      <text class="title font-headline">存档</text>
      <view class="btn" />
    </view>

    <view class="main">
      <view class="head">
        <text class="h font-headline">食谱历史</text>
        <text class="sub">您所有生成过的食谱</text>
      </view>

      <view v-if="items.length === 0" class="empty">
        <text class="empty-text">暂无存档。</text>
      </view>

      <view v-else class="list">
        <view
          v-for="r in items"
          :key="r.id"
          class="item"
          hover-class="item--pressed"
          @click="openRecipe(r.id)"
        >
          <view class="thumb">
            <image class="thumb-img" mode="aspectFill" :src="r.coverUrl" />
          </view>
          <view class="body">
            <text class="name">{{ r.title }}</text>
            <text class="meta">{{ fmt(r.createdAtMs) || '刚刚' }}</text>
          </view>
          <uni-icons type="right" size="18" color="var(--color-on-surface-variant)" />
        </view>
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

.appbar {
  height: 112rpx;
  padding: 0 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: rgba(var(--rgb-appbar-bg), 0.8);
  backdrop-filter: blur(16px);
}

.btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn--hover {
  background-color: rgba(var(--rgb-black), 0.04);
}

.title {
  font-size: 36rpx;
  font-weight: 800;
}

.main {
  padding: 32rpx 48rpx 220rpx;
  max-width: 1024px;
  margin: 0 auto;
}

.head {
  margin-bottom: 32rpx;
  padding: 0 16rpx;
}

.h {
  font-size: 48rpx;
  font-weight: 800;
  margin-bottom: 8rpx;
}

.sub {
  font-size: 28rpx;
  color: var(--color-on-surface-variant);
}

.empty {
  padding: 48rpx 16rpx;
}

.empty-text {
  font-size: 28rpx;
  color: var(--color-on-surface-variant);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 20rpx;
  border-radius: 24rpx;
  background-color: var(--color-surface-container-lowest);
  box-shadow: 0rpx 2rpx 8rpx rgba(var(--shadow-rgb), 0.06);
}

.item--pressed {
  transform: scale(0.98);
}

.thumb {
  width: 112rpx;
  height: 112rpx;
  border-radius: 16rpx;
  overflow: hidden;
  flex-shrink: 0;
}

.thumb-img {
  width: 100%;
  height: 100%;
}

.body {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 28rpx;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--color-on-surface-variant);
}
</style>
