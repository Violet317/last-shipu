<script setup lang="ts">
import { computed, ref } from 'vue'
import AccountLayout, { type AccountRouteKey } from '@/components/account/AccountLayout.vue'
import { useProfileStore, type ActivityLevel, type Gender } from '@/stores/profile'
import { canvasToTempFilePathWithLimit, getFileSizeBytes, pathToBase64 } from '@/utils/imageBase64'
import { validateHeightCm, validateNickname, validateWeightKg } from '@/utils/validation'

const active: AccountRouteKey = 'profile'

const store = useProfileStore()

const avatarPreview = computed<string>(() => store.form.avatar200Base64 || store.form.avatar100Base64)
const nickname = computed<string>({
  get: () => store.form.nickname,
  set: (v) => store.setField('nickname', v),
})

const nicknameCount = computed<number>(() => nickname.value.length)

const errNickname = ref<string>('')
const errHeight = ref<string>('')
const errWeight = ref<string>('')

const heightText = computed<string>({
  get: () => (store.form.heightCm == null ? '' : String(store.form.heightCm)),
  set: (v) => store.setField('heightCm', v.trim() ? Number(v) : null),
})

const weightText = computed<string>({
  get: () => (store.form.weightKg == null ? '' : String(store.form.weightKg)),
  set: (v) => store.setField('weightKg', v.trim() ? Number(v) : null),
})

const birthDate = computed<string>({
  get: () => store.form.birthDate,
  set: (v) => store.setField('birthDate', v),
})

const gender = computed<Gender>({
  get: () => store.form.gender,
  set: (v) => store.setField('gender', v),
})

const activityLevel = computed<ActivityLevel>({
  get: () => store.form.activityLevel,
  set: (v) => store.setField('activityLevel', v),
})

const cropVisible = ref<boolean>(false)
const cropSrc = ref<string>('')
const cropping = ref<boolean>(false)
const localFilePath = ref<string>('')
const avatarHint = ref<string>('点击更换（jpg/png，≤500KB）')

function canLeave(): boolean {
  return !store.isDirty
}

function onNicknameBlur(): void {
  const res = validateNickname(nickname.value)
  errNickname.value = res.ok ? '' : res.message ?? '昵称错误'
}

function onHeightBlur(): void {
  if (store.form.heightCm == null) {
    errHeight.value = ''
    return
  }
  const res = validateHeightCm(store.form.heightCm)
  errHeight.value = res.ok ? '' : res.message ?? '身高错误'
}

function onWeightBlur(): void {
  if (store.form.weightKg == null) {
    errWeight.value = ''
    return
  }
  const res = validateWeightKg(store.form.weightKg)
  errWeight.value = res.ok ? '' : res.message ?? '体重错误'
}

function onPickBirthDate(e: unknown): void {
  const v = (e as { detail?: { value?: string } }).detail?.value
  if (typeof v === 'string') birthDate.value = v
}

function onPickGender(e: unknown): void {
  const v = (e as { detail?: { value?: string } }).detail?.value
  const idx = Number(v)
  const list: Gender[] = ['male', 'female', 'other']
  const next = list[idx]
  if (next) gender.value = next
}

function onPickActivity(e: unknown): void {
  const v = (e as { detail?: { value?: string } }).detail?.value
  const idx = Number(v)
  const list: ActivityLevel[] = [1, 2, 3, 4, 5]
  const next = list[idx]
  if (next) activityLevel.value = next
}

async function chooseAvatar(): Promise<void> {
  const res = await uni.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
  const path = res.tempFilePaths[0]
  if (!path) return
  avatarHint.value = '点击更换（jpg/png，≤500KB）'
  try {
    const info = await uni.getImageInfo({ src: path })
    const ext = info.type ? String(info.type).toLowerCase() : ''
    if (ext && ext !== 'jpg' && ext !== 'jpeg' && ext !== 'png') {
      uni.showToast({ title: '仅支持 jpg/png', icon: 'none' })
      return
    }
    const sizeBytes = await getFileSizeBytes(path)
    store.setAvatarFile({
      path,
      sizeBytes,
      name: `avatar.${ext === 'png' ? 'png' : 'jpg'}`,
      type: ext === 'png' ? 'image/png' : 'image/jpeg',
      file: undefined,
    })
  } catch {
    store.setAvatarFile({ path })
  }
  cropSrc.value = path
  localFilePath.value = path
  cropVisible.value = true
}

async function confirmCrop(): Promise<void> {
  if (cropping.value) return
  cropping.value = true
  try {
    const info = await uni.getImageInfo({ src: cropSrc.value })
    const size = Math.min(info.width, info.height)
    const sx = Math.floor((info.width - size) / 2)
    const sy = Math.floor((info.height - size) / 2)

    const ctx200 = uni.createCanvasContext('avatar200')
    ctx200.clearRect(0, 0, 200, 200)
    ctx200.drawImage(cropSrc.value, sx, sy, size, size, 0, 0, 200, 200)
    await new Promise<void>((resolve) => ctx200.draw(false, () => resolve()))

    const ctx100 = uni.createCanvasContext('avatar100')
    ctx100.clearRect(0, 0, 100, 100)
    ctx100.drawImage(cropSrc.value, sx, sy, size, size, 0, 0, 100, 100)
    await new Promise<void>((resolve) => ctx100.draw(false, () => resolve()))

    const r200 = await canvasToTempFilePathWithLimit({
      canvasId: 'avatar200',
      destWidth: 200,
      destHeight: 200,
      fileType: 'jpg',
      maxBytes: 500 * 1024,
      initialQuality: 0.92,
      minQuality: 0.5,
      qualityStep: 0.08,
    })
    const r100 = await canvasToTempFilePathWithLimit({
      canvasId: 'avatar100',
      destWidth: 100,
      destHeight: 100,
      fileType: 'jpg',
      maxBytes: 200 * 1024,
      initialQuality: 0.92,
      minQuality: 0.5,
      qualityStep: 0.08,
    })

    const base200 = await pathToBase64(r200.tempFilePath)
    const base100 = await pathToBase64(r100.tempFilePath)

    store.setAvatar({ avatar200Base64: base200, avatar100Base64: base100 })
    cropVisible.value = false

    if (r200.bytes > 500 * 1024) {
      avatarHint.value = '已裁剪，但压缩后仍可能 > 500KB，请换更小图片'
    }
  } finally {
    cropping.value = false
  }
}

function cancelCrop(): void {
  cropVisible.value = false
}

async function onSave(): Promise<void> {
  onNicknameBlur()
  onHeightBlur()
  onWeightBlur()
  if (errNickname.value || errHeight.value || errWeight.value) return
  await store.save()
}
</script>

<template>
  <AccountLayout :active="active" :can-leave="canLeave">
    <view class="card">
      <text class="h font-headline">个人资料</text>

      <view class="avatar-row">
        <view class="avatar" @click="chooseAvatar">
          <image v-if="avatarPreview" class="avatar-img" mode="aspectFill" :src="avatarPreview" />
          <view v-else class="avatar-ph">
            <uni-icons type="camera" size="22" color="var(--color-on-surface-variant)" />
          </view>
        </view>
        <view class="avatar-meta">
          <text class="avatar-title">头像</text>
          <text class="avatar-sub">{{ avatarHint }}</text>
        </view>
      </view>

      <view class="field">
        <view class="label-row">
          <text class="label">昵称</text>
          <text class="count">{{ nicknameCount }}/16</text>
        </view>
        <input v-model="nickname" class="input" maxlength="16" placeholder="请输入昵称" @blur="onNicknameBlur" />
        <text v-if="errNickname" class="err">{{ errNickname }}</text>
      </view>

      <view class="grid">
        <view class="field">
          <text class="label">身高 (cm)</text>
          <input v-model="heightText" class="input" type="number" placeholder="90–250" @blur="onHeightBlur" />
          <text v-if="errHeight" class="err">{{ errHeight }}</text>
        </view>
        <view class="field">
          <text class="label">体重 (kg)</text>
          <input v-model="weightText" class="input" type="number" placeholder="30–200" @blur="onWeightBlur" />
          <text v-if="errWeight" class="err">{{ errWeight }}</text>
        </view>
      </view>

      <view class="grid">
        <view class="field">
          <text class="label">出生日期</text>
          <picker mode="date" :value="birthDate" @change="onPickBirthDate">
            <view class="picker">{{ birthDate || '选择日期' }}</view>
          </picker>
        </view>
        <view class="field">
          <text class="label">性别</text>
          <picker :range="['male','female','other']" :value="['male','female','other'].indexOf(gender)" @change="onPickGender">
            <view class="picker">{{ gender }}</view>
          </picker>
        </view>
      </view>

      <view class="field">
        <text class="label">日常活动量</text>
        <picker :range="[1,2,3,4,5]" :value="[1,2,3,4,5].indexOf(activityLevel)" @change="onPickActivity">
          <view class="picker">等级 {{ activityLevel }}</view>
        </picker>
      </view>

      <button class="btn" :disabled="store.saving" @click="onSave">
        <text class="btn-text">{{ store.saving ? '保存中...' : '保存' }}</text>
      </button>
    </view>

    <view v-if="cropVisible" class="crop">
      <view class="crop-backdrop" @click="cancelCrop" />
      <view class="crop-panel" @click.stop>
        <text class="crop-title font-headline">裁剪头像</text>
        <view class="crop-preview">
          <image class="crop-img" mode="aspectFit" :src="cropSrc" />
          <view class="crop-mask" />
        </view>
        <view class="crop-actions">
          <button class="ghost" :disabled="cropping" @click="cancelCrop">取消</button>
          <button class="primary" :disabled="cropping" @click="confirmCrop">确认</button>
        </view>
        <canvas canvas-id="avatar200" class="hidden" />
        <canvas canvas-id="avatar100" class="hidden" />
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

.h {
  font-size: 48rpx;
  font-weight: 800;
  margin-bottom: 40rpx;
}

.avatar-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 40rpx;
}

.avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: var(--radius-full);
  overflow: hidden;
  background-color: var(--color-surface-container-low);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
  flex-shrink: 0;
}

.avatar-img {
  width: 100%;
  height: 100%;
}

.avatar-ph {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-title {
  font-size: 28rpx;
  font-weight: 800;
}

.avatar-sub {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--color-on-surface-variant);
}

.field {
  margin-top: 24rpx;
}

.label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.label {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--color-on-surface-variant);
}

.count {
  font-size: 20rpx;
  color: var(--color-outline);
}

.input {
  height: 96rpx;
  margin-top: 12rpx;
  border-radius: 24rpx;
  background-color: var(--color-surface-container-low);
  padding: 0 32rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-on-surface);
}

.picker {
  height: 96rpx;
  margin-top: 12rpx;
  border-radius: 24rpx;
  background-color: var(--color-surface-container-low);
  padding: 0 32rpx;
  display: flex;
  align-items: center;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-on-surface);
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24rpx;
}

.err {
  margin-top: 8rpx;
  color: var(--color-error);
  font-size: 22rpx;
}

.btn {
  margin-top: 48rpx;
  height: 96rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 28rpx;
  font-weight: 800;
  line-height: 96rpx;
}

.btn-text {
  font-size: 28rpx;
  font-weight: 800;
  color: var(--color-on-primary);
}

.crop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
}

.crop-backdrop {
  position: absolute;
  inset: 0;
  background-color: rgba(var(--rgb-black), 0.35);
  backdrop-filter: blur(10px);
}

.crop-panel {
  position: absolute;
  left: 48rpx;
  right: 48rpx;
  top: 20vh;
  border-radius: 32rpx;
  background-color: var(--color-surface);
  padding: 40rpx;
}

.crop-title {
  font-size: 36rpx;
  font-weight: 800;
  margin-bottom: 24rpx;
}

.crop-preview {
  position: relative;
  height: 520rpx;
  border-radius: 24rpx;
  overflow: hidden;
  background-color: var(--color-surface-container-low);
}

.crop-img {
  width: 100%;
  height: 100%;
}

.crop-mask {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(var(--rgb-black), 0) 0 46%, rgba(var(--rgb-black), 0.35) 47% 100%);
}

.crop-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}

.ghost,
.primary {
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

.primary {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
}

.hidden {
  position: absolute;
  left: -9999px;
  top: -9999px;
  width: 1px;
  height: 1px;
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }

  .crop-panel {
    left: 20vw;
    right: 20vw;
  }
}
</style>
