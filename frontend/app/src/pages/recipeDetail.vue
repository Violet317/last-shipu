<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useRecipeStore } from '@/stores/recipe'
import { useRecipeDetailsStore } from '@/stores/recipeDetails'

const recipeId = ref<string>('')

onLoad((query) => {
  const id = (query as unknown as { id?: string }).id
  recipeId.value = typeof id === 'string' ? id : ''
})

const recipeStore = useRecipeStore()
const recipeDetailsStore = useRecipeDetailsStore()
const isFav = computed<boolean>(() => (recipeId.value ? recipeStore.isFavorite(recipeId.value) : false))

const summary = computed(() => (recipeId.value ? recipeStore.recent.find((x) => x.id === recipeId.value) ?? null : null))
const detail = computed(() => (recipeId.value ? recipeDetailsStore.getById(recipeId.value) : null))

function onToggleFav(): void {
  if (!recipeId.value) return
  recipeStore.toggleFavorite(recipeId.value)
}

function onBack(): void {
  uni.navigateBack()
}

function fmt(ms: number | undefined): string {
  if (!ms) return ''
  return new Date(ms).toLocaleString()
}
</script>

<template>
  <view class="page">
    <view class="header">
      <view class="header-left" @click="onBack">
        <uni-icons type="left" size="20" color="var(--color-on-surface)" />
      </view>
      <text class="title font-headline">食谱详情</text>
      <view class="header-right" @click="onToggleFav">
        <uni-icons :type="isFav ? 'heart-filled' : 'heart'" size="20" color="var(--color-primary)" />
      </view>
    </view>

    <scroll-view class="content" scroll-y>
      <view v-if="detail || summary" class="hero shadow-editorial">
        <image v-if="detail?.coverUrl || summary?.coverUrl" class="hero-img" mode="aspectFill" :src="detail?.coverUrl || summary?.coverUrl" />
      </view>

      <view v-if="detail || summary" class="head">
        <text class="h1 font-headline">{{ detail?.title || summary?.title }}</text>
        <view class="meta">
          <view v-if="fmt(detail?.createdAtMs || summary?.createdAtMs)" class="meta-item">
            <uni-icons type="calendar" size="14" color="var(--color-on-surface-variant)" />
            <text class="meta-text">{{ fmt(detail?.createdAtMs || summary?.createdAtMs) }}</text>
          </view>
          <view v-if="detail?.durationMinutes || summary?.durationMinutes" class="meta-item">
            <uni-icons type="clock" size="14" color="var(--color-on-surface-variant)" />
            <text class="meta-text">{{ detail?.durationMinutes || summary?.durationMinutes }}分钟</text>
          </view>
          <view v-if="detail?.kcal || summary?.kcal" class="meta-item">
            <uni-icons type="fire" size="14" color="var(--color-on-surface-variant)" />
            <text class="meta-text">{{ detail?.kcal || summary?.kcal }} kcal</text>
          </view>
        </view>

        <view v-if="(detail?.tags?.length ?? summary?.tags?.length ?? 0) > 0" class="tags">
          <view v-for="t in (detail?.tags ?? summary?.tags ?? [])" :key="t" class="tag">
            <text class="tag-text">{{ t }}</text>
          </view>
        </view>
      </view>

      <view v-if="detail?.description" class="card shadow-editorial">
        <text class="card-title font-headline">简介</text>
        <text class="card-text">{{ detail.description }}</text>
      </view>

      <view v-if="detail?.steps?.length" class="card shadow-editorial">
        <text class="card-title font-headline">步骤</text>
        <view class="steps">
          <view v-for="s in detail.steps" :key="s.index" class="step">
            <view class="step-no"><text class="step-no-text">{{ s.index }}</text></view>
            <text class="step-text">{{ s.text }}</text>
          </view>
        </view>
      </view>

      <view v-else class="empty">
        <text class="empty-title font-headline">暂无详情</text>
        <text class="empty-sub">该食谱详情尚未缓存。请从「创作」生成后再查看。</text>
      </view>

      <view class="bottom-space" />
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: var(--color-background);
  color: var(--color-on-surface);
}

.header {
  height: 112rpx;
  padding: 0 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom-width: 1rpx;
  border-bottom-style: solid;
  border-bottom-color: var(--color-outline-variant);
  background-color: var(--color-surface);
}

.header-left,
.header-right {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
}

.title {
  font-size: var(--fs-16);
  font-weight: 800;
}

.content {
  height: calc(100vh - 112rpx);
  padding: 48rpx;
}

.hero {
  height: 420rpx;
  border-radius: var(--radius-xl);
  background-color: var(--color-surface-container);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
  margin-bottom: 48rpx;
  overflow: hidden;
}

.hero-img {
  width: 100%;
  height: 100%;
}

.head {
  margin-bottom: 28rpx;
}

.h1 {
  font-size: 48rpx;
  font-weight: 800;
  margin-bottom: 16rpx;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 18rpx 24rpx;
  align-items: center;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.meta-text {
  font-size: 24rpx;
  color: var(--color-on-surface-variant);
}

.tags {
  margin-top: 16rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag {
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background-color: rgba(var(--rgb-accent-100), 0.6);
  border-width: 1rpx;
  border-style: solid;
  border-color: rgba(var(--rgb-black), 0.04);
}

.tag-text {
  font-size: 22rpx;
  font-weight: 800;
  color: var(--color-on-surface);
}

.card {
  padding: 40rpx;
  border-radius: var(--radius-xl);
  background-color: var(--color-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
  margin-top: 24rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: 800;
  margin-bottom: 16rpx;
}

.card-text {
  font-size: 26rpx;
  line-height: 1.7;
  color: var(--color-on-surface-variant);
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.step {
  display: flex;
  gap: 16rpx;
  align-items: flex-start;
}

.step-no {
  width: 48rpx;
  height: 48rpx;
  border-radius: var(--radius-full);
  background-color: rgba(var(--rgb-primary), 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-no-text {
  font-size: 24rpx;
  font-weight: 800;
  color: var(--color-primary);
}

.step-text {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  line-height: 1.7;
  color: var(--color-on-surface);
}

.empty {
  padding: 64rpx 0 0;
  text-align: center;
}

.empty-title {
  font-size: 40rpx;
  font-weight: 800;
  margin-bottom: 12rpx;
}

.empty-sub {
  font-size: 26rpx;
  color: var(--color-on-surface-variant);
}

.bottom-space {
  height: 220rpx;
}
</style>
