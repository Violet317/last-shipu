<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getDailyFeatured, type DailyFeaturedData, type DailyFeaturedItem } from '@/api/dailyFeatured'
import { useRecipeDetailsStore } from '@/stores/recipeDetails'
import { useRecipeStore } from '@/stores/recipe'
import { useUserStore } from '@/stores/user'
import { useInventoryStore } from '@/stores/inventory'
import { usePantryStore } from '@/stores/pantry'
import { getDaysLeft, getFreshnessColor, getFreshnessLevel } from '@/utils/expiry'

const query = ref<string>('')
const recipeStore = useRecipeStore()
const recipeDetailsStore = useRecipeDetailsStore()
const userStore = useUserStore()
const inventoryStore = useInventoryStore()
const pantryStore = usePantryStore()

const avatarUrl = computed<string>(() => userStore.profile?.avatarUrl ?? '')
const avatarLabel = computed<string>(() => (userStore.profile?.nickname?.trim() ? userStore.profile.nickname.trim().slice(0, 1) : '我'))

function onAskAi(): void {
  uni.switchTab({ url: '/pages/aiCreate' })
}

function onOpenShoppingList(): void {
  uni.navigateTo({ url: '/pages/shoppingList' })
}

function onRecommend(names: string[]): void {
  const prompt = `基于这些临期食材，给我 3 个快手做法，每个都要：用料清单、步骤、热量估算、可替代食材。临期优先：${names.join('、')}`
  uni.switchTab({ url: `/pages/aiCreate?ingredients=${encodeURIComponent(names.join(','))}&prompt=${encodeURIComponent(prompt)}&auto=3` })
}

async function onConsume(pantryId: string): Promise<void> {
  const res = await new Promise<UniApp.ShowModalRes>((resolve) => {
    uni.showModal({
      title: '确认消耗',
      content: '确认已消耗/丢弃该食材库存记录？',
      confirmText: '确认',
      cancelText: '取消',
      success: (r) => resolve(r),
      fail: () => resolve({ confirm: false, cancel: true } as UniApp.ShowModalRes),
    })
  })
  if (!res.confirm) return
  await pantryStore.remove(pantryId)
}

function onOpenProfile(): void {
  uni.switchTab({ url: '/pages/me' })
}

function onOpenRecipe(id: string): void {
  uni.navigateTo({ url: `/pages/recipeDetail?id=${encodeURIComponent(id)}` })
}

function onOpenDailyFeatured(): void {
  uni.navigateTo({ url: '/pages/dailyFeatured' })
}

function onToggleFavorite(id: string): void {
  recipeStore.toggleFavorite(id)
}

function onOpenRecord(): void {
  uni.navigateTo({ url: '/pages/nutrition' })
}

function seeded(n: number): number {
  const x = Math.sin(n) * 10000
  return x - Math.floor(x)
}

type HeatIntensity = 1 | 2 | 3 | 4 | 5

const heatmap = computed<HeatIntensity[]>(() => {
  const list: HeatIntensity[] = []
  for (let i = 0; i < 280; i += 1) {
    const r = seeded(i + 17)
    const v = (r < 0.18 ? 1 : r < 0.45 ? 2 : r < 0.72 ? 3 : r < 0.9 ? 4 : 5) as HeatIntensity
    list.push(v)
  }
  return list
})

const dailyLoading = ref<boolean>(false)
const dailyError = ref<string>('')
const daily = ref<DailyFeaturedData | null>(null)

const featured = computed<DailyFeaturedItem>(() => {
  if (daily.value) return daily.value.hero
  return {
    id: 'df_loading',
    title: '每日精选',
    subtitle: '由 AI 基于你的摄入与食材库推荐，凌晨更新。',
    tags: ['AI'],
    coverUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCVWJj4s2LicnUDBDcy0eKPOOSC4asGlmoRW_pFqjsc6sghutd5VOHacMgd7aYEQCDJULTabLh8KjrcJdwe7-3Rohi657URv5A7UuFNH4Ciq3-4RF2icI3LdYzGwWHVZj8mu1uOF1hyZgES_sCpj_Z8VI1UoUSjR4lqpqttZAdQjcs0t-2zuRRmIrSSbN7AvtuhsJiPhdzAFZM7Ko5kduV9grvKeOAX8NMa9F6iMTZrirr8VChbZAiUjNY949mpI3ocEZJJDqXPrOHO',
    kcal: 0,
    durationMinutes: 0,
    createdAtMs: Date.now(),
    steps: [],
  }
})

const list = computed<DailyFeaturedItem[]>(() => daily.value?.list ?? [])

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

async function fetchDaily(): Promise<void> {
  if (dailyLoading.value) return
  dailyLoading.value = true
  dailyError.value = ''
  try {
    const r = await getDailyFeatured()
    daily.value = r
    syncItem(r.hero)
    for (const it of r.list) syncItem(it)
  } catch (e) {
    dailyError.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    dailyLoading.value = false
  }
}

const expiring = computed(() => {
  const invMap = new Map(inventoryStore.items.map((x) => [x.id, x]))
  const now = Date.now()
  return pantryStore.items
    .map((p) => {
      const inv = invMap.get(p.inventoryId)
      const nameZh = inv?.nameZh ?? '未知食材'
      const daysLeft = getDaysLeft(p.expiresAtMs, now)
      const level = getFreshnessLevel(daysLeft)
      return { pantryId: p.id, inventoryId: p.inventoryId, nameZh, daysLeft, level, color: getFreshnessColor(level) }
    })
    .filter((x) => x.level !== 'fresh')
    .slice()
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3)
})

onMounted(async () => {
  await fetchDaily()
  await inventoryStore.fetch()
  await pantryStore.fetch()
})
</script>

<template>
  <view class="page">
    <view class="header">
      <view class="header-left">
        <text class="title font-headline">美食策展人</text>
      </view>
      <view class="avatar" hover-class="avatar--hover" @click="onOpenProfile">
        <image v-if="avatarUrl" class="avatar-img" mode="aspectFill" :src="avatarUrl" />
        <view v-else class="avatar-fallback">
          <text class="avatar-text font-headline">{{ avatarLabel }}</text>
        </view>
      </view>
    </view>

    <scroll-view class="content" scroll-y>
      <view class="hero">
        <view class="hero-title font-headline">
          <text>今天想</text>
          <text>\n</text>
          <text class="hero-title-accent">创作</text>
          <text>点什么？</text>
        </view>
        <text class="hero-subtitle">您的AI烹饪助手已准备好将您的食材变成杰作。</text>
      </view>

      <view class="search">
        <view class="search-icon">
          <uni-icons type="search" size="18" color="var(--color-on-surface-variant)" />
        </view>
        <input v-model="query" class="search-input" placeholder="我有三文鱼、牛油果..." />
        <button class="search-btn" @click="onAskAi">询问AI</button>
      </view>

      <view class="card shadow-editorial">
        <view class="card-head">
          <text class="card-title font-headline">临期预警</text>
          <button class="link" @click="onOpenShoppingList">购物清单</button>
        </view>
        <view v-if="expiring.length === 0" class="empty">
          <text class="empty-text">暂无临期食材</text>
        </view>
        <view v-else class="expiring">
          <view v-for="x in expiring" :key="x.pantryId" class="exp-row">
            <view class="dot" :style="{ backgroundColor: x.color }" />
            <view class="exp-main">
              <text class="exp-name">{{ x.nameZh }}</text>
              <text class="exp-sub">{{ x.daysLeft < 0 ? '已过期' : `还有 ${x.daysLeft} 天` }}</text>
            </view>
            <button class="btn" @click="onRecommend([x.nameZh])">推荐做法</button>
            <button class="btn ghost" @click="onConsume(x.pantryId)">一键消耗</button>
          </view>
        </view>
      </view>

      <view class="card shadow-editorial" @click="onOpenRecord">
        <view class="card-head">
          <text class="card-title font-headline">今日已摄入营养统计</text>
          <view class="badge">
            <text class="badge-text">已达成 75%</text>
          </view>
        </view>
        <view class="stats">
          <view class="stat">
            <view class="stat-row">
              <text class="stat-label">热量</text>
              <text class="stat-value">1650 / 2200 kcal</text>
            </view>
            <view class="bar">
              <view class="bar-fill" style="width: 75%" />
            </view>
          </view>
          <view class="stat">
            <view class="stat-row">
              <text class="stat-label">蛋白质</text>
              <text class="stat-value">65 / 80 g</text>
            </view>
            <view class="bar">
              <view class="bar-fill" style="width: 81%" />
            </view>
          </view>
          <view class="stat">
            <view class="stat-row">
              <text class="stat-label">碳水</text>
              <text class="stat-value">180 / 250 g</text>
            </view>
            <view class="bar">
              <view class="bar-fill" style="width: 72%" />
            </view>
          </view>
          <view class="stat">
            <view class="stat-row">
              <text class="stat-label">脂肪</text>
              <text class="stat-value">45 / 60 g</text>
            </view>
            <view class="bar">
              <view class="bar-fill" style="width: 75%" />
            </view>
          </view>
        </view>
      </view>

      <view class="section-head">
        <text class="section-title font-headline">饮食习惯追踪</text>
        <text class="section-meta">过去 12 个月</text>
      </view>
      <view class="heatmap-card">
        <scroll-view class="heatmap-scroll" scroll-x>
          <view class="heatmap-grid">
            <view v-for="(h, idx) in heatmap" :key="idx" class="heatmap-dot" :class="`heat-${h}`" />
          </view>
        </scroll-view>
        <view class="heatmap-footer">
          <view class="heatmap-legend">
            <text class="legend-text">少</text>
            <view class="legend-dots">
              <view class="legend-dot heat-1" />
              <view class="legend-dot heat-2" />
              <view class="legend-dot heat-3" />
              <view class="legend-dot heat-4" />
              <view class="legend-dot heat-5" />
            </view>
            <text class="legend-text">多</text>
          </view>
          <text class="heatmap-summary">坚持健康饮食：<text class="heatmap-strong">245 天</text></text>
        </view>
      </view>

      <view class="section-head section-gap">
        <text class="section-title font-headline">每日精选</text>
        <view class="section-actions">
          <text class="section-link" @click="onOpenDailyFeatured">查看</text>
        </view>
      </view>

      <view class="hero-card shadow-editorial" @click="onOpenRecipe(featured.id)">
        <image class="hero-card-img" mode="aspectFill" :src="featured.coverUrl" />
        <view class="hero-card-mask" @click="onOpenRecipe(featured.id)" />
        <view class="hero-card-content">
          <view class="hero-tags">
            <view v-for="t in featured.tags" :key="t" class="hero-tag">
              <text class="hero-tag-text">{{ t }}</text>
            </view>
          </view>
          <text class="hero-title2 font-headline">{{ featured.title }}</text>
          <text class="hero-sub2">{{ featured.subtitle }}</text>
        </view>
      </view>

      <view class="grid">
        <view v-for="it in list" :key="it.id" class="item-card shadow-editorial" @click="onOpenRecipe(it.id)">
          <view class="item-top">
            <image class="item-img" mode="aspectFill" :src="it.coverUrl" />
            <button class="fav-btn" @click.stop="onToggleFavorite(it.id)">
              <uni-icons
                :type="recipeStore.isFavorite(it.id) ? 'heart-filled' : 'heart'"
                size="18"
                color="var(--color-brand)"
              />
            </button>
          </view>
          <view class="item-body">
            <text class="item-meta">{{ (it.tags[0] ?? '推荐') + ' • ' + it.durationMinutes + '分钟' }}</text>
            <text class="item-title font-headline">{{ it.title }}</text>
            <view class="item-foot">
              <view class="kcal">
                <uni-icons type="fire" size="14" color="var(--color-on-surface-variant)" />
                <text class="kcal-text">{{ it.kcal }} kcal</text>
              </view>
              <uni-icons type="bookmark" size="18" color="var(--color-outline-variant)" />
            </view>
          </view>
        </view>
      </view>
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
  z-index: var(--z-header);
  height: 112rpx;
  padding: 0 48rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--color-surface);
  border-bottom-width: 1rpx;
  border-bottom-style: solid;
  border-bottom-color: var(--color-outline-variant);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.icon-circle {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
}

.title {
  font-size: var(--fs-18);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-surface-container);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar--hover {
  background-color: var(--color-surface-container-low);
}

.avatar-img {
  width: 100%;
  height: 100%;
}

.avatar-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  font-size: 28rpx;
  font-weight: 900;
  color: var(--color-on-surface);
}

.content {
  padding: 144rpx 48rpx 96rpx;
}

.hero {
  margin-bottom: 80rpx;
}

.hero-title {
  font-size: var(--fs-40);
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 16rpx;
  white-space: pre-line;
}

.hero-title-accent {
  color: var(--color-brand);
}

.hero-subtitle {
  font-size: var(--fs-14);
  color: var(--color-on-surface-variant);
}

.search {
  position: relative;
  height: 96rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
  display: flex;
  align-items: center;
  padding-left: 112rpx;
  padding-right: 224rpx;
  margin-bottom: 80rpx;
}

.search-icon {
  position: absolute;
  left: 40rpx;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  height: 96rpx;
  font-size: var(--fs-14);
  font-weight: 600;
  color: var(--color-on-surface);
}

.search-btn {
  position: absolute;
  right: 16rpx;
  top: 16rpx;
  bottom: 16rpx;
  padding: 0 48rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-brand);
  color: var(--color-on-brand);
  font-size: var(--fs-12);
  font-weight: 700;
  line-height: 64rpx;
}

.card {
  padding: 48rpx;
  border-radius: var(--radius-xl);
  background-color: var(--color-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 48rpx;
}

.card-title {
  font-size: var(--fs-16);
  font-weight: 700;
}

.link {
  background-color: transparent;
  padding: 0;
  color: var(--color-primary);
  font-size: var(--fs-12);
  font-weight: 800;
  line-height: 1;
}

.empty {
  padding: 22rpx 0;
}

.empty-text {
  color: var(--color-on-surface-variant);
  font-size: var(--fs-12);
  font-weight: 700;
}

.expiring {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.exp-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 18rpx 18rpx;
  border-radius: 22rpx;
  background-color: rgba(var(--rgb-black), 0.04);
}

.dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: var(--radius-full);
}

.exp-main {
  flex: 1;
  min-width: 0;
}

.exp-name {
  display: block;
  font-size: var(--fs-14);
  font-weight: 900;
  color: var(--color-on-surface);
}

.exp-sub {
  display: block;
  margin-top: 4rpx;
  font-size: var(--fs-12);
  font-weight: 700;
  color: var(--color-on-surface-variant);
}

.btn {
  height: 60rpx;
  padding: 0 18rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font-size: var(--fs-12);
  font-weight: 900;
  line-height: 60rpx;
}

.btn.ghost {
  background-color: rgba(var(--rgb-black), 0.06);
  color: var(--color-on-surface);
}

.badge {
  padding: 8rpx 24rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-primary-container);
}

.badge-text {
  color: var(--color-primary);
  font-size: var(--fs-10);
  font-weight: 700;
}

.stats {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.stat-label {
  font-size: var(--fs-12);
  color: var(--color-on-surface-variant);
  font-weight: 600;
  flex-shrink: 0;
}

.stat-value {
  font-size: var(--fs-12);
  color: var(--color-on-surface);
  font-weight: 600;
  flex: 1;
  min-width: 0;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bar {
  height: 16rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-surface-container);
  overflow: hidden;
}

.bar-fill {
  height: 16rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-brand);
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 64rpx;
  margin-bottom: 24rpx;
}

.section-gap {
  margin-top: 72rpx;
}

.section-title {
  font-size: var(--fs-16);
  font-weight: 800;
}

.section-actions {
  display: flex;
  align-items: center;
}

.section-link {
  font-size: var(--fs-12);
  font-weight: 800;
  color: var(--color-brand);
}

.section-meta {
  font-size: var(--fs-10);
  color: var(--color-on-surface-variant);
}

.heatmap-card {
  padding: 48rpx;
  border-radius: var(--radius-xl);
  background-color: var(--color-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
  overflow: hidden;
}

.heatmap-scroll {
  width: 100%;
}

.heatmap-grid {
  display: flex;
  flex-wrap: wrap;
  height: 168rpx;
  width: 100%;
  gap: 8rpx;
}

.heatmap-dot {
  width: 24rpx;
  height: 24rpx;
  border-radius: 6rpx;
  background-color: rgba(var(--rgb-brand), 0.1);
}

.heat-1 {
  background-color: rgba(var(--rgb-brand), 0.1);
}

.heat-2 {
  background-color: rgba(var(--rgb-brand), 0.2);
}

.heat-3 {
  background-color: rgba(var(--rgb-brand), 0.4);
}

.heat-4 {
  background-color: rgba(var(--rgb-brand), 0.6);
}

.heat-5 {
  background-color: rgba(var(--rgb-brand), 1);
}

.heatmap-footer {
  margin-top: 32rpx;
  padding-top: 32rpx;
  border-top-width: 1rpx;
  border-top-style: solid;
  border-top-color: var(--color-outline-variant);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.legend-text {
  font-size: 20rpx;
  color: var(--color-on-surface-variant);
  font-weight: 600;
}

.legend-dots {
  display: flex;
  gap: 8rpx;
}

.legend-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 6rpx;
}

.heatmap-summary {
  font-size: 20rpx;
  color: var(--color-on-surface-variant);
}

.heatmap-strong {
  color: var(--color-brand);
  font-weight: 800;
}

.hero-card {
  position: relative;
  height: 800rpx;
  border-radius: var(--radius-xl);
  overflow: hidden;
  margin-bottom: 48rpx;
}

.hero-card-img {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}

.hero-card-mask {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, rgba(var(--rgb-black), 0) 35%, rgba(var(--rgb-black), 0.7) 100%);
}

.hero-card-content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 64rpx;
  color: var(--color-on-brand);
}

.hero-tags {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.hero-tag {
  padding: 8rpx 24rpx;
  border-radius: var(--radius-full);
  background-color: rgba(76, 175, 80, 1);
}

.hero-tag-text {
  font-size: 20rpx;
  font-weight: 800;
  letter-spacing: 0.16em;
}

.hero-title2 {
  font-size: 60rpx;
  font-weight: 800;
  margin-bottom: 16rpx;
}

.hero-sub2 {
  font-size: 28rpx;
  color: rgba(var(--rgb-white), 0.8);
}

.grid {
  display: flex;
  flex-direction: column;
  gap: 48rpx;
  padding-bottom: 200rpx;
}

.item-card {
  border-radius: var(--radius-xl);
  overflow: hidden;
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
  background-color: var(--color-surface);
}

.item-top {
  position: relative;
  height: 384rpx;
}

.item-img {
  width: 100%;
  height: 100%;
}

.fav-btn {
  position: absolute;
  right: 32rpx;
  top: 32rpx;
  width: 80rpx;
  height: 80rpx;
  border-radius: var(--radius-full);
  background-color: rgba(var(--rgb-white), 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-body {
  padding: 48rpx;
}

.item-meta {
  font-size: 20rpx;
  font-weight: 800;
  letter-spacing: 0.2em;
  color: var(--color-on-surface-variant);
  margin-bottom: 16rpx;
}

.item-title {
  font-size: var(--fs-16);
  font-weight: 800;
  margin-bottom: 32rpx;
}

.item-foot {
  padding-top: 32rpx;
  border-top-width: 1rpx;
  border-top-style: solid;
  border-top-color: var(--color-outline-variant);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kcal {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.kcal-text {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--color-on-surface-variant);
}
</style>
