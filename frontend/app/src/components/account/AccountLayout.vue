<script setup lang="ts">
export type AccountRouteKey = 'profile' | 'achievement' | 'feedback' | 'settings' | 'recipe'

const props = defineProps<{
  active: AccountRouteKey
  canLeave?: () => boolean | Promise<boolean>
}>()

const titleMap: Record<AccountRouteKey, string> = {
  profile: '个人资料',
  achievement: '个人成就',
  feedback: '反馈',
  settings: '设置',
  recipe: '食谱记录',
}

async function confirmLeaveIfNeeded(): Promise<boolean> {
  if (!props.canLeave) return true
  const ok = await props.canLeave()
  if (ok) return true
  const res = await new Promise<UniApp.ShowModalRes>((resolve) => {
    uni.showModal({
      title: '提示',
      content: '离开将丢失修改',
      confirmText: '离开',
      cancelText: '取消',
      success: (r) => resolve(r),
      fail: () => resolve({ confirm: false, cancel: true } as UniApp.ShowModalRes),
    })
  })
  return Boolean(res.confirm)
}

async function onBack(): Promise<void> {
  const leave = await confirmLeaveIfNeeded()
  if (!leave) return
  uni.navigateBack()
}
</script>

<template>
  <view class="page">
    <view class="appbar">
      <view class="btn" hover-class="btn--hover" @click="onBack">
        <uni-icons type="left" size="20" color="var(--color-on-surface)" />
      </view>
      <text class="title font-headline">{{ titleMap[active] }}</text>
      <view class="btn" />
    </view>

    <view class="layout">
      <slot />
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

.layout {
  padding: 32rpx 48rpx 220rpx;
  max-width: 1200px;
  margin: 0 auto;
}
</style>
