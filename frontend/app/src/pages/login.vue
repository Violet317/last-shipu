<script setup lang="ts">
import { ref } from 'vue'
import { guestLogin, loginWithEmail, requestLoginCode, type EmailLoginRequest } from '@/api/user'
import { useUserStore } from '@/stores/user'

const email = ref<string>('')
const code = ref<string>('')

const sending = ref<boolean>(false)
const loading = ref<boolean>(false)

function normalizeCode(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 6)
  if (digits.length <= 3) return digits
  return `${digits.slice(0, 3)}-${digits.slice(3)}`
}

function onCodeInput(e: unknown): void {
  const value = (e as { detail?: { value?: string } }).detail?.value
  code.value = normalizeCode(typeof value === 'string' ? value : '')
}

async function onSendCode(): Promise<void> {
  if (sending.value) return
  const value = email.value.trim()
  if (!value) {
    uni.showToast({ title: '请输入邮箱', icon: 'none' })
    return
  }
  sending.value = true
  try {
    const res = await requestLoginCode({ email: value })
    uni.showToast({ title: res.sent ? '验证码已发送' : '发送失败', icon: 'none' })
  } finally {
    sending.value = false
  }
}

async function onSubmit(): Promise<void> {
  if (loading.value) return
  const emailValue = email.value.trim()
  const codeValue = code.value.replace('-', '')
  if (!emailValue) {
    uni.showToast({ title: '请输入邮箱', icon: 'none' })
    return
  }
  if (codeValue.length !== 6) {
    uni.showToast({ title: '请输入6位验证码', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const body: EmailLoginRequest = {
      email: emailValue,
      code: codeValue,
    }
    const tokens = await loginWithEmail(body)
    const userStore = useUserStore()
    userStore.setTokens(tokens)
    uni.switchTab({ url: '/pages/home' })
  } finally {
    loading.value = false
  }
}

async function onGuest(): Promise<void> {
  if (loading.value) return
  loading.value = true
  try {
    const tokens = await guestLogin()
    const userStore = useUserStore()
    userStore.setTokens(tokens)
    uni.switchTab({ url: '/pages/home' })
  } finally {
    loading.value = false
  }
}

function onOpenAgreement(name: 'terms' | 'privacy'): void {
  uni.showToast({ title: name === 'terms' ? '花园条款' : '隐私理念', icon: 'none' })
}
</script>

<template>
  <view class="page">
    <view class="banner">
      <image
        class="banner-img"
        mode="aspectFill"
        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYwbjul58ccmUIfH8EQ1DbGKiYn-W4lATheuV1A12lXoY6tIj1mnXEcwfwryumntLA6h-rFyARBUuR6SswOzHImljc10NiMwyL9rOYEtwJQfJ7m2JAP450cDtvU70Hf_-3lwVjFMMuxjEtdmRaF5AV8CYIUEUo-DvzXckC8rzDBKeL_ZgixWQN5_-H0ApbJ8euEFao3Vk9IoQPkO-HnpmUB1beOaakge5WlGw0j1GpY0xH5PRwFJGOQSwDcfUfGdrAXlMpzGQWHGEG"
      />
      <view class="banner-mask" />
      <view class="banner-text">
        <text class="banner-title font-headline">用AI赋能，精进厨艺。</text>
      </view>
    </view>

    <view class="panel">
      <view class="panel-inner">
        <view class="panel-head">
          <text class="brand font-headline">美食策展人</text>
          <text class="welcome font-headline">欢迎回来</text>
          <text class="desc">请登录以访问您的专属储藏室。</text>
        </view>

        <view class="field">
          <text class="label">电子邮箱</text>
          <view class="input-wrap">
            <input v-model="email" class="input" placeholder="chef@atelier.com" type="text" />
          </view>
        </view>

        <view class="field field-gap">
          <view class="label-row">
            <text class="label">验证码</text>
            <button class="link" :disabled="sending" @click="onSendCode">{{ sending ? '发送中' : '获取验证码' }}</button>
          </view>
          <view class="input-wrap">
            <input class="input code" :value="code" placeholder="000-000" type="text" @input="onCodeInput" />
          </view>
          <text class="hint">请查看您的收件箱获取6位验证码。</text>
        </view>

        <button class="primary" :disabled="loading" @click="onSubmit">
          <text class="primary-text font-headline">进入食坊</text>
          <uni-icons type="arrow-right" size="18" color="var(--color-on-primary-container)" />
        </button>

        <view class="divider">
          <view class="divider-line" />
          <text class="divider-text">新用户？</text>
          <view class="divider-line" />
        </view>

        <button class="ghost" :disabled="loading" @click="onGuest">
          <uni-icons type="star" size="20" color="var(--color-primary)" />
          <text class="ghost-text">访客登录</text>
        </button>

        <view class="footer">
          <text class="footer-text">
            继续操作即表示您接受我们的
            <text class="footer-link" @click="onOpenAgreement('terms')">花园条款</text>
            并同意我们的
            <text class="footer-link" @click="onOpenAgreement('privacy')">隐私理念</text>。
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: var(--color-surface);
  color: var(--color-on-surface);
}

.banner {
  position: relative;
  height: 520rpx;
  overflow: hidden;
}

.banner-img {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  clip-path: polygon(0 0, 100% 0, 100% 90%, 0 100%);
}

.banner-mask {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, rgba(var(--rgb-black), 0) 45%, rgba(var(--rgb-black), 0.35) 100%);
}

.banner-text {
  position: absolute;
  left: 64rpx;
  right: 64rpx;
  bottom: 80rpx;
}

.banner-title {
  font-size: 72rpx;
  font-weight: 800;
  color: var(--color-on-brand);
  line-height: 1.1;
}

.panel {
  padding: 64rpx 64rpx 96rpx;
}

.panel-inner {
  width: 100%;
}

.panel-head {
  margin-bottom: 72rpx;
}

.brand {
  font-size: 20rpx;
  font-weight: 700;
  letter-spacing: 0.24em;
  color: var(--color-primary);
  margin-bottom: 16rpx;
}

.welcome {
  font-size: 60rpx;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 16rpx;
}

.desc {
  font-size: 28rpx;
  color: var(--color-on-surface-variant);
}

.field {
  margin-bottom: 48rpx;
}

.field-gap {
  margin-bottom: 56rpx;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.label {
  font-size: 20rpx;
  font-weight: 700;
  color: var(--color-on-surface-variant);
  letter-spacing: 0.2em;
}

.link {
  padding: 0;
  background-color: transparent;
  color: var(--color-primary);
  font-size: 20rpx;
  font-weight: 700;
}

.input-wrap {
  margin-top: 12rpx;
  border-radius: var(--radius-xl);
  background-color: var(--color-surface-container);
}

.input {
  height: 96rpx;
  padding: 0 40rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-on-surface);
}

.code {
  letter-spacing: 0.35em;
}

.hint {
  margin-top: 12rpx;
  font-size: 20rpx;
  color: var(--color-outline);
  text-align: right;
}

.primary {
  height: 96rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-primary-container);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  margin-top: 16rpx;
}

.primary-text {
  color: var(--color-on-primary-container);
  font-size: 28rpx;
  font-weight: 800;
}

.divider {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-top: 72rpx;
}

.divider-line {
  flex: 1;
  height: 1rpx;
  background-color: var(--color-outline-variant);
  opacity: 0.3;
}

.divider-text {
  font-size: 20rpx;
  font-weight: 800;
  color: var(--color-outline);
  letter-spacing: 0.08em;
}

.ghost {
  height: 88rpx;
  margin-top: 32rpx;
  border-radius: var(--radius-full);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
  background-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}

.ghost-text {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--color-on-surface);
}

.footer {
  margin-top: 72rpx;
}

.footer-text {
  font-size: 22rpx;
  line-height: 1.6;
  color: var(--color-outline);
}

.footer-link {
  color: var(--color-primary);
  text-decoration: underline;
}
</style>
