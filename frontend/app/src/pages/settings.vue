<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AccountLayout, { type AccountRouteKey } from '@/components/account/AccountLayout.vue'
import { useSettingsStore, type Language } from '@/stores/settings'
import { useThemeStore } from '@/stores/theme'
import { useUserStore } from '@/stores/user'
import { useShortcutsStore } from '@/stores/shortcuts'
import { passwordStrength, validateNewPassword } from '@/utils/validation'

const active: AccountRouteKey = 'settings'
const settingsStore = useSettingsStore()
const themeStore = useThemeStore()
const userStore = useUserStore()
const shortcutsStore = useShortcutsStore()

function canLeave(): boolean {
  return true
}

const themeModeLabel = computed<string>(() => {
  if (themeStore.mode === 'system') return '跟随系统'
  return themeStore.mode === 'dark' ? '深色' : '浅色'
})

function setThemeMode(mode: 'system' | 'light' | 'dark'): void {
  themeStore.setMode(mode)
}

function setLanguage(lang: Language): void {
  settingsStore.setLanguage(lang)
  uni.showToast({ title: '已切换', icon: 'none' })
}

async function clearCache(): Promise<void> {
  const res = await new Promise<UniApp.ShowModalRes>((resolve) => {
    uni.showModal({
      title: '清除缓存',
      content: '确认清除本地缓存？',
      confirmText: '清除',
      cancelText: '取消',
      success: (r) => resolve(r),
      fail: () => resolve({ confirm: false, cancel: true } as UniApp.ShowModalRes),
    })
  })
  if (!res.confirm) return
  settingsStore.clearCache()
}

const pwdVisible = ref<boolean>(false)
const oldPwd = ref<string>('')
const newPwd = ref<string>('')
const confirmPwd = ref<string>('')
const pwdErr = ref<string>('')
const pwdLoading = ref<boolean>(false)

const strength = computed(() => passwordStrength(newPwd.value))

function openPwd(): void {
  pwdVisible.value = true
  oldPwd.value = ''
  newPwd.value = ''
  confirmPwd.value = ''
  pwdErr.value = ''
}

function closePwd(): void {
  pwdVisible.value = false
}

async function submitPwd(): Promise<void> {
  if (pwdLoading.value) return
  pwdErr.value = ''
  if (!oldPwd.value) {
    pwdErr.value = '请输入旧密码'
    return
  }
  const v = validateNewPassword(newPwd.value)
  if (!v.ok) {
    pwdErr.value = v.message ?? '新密码不合法'
    return
  }
  if (newPwd.value !== confirmPwd.value) {
    pwdErr.value = '两次新密码不一致'
    return
  }

  pwdLoading.value = true
  try {
    await new Promise<void>((r) => setTimeout(r, 700))
    uni.showToast({ title: '已修改', icon: 'none' })
    closePwd()
  } finally {
    pwdLoading.value = false
  }
}

onMounted(async () => {
  await shortcutsStore.fetch()
})

const scModalVisible = ref<boolean>(false)
const scEditingId = ref<string>('')
const scTitle = ref<string>('')
const scPrompt = ref<string>('')
const scEnabled = ref<boolean>(true)
const scErr = ref<string>('')
const scSaving = ref<boolean>(false)

function openScCreate(): void {
  scEditingId.value = ''
  scTitle.value = ''
  scPrompt.value = ''
  scEnabled.value = true
  scErr.value = ''
  scModalVisible.value = true
}

function openScEdit(id: string): void {
  const it = shortcutsStore.list.find((x) => x.id === id)
  if (!it) return
  scEditingId.value = id
  scTitle.value = it.title
  scPrompt.value = it.prompt
  scEnabled.value = it.enabled
  scErr.value = ''
  scModalVisible.value = true
}

function closeScModal(): void {
  scModalVisible.value = false
}

async function submitSc(): Promise<void> {
  if (scSaving.value) return
  scErr.value = ''
  if (!scTitle.value.trim()) {
    scErr.value = '请输入标题'
    return
  }
  if (!scPrompt.value.trim()) {
    scErr.value = '请输入模板内容'
    return
  }
  scSaving.value = true
  try {
    if (!scEditingId.value) {
      const r = await shortcutsStore.create({ title: scTitle.value.trim(), prompt: scPrompt.value.trim(), enabled: scEnabled.value })
      if (r) uni.showToast({ title: '已新增', icon: 'none' })
    } else {
      const r = await shortcutsStore.update(scEditingId.value, {
        title: scTitle.value.trim(),
        prompt: scPrompt.value.trim(),
        enabled: scEnabled.value,
      })
      if (r) uni.showToast({ title: '已更新', icon: 'none' })
    }
    scModalVisible.value = false
  } finally {
    scSaving.value = false
  }
}

async function confirmScDelete(id: string): Promise<void> {
  const it = shortcutsStore.list.find((x) => x.id === id)
  if (!it) return
  const res = await new Promise<UniApp.ShowModalRes>((resolve) => {
    uni.showModal({
      title: '删除确认',
      content: `确认删除「${it.title}」？`,
      confirmText: '删除',
      cancelText: '取消',
      success: (r) => resolve(r),
      fail: () => resolve({ confirm: false, cancel: true } as UniApp.ShowModalRes),
    })
  })
  if (!res.confirm) return
  const ok = await shortcutsStore.remove(id)
  if (ok) uni.showToast({ title: '已删除', icon: 'none' })
}
</script>

<template>
  <AccountLayout :active="active" :can-leave="canLeave">
    <view class="card">
      <text class="h font-headline">账号安全</text>
      <view class="row" hover-class="row--hover" @click="openPwd">
        <view class="row-left">
          <uni-icons type="locked" size="18" color="var(--color-primary)" />
          <text class="row-text">修改密码</text>
        </view>
        <uni-icons type="right" size="18" color="var(--color-on-surface-variant)" />
      </view>
    </view>

    <view class="card card-gap">
      <text class="h font-headline">通知设置</text>
      <view class="switch-row">
        <text class="switch-text">运动提醒</text>
        <switch :checked="settingsStore.notifySport" @change="settingsStore.toggle('notifySport')" />
      </view>
      <view class="switch-row">
        <text class="switch-text">饮水提醒</text>
        <switch :checked="settingsStore.notifyWater" @change="settingsStore.toggle('notifyWater')" />
      </view>
      <view class="switch-row">
        <text class="switch-text">成就达成提醒</text>
        <switch :checked="settingsStore.notifyAchievement" @change="settingsStore.toggle('notifyAchievement')" />
      </view>
    </view>

    <view class="card card-gap">
      <text class="h font-headline">隐私设置</text>
      <view class="switch-row">
        <text class="switch-text">允许展示在排行榜</text>
        <switch :checked="settingsStore.privacyLeaderboard" @change="settingsStore.toggle('privacyLeaderboard')" />
      </view>
      <view class="switch-row">
        <text class="switch-text">允许好友查看成就</text>
        <switch :checked="settingsStore.privacyFriendView" @change="settingsStore.toggle('privacyFriendView')" />
      </view>
    </view>

    <view class="card card-gap">
      <text class="h font-headline">通用</text>
      <view class="row">
        <view class="row-left">
          <uni-icons type="font" size="18" color="var(--color-primary)" />
          <text class="row-text">语言</text>
        </view>
        <view class="pill">
          <text class="pill-text" :class="settingsStore.language === 'zh-CN' ? 'pill-text--on' : ''" @click="setLanguage('zh-CN')">
            简体中文
          </text>
          <text class="pill-text" :class="settingsStore.language === 'en' ? 'pill-text--on' : ''" @click="setLanguage('en')">
            English
          </text>
        </view>
      </view>

      <view class="row">
        <view class="row-left">
          <uni-icons type="color" size="18" color="var(--color-primary)" />
          <text class="row-text">主题</text>
        </view>
        <view class="theme">
          <text class="theme-meta">{{ themeModeLabel }}</text>
          <view class="theme-actions">
            <text class="chip" :class="themeStore.mode === 'light' ? 'chip--on' : ''" @click="setThemeMode('light')">浅色</text>
            <text class="chip" :class="themeStore.mode === 'dark' ? 'chip--on' : ''" @click="setThemeMode('dark')">深色</text>
            <text class="chip" :class="themeStore.mode === 'system' ? 'chip--on' : ''" @click="setThemeMode('system')">系统</text>
          </view>
        </view>
      </view>

      <view class="row" hover-class="row--hover" @click="clearCache">
        <view class="row-left">
          <uni-icons type="trash" size="18" color="var(--color-primary)" />
          <text class="row-text">清除缓存</text>
        </view>
        <uni-icons type="right" size="18" color="var(--color-on-surface-variant)" />
      </view>
    </view>

    <view class="card card-gap">
      <view class="card-head">
        <text class="h font-headline">快捷键模板</text>
        <view class="add" hover-class="add--hover" @click="openScCreate">
          <uni-icons type="plus" size="18" color="var(--color-on-surface)" />
        </view>
      </view>

      <view v-if="shortcutsStore.loading" class="empty">
        <text class="empty-text">加载中...</text>
      </view>
      <view v-else-if="shortcutsStore.list.length === 0" class="empty">
        <text class="empty-text">暂无模板</text>
      </view>
      <view v-else class="sc-list">
        <view v-for="it in shortcutsStore.list" :key="it.id" class="sc-item">
          <view class="sc-main" @click="openScEdit(it.id)">
            <text class="sc-title">{{ it.title }}</text>
            <text class="sc-meta">{{ it.enabled ? '启用' : '停用' }}</text>
          </view>
          <view class="sc-actions">
            <view class="sc-btn" hover-class="sc-btn--hover" @click="shortcutsStore.move(it.id, 'up')">
              <uni-icons type="arrow-up" size="16" color="var(--color-on-surface-variant)" />
            </view>
            <view class="sc-btn" hover-class="sc-btn--hover" @click="shortcutsStore.move(it.id, 'down')">
              <uni-icons type="arrow-down" size="16" color="var(--color-on-surface-variant)" />
            </view>
            <view class="sc-btn" hover-class="sc-btn--hover" @click="confirmScDelete(it.id)">
              <uni-icons type="trash" size="16" color="var(--color-on-surface-variant)" />
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="card card-gap">
      <button class="danger" :disabled="!userStore.isAuthed" @click="userStore.clearAuth()">退出登录</button>
    </view>

    <view v-if="pwdVisible" class="modal" @click="closePwd">
      <view class="modal-backdrop" />
      <view class="modal-panel" @click.stop>
        <text class="modal-title font-headline">修改密码</text>
        <view class="field">
          <text class="label">旧密码</text>
          <input v-model="oldPwd" class="input" password />
        </view>
        <view class="field">
          <text class="label">新密码</text>
          <input v-model="newPwd" class="input" password />
          <text class="hint">强度：{{ strength.label }}</text>
        </view>
        <view class="field">
          <text class="label">确认新密码</text>
          <input v-model="confirmPwd" class="input" password />
        </view>
        <text v-if="pwdErr" class="err">{{ pwdErr }}</text>
        <view class="actions">
          <button class="ghost" :disabled="pwdLoading" @click="closePwd">取消</button>
          <button class="btn" :disabled="pwdLoading" @click="submitPwd">{{ pwdLoading ? '提交中...' : '确认' }}</button>
        </view>
      </view>
    </view>

    <view v-if="scModalVisible" class="modal" @click="closeScModal">
      <view class="modal-backdrop" />
      <view class="modal-panel" @click.stop>
        <text class="modal-title font-headline">{{ scEditingId ? '编辑模板' : '新增模板' }}</text>
        <view class="field">
          <text class="label">标题</text>
          <input v-model="scTitle" class="input" maxlength="12" />
        </view>
        <view class="field">
          <text class="label">模板内容</text>
          <textarea v-model="scPrompt" class="textarea" maxlength="300" />
        </view>
        <view class="switch-row">
          <text class="switch-text">启用</text>
          <switch :checked="scEnabled" @change="(e) => (scEnabled = Boolean((e as any).detail.value))" />
        </view>
        <text v-if="scErr" class="err">{{ scErr }}</text>
        <view class="actions">
          <button class="ghost" :disabled="scSaving" @click="closeScModal">取消</button>
          <button class="btn" :disabled="scSaving" @click="submitSc">{{ scSaving ? '保存中...' : '保存' }}</button>
        </view>
      </view>
    </view>
  </AccountLayout>
</template>

<style lang="scss" scoped>
.card {
  padding: 48rpx;
  border-radius: var(--radius-xl);
  background-color: var(--color-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
}

.card-gap {
  margin-top: 32rpx;
}

.h {
  font-size: 40rpx;
  font-weight: 800;
  margin-bottom: 24rpx;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.add {
  width: 80rpx;
  height: 80rpx;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

.add--hover {
  background-color: var(--color-surface-container-low);
}

.row {
  padding: 24rpx 24rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.row--hover {
  background-color: var(--color-surface-container-low);
}

.sc-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.sc-item {
  padding: 20rpx 20rpx;
  border-radius: 24rpx;
  background-color: var(--color-surface-container-low);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.sc-main {
  min-width: 0;
  flex: 1;
}

.sc-title {
  font-size: 28rpx;
  font-weight: 900;
  color: var(--color-on-surface);
}

.sc-meta {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--color-on-surface-variant);
}

.sc-actions {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.sc-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

.sc-btn--hover {
  background-color: rgba(var(--rgb-black), 0.06);
}

.empty {
  padding: 18rpx 0;
}

.empty-text {
  font-size: 24rpx;
  color: var(--color-on-surface-variant);
}

.textarea {
  height: 200rpx;
  border-radius: 24rpx;
  background-color: var(--color-surface-container-low);
  padding: 18rpx 24rpx;
  font-size: 26rpx;
  color: var(--color-on-surface);
}

.row-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.row-text {
  font-size: 28rpx;
  font-weight: 800;
}

.switch-row {
  padding: 24rpx 8rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.switch-text {
  font-size: 28rpx;
  font-weight: 800;
}

.pill {
  display: flex;
  gap: 12rpx;
  padding: 8rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-surface-container-low);
}

.pill-text {
  padding: 10rpx 20rpx;
  border-radius: var(--radius-full);
  font-size: 22rpx;
  font-weight: 800;
  color: var(--color-on-surface-variant);
}

.pill-text--on {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
}

.theme {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12rpx;
}

.theme-meta {
  font-size: 22rpx;
  color: var(--color-on-surface-variant);
}

.theme-actions {
  display: flex;
  gap: 12rpx;
}

.chip {
  padding: 10rpx 18rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-surface-container-low);
  font-size: 22rpx;
  font-weight: 800;
  color: var(--color-on-surface-variant);
}

.chip--on {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
}

.danger {
  height: 96rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-error);
  color: var(--color-on-error);
  font-size: 28rpx;
  font-weight: 800;
  line-height: 96rpx;
}

.modal {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
}

.modal-backdrop {
  position: absolute;
  inset: 0;
  background-color: rgba(var(--rgb-black), 0.35);
  backdrop-filter: blur(10px);
}

.modal-panel {
  position: absolute;
  left: 48rpx;
  right: 48rpx;
  top: 18vh;
  border-radius: 32rpx;
  background-color: var(--color-surface);
  padding: 40rpx;
}

.modal-title {
  font-size: 36rpx;
  font-weight: 800;
  margin-bottom: 24rpx;
}

.field {
  margin-top: 20rpx;
}

.label {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--color-on-surface-variant);
}

.input {
  height: 88rpx;
  margin-top: 12rpx;
  border-radius: 24rpx;
  background-color: var(--color-surface-container-low);
  padding: 0 24rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.hint {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--color-on-surface-variant);
}

.err {
  margin-top: 16rpx;
  font-size: 22rpx;
  color: var(--color-error);
}

.actions {
  margin-top: 24rpx;
  display: flex;
  gap: 16rpx;
}

.ghost,
.btn {
  flex: 1;
  height: 88rpx;
  border-radius: var(--radius-full);
  font-size: 28rpx;
  font-weight: 800;
  line-height: 88rpx;
}

.ghost {
  background-color: transparent;
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
  color: var(--color-on-surface);
}

.btn {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
}
</style>
