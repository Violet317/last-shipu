<script setup lang="ts">
function openForum(): void {
  uni.navigateTo({ url: '/pages/forum' })
}

function openShop(): void {
  uni.navigateTo({ url: '/pages/shop' })
}
</script>

<template>
  <view class="page">
    <view class="container">
      <view class="head">
        <text class="title font-headline">探索发现</text>
        <text class="subtitle">发现更多烹饪灵感与优质食材。</text>
      </view>

      <view class="cards">
        <view class="card shadow-editorial" @click="openForum">
          <view class="card-top">
            <text class="card-title font-headline">社区论坛</text>
            <text class="card-desc">分享作品、交流技巧、结识同好。</text>
          </view>
          <view class="card-foot">
            <text class="card-cta">进入圈子</text>
            <uni-icons type="right" size="18" color="var(--color-on-surface-variant)" />
          </view>
        </view>

        <view class="card shadow-editorial" @click="openShop">
          <view class="card-top">
            <text class="card-title font-headline">美食商店</text>
            <text class="card-desc">精选食材与专业厨具，一站购齐。</text>
          </view>
          <view class="card-foot">
            <text class="card-cta">逛逛商店</text>
            <uni-icons type="right" size="18" color="var(--color-on-surface-variant)" />
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

.container {
  padding: 64rpx 48rpx 220rpx;
  max-width: 1120px;
  margin: 0 auto;
}

.head {
  margin-bottom: 56rpx;
}

.title {
  font-size: 56rpx;
  font-weight: 800;
  margin-bottom: 16rpx;
}

.subtitle {
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--color-on-surface-variant);
}

.cards {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.card {
  padding: 48rpx;
  border-radius: var(--radius-xl);
  background-color: var(--color-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
}

.card-top {
  margin-bottom: 40rpx;
}

.card-title {
  font-size: 40rpx;
  font-weight: 800;
  margin-bottom: 12rpx;
}

.card-desc {
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--color-on-surface-variant);
}

.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 28rpx;
  border-top-width: 1rpx;
  border-top-style: solid;
  border-top-color: var(--color-outline-variant);
}

.card-cta {
  font-size: 24rpx;
  font-weight: 800;
  color: var(--color-primary);
}
</style>
