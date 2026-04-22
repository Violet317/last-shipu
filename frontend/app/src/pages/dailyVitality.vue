<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getVitalityToday, type VitalityMetric, type VitalityToday } from '@/api/vitality'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

const loading = ref<boolean>(false)
const error = ref<string>('')
const data = ref<VitalityToday | null>(null)

function onToggleTheme(): void {
  themeStore.toggleDark()
}

const score = computed<number>(() => data.value?.score ?? 0)
const scorePct = computed<number>(() => Math.max(0, Math.min(100, score.value)))
const scoreLabel = computed<string>(() => {
  const s = score.value
  if (s >= 85) return '状态很棒'
  if (s >= 70) return '状态不错'
  if (s >= 55) return '需要加油'
  return '先从一小步开始'
})

function metricPct(m: VitalityMetric): number {
  if (m.key === 'kcalBalance') {
    const v = Math.abs(m.value)
    const p = 100 - Math.min(100, Math.round((v / 600) * 100))
    return p
  }
  if (m.target <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((m.value / m.target) * 100)))
}

function metricHint(m: VitalityMetric): string {
  if (m.key === 'kcalBalance') {
    if (m.value === 0) return '平衡'
    return m.value > 0 ? `+${m.value}${m.unit}` : `${m.value}${m.unit}`
  }
  return `${m.value}${m.unit}`
}

async function fetchData(): Promise<void> {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    data.value = await getVitalityToday()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <view class="page">
    <view class="header">
      <text class="title font-headline">今日活力</text>
      <view class="header-actions">
        <button class="ghost" @click="fetchData">刷新</button>
        <button class="ghost" @click="onToggleTheme">{{ themeStore.isDark ? '浅色' : '深色' }}</button>
      </view>
    </view>

    <view v-if="loading" class="card shadow-editorial">
      <text class="text">加载中...</text>
    </view>

    <view v-else-if="error" class="card shadow-editorial">
      <text class="text">{{ error }}</text>
      <button class="ghost ghost-inline" @click="fetchData">重试</button>
    </view>

    <view v-else-if="!data" class="card shadow-editorial">
      <text class="text">暂无数据</text>
      <button class="ghost ghost-inline" @click="fetchData">重新加载</button>
    </view>

    <view v-else class="stack">
      <view class="hero shadow-editorial">
        <view class="hero-left">
          <text class="hero-title font-headline">{{ scoreLabel }}</text>
          <text class="hero-sub">更新于 {{ new Date(data.updatedAtMs).toLocaleTimeString() }}</text>
        </view>
        <view class="ring">
          <view class="ring-fill" :style="{ height: `${scorePct}%` }" />
          <text class="ring-score">{{ score }}</text>
          <text class="ring-unit">分</text>
        </view>
      </view>

      <view class="grid">
        <view v-for="m in data.metrics" :key="m.key" class="metric shadow-editorial">
          <view class="metric-head">
            <text class="metric-label">{{ m.label }}</text>
            <text class="metric-value">{{ metricHint(m) }}</text>
          </view>
          <view class="bar">
            <view class="bar-fill" :style="{ width: `${metricPct(m)}%` }" />
          </view>
          <text class="metric-sub">目标 {{ m.target }}{{ m.unit }}</text>
        </view>
      </view>

      <view class="card shadow-editorial">
        <view class="card-head">
          <text class="card-title font-headline">近 7 天趋势</text>
          <text class="card-sub">{{ data.trend7d[0]?.date }} ~ {{ data.trend7d[data.trend7d.length - 1]?.date }}</text>
        </view>
        <view class="trend">
          <view v-for="p in data.trend7d" :key="p.date" class="trend-col">
            <view class="trend-bar">
              <view class="trend-bar-fill" :style="{ height: `${Math.max(8, Math.min(100, p.score))}%` }" />
            </view>
            <text class="trend-day">{{ p.date.slice(5) }}</text>
          </view>
        </view>
      </view>

      <view class="card shadow-editorial">
        <text class="card-title font-headline">今日亮点</text>
        <view class="list">
          <view v-for="(t, idx) in data.highlights" :key="idx" class="list-item">
            <text class="dot">•</text>
            <text class="list-text">{{ t }}</text>
          </view>
        </view>
      </view>

      <view class="card shadow-editorial">
        <text class="card-title font-headline">建议</text>
        <view class="list">
          <view v-for="(t, idx) in data.suggestions" :key="idx" class="list-item">
            <text class="dot">•</text>
            <text class="list-text">{{ t }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: var(--color-background);
  padding: 48rpx;
  color: var(--color-on-surface);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 48rpx;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.title {
  font-size: var(--fs-24);
  font-weight: 800;
}

.ghost {
  padding: 0 32rpx;
  height: 72rpx;
  line-height: 72rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
  color: var(--color-on-surface);
  font-size: var(--fs-12);
  font-weight: 700;
}

.ghost-inline {
  margin-top: 24rpx;
}

.text {
  font-size: var(--fs-14);
  color: var(--color-on-surface-variant);
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.card,
.hero,
.metric {
  padding: 40rpx;
  border-radius: var(--radius-xl);
  background-color: var(--color-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
}

.hero-title {
  font-size: 44rpx;
  font-weight: 900;
  color: var(--color-on-surface);
}

.hero-sub {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: var(--color-on-surface-variant);
}

.ring {
  width: 168rpx;
  height: 168rpx;
  border-radius: 44rpx;
  background-color: rgba(var(--rgb-black), 0.04);
  border-width: 1rpx;
  border-style: solid;
  border-color: rgba(var(--rgb-black), 0.08);
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ring-fill {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(var(--rgb-primary-container), 0.8);
}

.ring-score {
  font-size: 52rpx;
  font-weight: 900;
  color: var(--color-on-surface);
  z-index: 1;
}

.ring-unit {
  margin-left: 8rpx;
  font-size: 22rpx;
  font-weight: 800;
  color: var(--color-on-surface-variant);
  z-index: 1;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.metric-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16rpx;
}

.metric-label {
  font-size: 24rpx;
  font-weight: 900;
  color: var(--color-on-surface);
}

.metric-value {
  font-size: 24rpx;
  font-weight: 900;
  color: var(--color-primary);
}

.bar {
  margin-top: 16rpx;
  height: 16rpx;
  border-radius: var(--radius-full);
  background-color: rgba(var(--rgb-black), 0.06);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
}

.metric-sub {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: var(--color-on-surface-variant);
}

.card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: 900;
  color: var(--color-on-surface);
}

.card-sub {
  font-size: 22rpx;
  color: var(--color-on-surface-variant);
}

.trend {
  display: flex;
  justify-content: space-between;
  gap: 14rpx;
}

.trend-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.trend-bar {
  width: 100%;
  height: 160rpx;
  border-radius: 20rpx;
  background-color: rgba(var(--rgb-black), 0.06);
  overflow: hidden;
  display: flex;
  align-items: flex-end;
}

.trend-bar-fill {
  width: 100%;
  background-color: rgba(var(--rgb-primary-container), 0.8);
}

.trend-day {
  font-size: 20rpx;
  font-weight: 800;
  color: var(--color-on-surface-variant);
}

.list {
  margin-top: 18rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.list-item {
  display: flex;
  gap: 12rpx;
  align-items: flex-start;
}

.dot {
  font-size: 28rpx;
  color: var(--color-primary);
  line-height: 1;
}

.list-text {
  flex: 1;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--color-on-surface);
}
</style>
