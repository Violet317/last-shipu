<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getDailyFeatured, type DailyFeaturedData, type DailyFeaturedItem } from '@/api/dailyFeatured'
import { useRecipeDetailsStore } from '@/stores/recipeDetails'
import { useRecipeStore } from '@/stores/recipe'

const loading = ref<boolean>(false)
const error = ref<string>('')
const data = ref<DailyFeaturedData | null>(null)

const recipeStore = useRecipeStore()
const recipeDetailsStore = useRecipeDetailsStore()

function onBack(): void {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  uni.switchTab({ url: '/pages/home' })
}

function syncItem(it: DailyFeaturedItem): void {
  recipeDetailsStore.put({
    id: it.id,
    title: it.title,
    coverUrl: it.coverUrl,
    description: it.subtitle,
    tags: it.tags,
    kcal: it.kcal,
    durationMinutes: it.durationMinutes,
    steps: it.steps,
    createdAtMs: it.createdAtMs,
  })
  recipeStore.setRecent([
    {
      id: it.id,
      title: it.title,
      coverUrl: it.coverUrl,
      tags: it.tags,
      kcal: it.kcal,
      durationMinutes: it.durationMinutes,
      createdAtMs: it.createdAtMs,
    },
    ...recipeStore.recent,
  ])
}

function openRecipe(it: DailyFeaturedItem): void {
  syncItem(it)
  uni.navigateTo({ url: `/pages/recipeDetail?id=${encodeURIComponent(it.id)}` })
}

async function fetchDaily(): Promise<void> {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const r = await getDailyFeatured()
    data.value = r
    syncItem(r.hero)
    for (const it of r.list) syncItem(it)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(fetchDaily)

const list = computed(() => data.value?.list ?? [])
</script>

<template>
  <view class="page">
    <view class="header">
      <view class="back" hover-class="back--hover" @click="onBack">
        <uni-icons type="left" size="20" color="var(--color-on-surface)" />
      </view>
      <text class="title font-headline">每日精选</text>
      <view class="header-actions">
        <view class="ghost" hover-class="ghost--hover" @click="fetchDaily">刷新</view>
      </view>
    </view>

    <scroll-view class="content" scroll-y>
      <view v-if="loading" class="empty">
        <text class="empty-text">加载中...</text>
      </view>
      <view v-else-if="error" class="empty">
        <text class="empty-text">{{ error }}</text>
      </view>

      <template v-else-if="data">
        <view class="head shadow-editorial">
          <text class="date font-headline">{{ data.date }}</text>
          <text class="reason">{{ data.reason }}</text>
        </view>

        <view class="hero-card shadow-editorial" @click="openRecipe(data.hero)">
          <image class="hero-card-img" mode="aspectFill" :src="data.hero.coverUrl" />
          <view class="hero-card-mask" @click="openRecipe(data.hero)" />
          <view class="hero-card-content">
            <view class="hero-tags">
              <view v-for="t in data.hero.tags" :key="t" class="hero-tag">
                <text class="hero-tag-text">{{ t }}</text>
              </view>
            </view>
            <text class="hero-title2 font-headline">{{ data.hero.title }}</text>
            <text class="hero-sub2">{{ data.hero.subtitle }}</text>
          </view>
        </view>

        <view class="section-head section-gap">
          <text class="section-title font-headline">更多推荐</text>
        </view>

        <view class="grid">
          <view v-for="it in list" :key="it.id" class="item-card shadow-editorial" @click="openRecipe(it)">
            <view class="item-top">
              <image class="item-img" mode="aspectFill" :src="it.coverUrl" />
            </view>
            <view class="item-body">
              <text class="item-meta">{{ it.durationMinutes }}分钟 • {{ it.kcal }} kcal</text>
              <text class="item-title font-headline">{{ it.title }}</text>
              <view class="item-foot">
                <view class="tags">
                  <view v-for="t in it.tags" :key="t" class="tag">
                    <text class="tag-text">{{ t }}</text>
                  </view>
                </view>
                <uni-icons type="right" size="18" color="var(--color-on-surface-variant)" />
              </view>
            </view>
          </view>
        </view>
      </template>

      <view v-else class="empty">
        <text class="empty-text">暂无推荐</text>
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
  height: calc(100vh - 112rpx);
  padding: 144rpx 48rpx 220rpx;
}

.head {
  padding: 40rpx;
  border-radius: var(--radius-xl);
  background-color: var(--color-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
  margin-bottom: 24rpx;
}

.date {
  font-size: 40rpx;
  font-weight: 800;
  margin-bottom: 12rpx;
}

.reason {
  font-size: 26rpx;
  line-height: 1.7;
  color: var(--color-on-surface-variant);
}

.empty {
  padding: 64rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 28rpx;
  color: var(--color-on-surface-variant);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 32rpx;
  margin-bottom: 24rpx;
}

.section-gap {
  margin-top: 56rpx;
}

.section-title {
  font-size: 34rpx;
  font-weight: 800;
}

.hero-card {
  position: relative;
  height: 420rpx;
  border-radius: var(--radius-xl);
  overflow: hidden;
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
}

.hero-card-img {
  width: 100%;
  height: 100%;
}

.hero-card-mask {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: 0;
  background: linear-gradient(180deg, rgba(var(--rgb-black), 0.0) 0%, rgba(var(--rgb-black), 0.28) 48%, rgba(var(--rgb-black), 0.58) 100%);
}

.hero-card-content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 32rpx;
}

.hero-tags {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
  margin-bottom: 16rpx;
}

.hero-tag {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background-color: rgba(var(--rgb-white), 0.2);
  border-width: 1rpx;
  border-style: solid;
  border-color: rgba(var(--rgb-white), 0.18);
}

.hero-tag-text {
  font-size: 22rpx;
  font-weight: 800;
  color: #ffffff;
}

.hero-title2 {
  font-size: 40rpx;
  font-weight: 800;
  color: #ffffff;
  margin-bottom: 8rpx;
}

.hero-sub2 {
  font-size: 24rpx;
  line-height: 1.6;
  color: rgba(var(--rgb-white), 0.86);
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16rpx;
}

.item-card {
  border-radius: var(--radius-xl);
  overflow: hidden;
  background-color: var(--color-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
}

.item-top {
  height: 220rpx;
  overflow: hidden;
}

.item-img {
  width: 100%;
  height: 100%;
}

.item-body {
  padding: 24rpx;
}

.item-meta {
  font-size: 22rpx;
  color: var(--color-on-surface-variant);
}

.item-title {
  margin-top: 10rpx;
  font-size: 30rpx;
  font-weight: 800;
}

.item-foot {
  margin-top: 14rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tags {
  display: flex;
  gap: 10rpx;
  flex-wrap: wrap;
}

.tag {
  padding: 8rpx 12rpx;
  border-radius: 999rpx;
  background-color: rgba(var(--rgb-accent-100), 0.6);
}

.tag-text {
  font-size: 22rpx;
  font-weight: 800;
  color: var(--color-on-surface);
}

.bottom-space {
  height: 220rpx;
}
</style>

