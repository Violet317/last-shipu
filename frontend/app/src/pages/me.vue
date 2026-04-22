<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCoreGoalStore } from '@/stores/coreGoal'
import { useProfileStore } from '@/stores/profile'
import { useRecipeStore } from '@/stores/recipe'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const profileStore = useProfileStore()
const coreGoalStore = useCoreGoalStore()
const recipeStore = useRecipeStore()

const nickname = computed<string>(() => userStore.profile?.nickname ?? '伊芙琳 · 索恩')
const intro = computed<string>(() =>
  userStore.profile?.nickname
    ? '专注于地中海融合菜系和时令蔬菜搭配的烹饪爱好者。自2021年起策划健康生活。'
    : '登录后同步目标与历史数据'
)
const recent = computed(() => recipeStore.recent.slice(0, 3))

type MenuKey = 'profile' | 'achievement' | 'feedback' | 'settings' | 'recipe'

function navigateToMenu(key: MenuKey): void {
  const url =
    key === 'profile'
      ? '/pages/profile'
      : key === 'achievement'
        ? '/pages/achievement'
        : key === 'feedback'
          ? '/pages/feedback'
          : key === 'settings'
            ? '/pages/settings'
            : '/pages/recipe'
  uni.navigateTo({ url })
}

const avatarSrc = computed<string>(() => {
  return userStore.profile?.avatarUrl || profileStore.form.avatar100Base64 || profileStore.form.avatar200Base64 || ''
})

const bodySummary = computed<string>(() => {
  const h = profileStore.form.heightCm == null ? '' : `${profileStore.form.heightCm}cm`
  const w = profileStore.form.weightKg == null ? '' : `${profileStore.form.weightKg}kg`
  if (h && w) return `${h} · ${w}`
  return h || w || ''
})

function onLogin(): void {
  uni.navigateTo({ url: '/pages/login' })
}

function onLogout(): void {
  userStore.clearAuth()
  uni.showToast({ title: '已退出', icon: 'none' })
}

function onOpenSettings(): void {
  uni.navigateTo({ url: '/pages/settings' })
}

function openCoreGoal(): void {
  uni.navigateTo({ url: '/pages/coreGoal' })
}

function openRecipe(id: string): void {
  uni.navigateTo({ url: `/pages/recipeDetail?id=${encodeURIComponent(id)}` })
}

function openArchive(): void {
  uni.navigateTo({ url: '/pages/archive' })
}

function fmt(ms: number | undefined): string {
  if (!ms) return ''
  const d = new Date(ms)
  return d.toLocaleString()
}
</script>

<template>
  <view class="page">
    <view class="appbar">
      <view class="appbar-left">
        <view class="appbar-icon" hover-class="appbar-icon--hover" @click="navigateToMenu('profile')">
          <image v-if="avatarSrc" class="appbar-avatar" mode="aspectFill" :src="avatarSrc" />
          <text v-else class="appbar-avatar-text font-headline">{{ nickname.slice(0, 1) }}</text>
        </view>
      </view>
      <text class="appbar-title font-headline">美食主理人</text>
      <view class="appbar-right">
        <view class="appbar-settings" hover-class="appbar-settings--hover" @click="onOpenSettings">
          <uni-icons type="settings" size="20" color="var(--color-on-surface-variant)" />
        </view>
      </view>
    </view>

    <view class="main">
      <view class="hero">
        <view class="hero-avatar">
          <image
            class="hero-avatar-img"
            mode="aspectFill"
            :src="
              avatarSrc ||
              'https://lh3.googleusercontent.com/aida-public/AB6AXuA8AxwCKAnrRf67wGqcDwidIcNlNJl5_pgbsyPnLsRLguAy2_PwbpfYTNqN4KBmIdjgvXf_7E9lHLwiRzjUxnJjRpRBor_c_bgyNEpyvjXgZDm2wX_sUAfS_mOgQxkqtgZWbrXMFy7X9RKn8j4usd0fSyF8w_L909gEShU5dUb0C2H9HAo_KjG380EcwwwxFOrpi9wm4QiVqsqbebeHF3iNg6S0G6CrmSMOAeb8VHkOclo8CG_fKek91YlDu1xa_CIpl1wC39Jivw0z'
            "
          />
          <view class="hero-avatar-mask" />
        </view>

        <view class="hero-content">
          <view class="hero-head">
            <text class="hero-label">策展人资料</text>
            <text class="hero-name font-headline">{{ nickname }}</text>
          </view>
          <text class="hero-desc">{{ intro }}</text>
          <text v-if="bodySummary" class="hero-body">{{ bodySummary }}</text>

          <view class="bento">
            <view class="bento-goal" hover-class="bento-goal--hover" @click="openCoreGoal">
              <view class="bento-goal-head">
                <view class="bento-goal-dot" />
                <text class="bento-goal-label">核心目标</text>
              </view>
              <text class="bento-goal-title">{{ coreGoalStore.title }}</text>
              <text class="bento-goal-sub">{{ coreGoalStore.subtitle }}</text>
            </view>
            <view class="bento-stat">
              <text class="bento-stat-label">连续达成</text>
              <view class="bento-stat-value">
                <text class="bento-stat-num">12</text>
                <text class="bento-stat-unit">天</text>
              </view>
            </view>
            <view class="bento-stat">
              <text class="bento-stat-label">完成度</text>
              <text class="bento-stat-num">85%</text>
            </view>
          </view>

          <view class="hero-actions">
            <button v-if="!userStore.isAuthed" class="hero-btn hero-btn--primary" @click="onLogin">去登录</button>
            <button v-else class="hero-btn hero-btn--ghost" @click="onLogout">退出登录</button>
          </view>
        </view>
      </view>

      <view class="history-section">
        <view class="history-head">
          <view class="history-head-left">
            <text class="history-title font-headline">食谱历史</text>
            <text class="history-subtitle">您最近的烹饪作品</text>
          </view>
          <view class="history-links">
            <text class="history-link" @click="openArchive">食谱记录</text>
          </view>
        </view>

        <view class="history-list">
          <view
            v-for="r in recent"
            :key="r.id"
            class="history-item"
            hover-class="history-item--pressed"
            @click="openRecipe(r.id)"
          >
            <view class="history-thumb">
              <image class="history-thumb-img" mode="aspectFill" :src="r.coverUrl" />
            </view>
            <view class="history-body">
              <text class="history-item-title">{{ r.title }}</text>
              <view class="history-meta">
                <view class="history-meta-left">
                  <uni-icons type="calendar" size="14" color="var(--color-on-surface-variant)" />
                  <text class="history-meta-text">{{ fmt(r.createdAtMs) || '刚刚' }}</text>
                </view>
                <text class="history-chip">{{ r.durationMinutes }}分钟</text>
              </view>
            </view>
            <uni-icons type="right" size="18" color="var(--color-on-surface-variant)" />
          </view>

          <view v-if="recent.length === 0" class="history-empty">
            <text class="history-empty-text">暂无历史，去「创作」生成第一道食谱吧。</text>
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
  color: var(--color-on-surface);
}

.appbar {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: var(--z-header);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 48rpx;
  background-color: rgba(var(--rgb-appbar-bg), 0.8);
  backdrop-filter: blur(16px);
}

.appbar-left,
.appbar-right {
  width: 160rpx;
  display: flex;
  align-items: center;
}

.appbar-right {
  justify-content: flex-end;
}

.appbar-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(var(--rgb-accent-100), 0.5);
  overflow: hidden;
}

.appbar-icon--hover {
  background-color: rgba(var(--rgb-accent-100), 0.7);
}

.appbar-avatar {
  width: 100%;
  height: 100%;
}

.appbar-avatar-text {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--color-on-surface);
}

.appbar-settings {
  width: 80rpx;
  height: 80rpx;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-surface-container-high);
}

.appbar-settings--hover {
  background-color: var(--color-surface-container);
}

.appbar-title {
  font-size: 40rpx;
  font-weight: 800;
  color: var(--color-accent);
  letter-spacing: -0.02em;
}

.main {
  padding: 192rpx 48rpx 220rpx;
  max-width: 1024px;
  margin: 0 auto;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 64rpx;
  margin-bottom: 96rpx;
}

.hero-avatar {
  position: relative;
  width: 384rpx;
  height: 384rpx;
  border-radius: var(--radius-full);
  overflow: hidden;
  box-shadow: 0rpx 2rpx 8rpx rgba(var(--shadow-rgb), 0.06);
}

.hero-avatar-img {
  width: 100%;
  height: 100%;
}

.hero-avatar-mask {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, rgba(var(--rgb-black), 0) 0%, rgba(var(--rgb-black), 0.2) 100%);
}

.hero-content {
  width: 100%;
  text-align: center;
}

.hero-head {
  margin-bottom: 16rpx;
}

.hero-label {
  display: inline-block;
  font-size: 24rpx;
  font-weight: 700;
  letter-spacing: 0.24em;
  color: var(--color-primary);
  margin-bottom: 8rpx;
}

.hero-name {
  font-size: 72rpx;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.hero-desc {
  max-width: 640rpx;
  margin: 0 auto;
  font-size: 28rpx;
  line-height: 1.7;
  color: var(--color-on-surface-variant);
}

.hero-body {
  margin-top: 16rpx;
  font-size: 24rpx;
  font-weight: 800;
  color: var(--color-on-surface-variant);
}

.bento {
  margin-top: 48rpx;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}

.bento-goal {
  grid-column: 1 / span 2;
  padding: 32rpx;
  border-radius: 24rpx;
  background-color: var(--color-surface-container-low);
  border-left-width: 8rpx;
  border-left-style: solid;
  border-left-color: rgba(var(--rgb-primary), 0.3);
}

.bento-goal--hover {
  background-color: var(--color-surface-container);
}

.bento-goal-head {
  display: flex;
  align-items: center;
  gap: 32rpx;
  margin-bottom: 16rpx;
}

.bento-goal-dot {
  width: 24rpx;
  height: 24rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
}

.bento-goal-label {
  font-size: 20rpx;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: var(--color-on-surface-variant);
}

.bento-goal-title {
  font-size: 36rpx;
  font-weight: 800;
  margin-bottom: 8rpx;
}

.bento-goal-sub {
  font-size: 22rpx;
  line-height: 1.6;
  color: var(--color-on-surface-variant);
}

.bento-stat {
  padding: 32rpx;
  border-radius: 24rpx;
  background-color: var(--color-surface-container-low);
}

.bento-stat-label {
  font-size: 20rpx;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: var(--color-on-surface-variant);
  margin-bottom: 8rpx;
}

.bento-stat-value {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}

.bento-stat-num {
  font-size: 40rpx;
  font-weight: 800;
  color: var(--color-secondary);
}

.bento-stat-unit {
  font-size: 24rpx;
  color: var(--color-on-surface-variant);
}

.hero-actions {
  margin-top: 40rpx;
  display: flex;
  justify-content: center;
}

.hero-btn {
  min-width: 280rpx;
  height: 88rpx;
  border-radius: var(--radius-full);
  font-size: 28rpx;
  font-weight: 800;
  line-height: 88rpx;
}

.hero-btn--primary {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
}

.hero-btn--ghost {
  background-color: transparent;
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
  color: var(--color-on-surface);
}

.history-section {
  margin-top: 0;
}

.history-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0 16rpx;
  margin-bottom: 32rpx;
}

.history-links {
  display: flex;
  gap: 20rpx;
}

.history-title {
  font-size: 48rpx;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 8rpx;
}

.history-subtitle {
  font-size: 28rpx;
  color: var(--color-on-surface-variant);
}

.history-link {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--color-primary);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 32rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background-color: var(--color-surface-container-lowest);
  box-shadow: 0rpx 2rpx 8rpx rgba(var(--shadow-rgb), 0.06);
}

.history-item--pressed {
  transform: scale(0.98);
}

.history-thumb {
  width: 128rpx;
  height: 128rpx;
  border-radius: 16rpx;
  overflow: hidden;
}

.history-thumb-img {
  width: 100%;
  height: 100%;
}

.history-body {
  flex: 1;
  min-width: 0;
}

.history-item-title {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--color-on-surface);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-meta {
  margin-top: 8rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.history-meta-left {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.history-meta-text {
  font-size: 24rpx;
  color: var(--color-on-surface-variant);
}

.history-chip {
  font-size: 20rpx;
  font-weight: 700;
  padding: 8rpx 12rpx;
  border-radius: 8rpx;
  color: var(--color-primary);
  background-color: rgba(var(--rgb-primary-container), 0.2);
}

.history-empty {
  padding: 24rpx;
}

.history-empty-text {
  font-size: 28rpx;
  color: var(--color-on-surface-variant);
}

@media (min-width: 768px) {
  .hero {
    flex-direction: row;
    align-items: flex-start;
  }

  .hero-content {
    text-align: left;
  }

  .hero-desc {
    margin: 0;
  }

  .hero-actions {
    justify-content: flex-start;
  }
}
</style>
