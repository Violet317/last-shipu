<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { addMealItem, deleteMealItem, getNutritionToday, type MealType, type NutritionDay, type MealItem, type Macro } from '@/api/nutrition'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()

const loading = ref<boolean>(false)
const error = ref<string>('')
const day = ref<NutritionDay | null>(null)

function pct(v: number, t: number): number {
  if (t <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((v / t) * 100)))
}

function sum(items: MealItem[]): Macro {
  return items.reduce<Macro>(
    (acc, it) => ({
      kcal: acc.kcal + it.kcal,
      protein: acc.protein + it.protein,
      carbs: acc.carbs + it.carbs,
      fat: acc.fat + it.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

const targets = computed(() => day.value?.targets ?? { kcal: 2200, protein: 80, carbs: 250, fat: 60 })
const total = computed(() => day.value?.total ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 })
const achieved = computed<number>(() => {
  const t = targets.value
  const p = Math.round((pct(total.value.kcal, t.kcal) + pct(total.value.protein, t.protein) + pct(total.value.carbs, t.carbs) + pct(total.value.fat, t.fat)) / 4)
  return Math.max(0, Math.min(100, p))
})

const nextMealSuggestion = computed<string>(() => {
  const t = targets.value
  const leftKcal = Math.max(0, t.kcal - total.value.kcal)
  const leftP = Math.max(0, t.protein - total.value.protein)
  const leftC = Math.max(0, t.carbs - total.value.carbs)
  const leftF = Math.max(0, t.fat - total.value.fat)

  const parts: string[] = []
  if (leftP > 10) parts.push('优先补蛋白')
  if (leftKcal > 600) parts.push('热量缺口较大')
  if (leftC > 60) parts.push('适当补碳水')
  if (leftF > 15) parts.push('油脂可少量补充')

  const base = parts.length > 0 ? parts.join('，') : '维持即可'
  return `下一餐建议：${base}（剩余约 ${leftKcal}kcal / 蛋白${Math.round(leftP)}g / 碳水${Math.round(leftC)}g / 脂肪${Math.round(leftF)}g）`
})

async function fetchDay(): Promise<void> {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    day.value = await getNutritionToday()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function onBack(): void {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  uni.switchTab({ url: '/pages/home' })
}

function mealLabel(m: MealType): string {
  return m === 'breakfast' ? '早餐' : m === 'lunch' ? '午餐' : '晚餐'
}

const modalVisible = ref<boolean>(false)
const modalMeal = ref<MealType>('breakfast')
const name = ref<string>('')
const kcal = ref<string>('')
const protein = ref<string>('')
const carbs = ref<string>('')
const fat = ref<string>('')
const saving = ref<boolean>(false)
const formErr = ref<string>('')

function openAdd(meal: MealType): void {
  if (!day.value) return
  modalMeal.value = meal
  name.value = ''
  kcal.value = ''
  protein.value = ''
  carbs.value = ''
  fat.value = ''
  formErr.value = ''
  modalVisible.value = true
}

function closeAdd(): void {
  modalVisible.value = false
}

function parseNum(v: string): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, n)
}

async function submitAdd(): Promise<void> {
  if (!day.value) return
  if (saving.value) return
  formErr.value = ''
  if (!name.value.trim()) {
    formErr.value = '请输入食物名称'
    return
  }
  saving.value = true
  try {
    await addMealItem({
      date: day.value.date,
      meal: modalMeal.value,
      name: name.value.trim(),
      kcal: parseNum(kcal.value),
      protein: parseNum(protein.value),
      carbs: parseNum(carbs.value),
      fat: parseNum(fat.value),
    })
    await fetchDay()
    modalVisible.value = false
    uni.showToast({ title: '已添加', icon: 'none' })
  } finally {
    saving.value = false
  }
}

async function removeItem(meal: MealType, it: MealItem): Promise<void> {
  if (!day.value) return
  const res = await new Promise<UniApp.ShowModalRes>((resolve) => {
    uni.showModal({
      title: '删除确认',
      content: `删除「${it.name}」？`,
      confirmText: '删除',
      cancelText: '取消',
      success: (r) => resolve(r),
      fail: () => resolve({ confirm: false, cancel: true } as UniApp.ShowModalRes),
    })
  })
  if (!res.confirm) return
  await deleteMealItem(day.value.date, meal, it.id)
  await fetchDay()
  uni.showToast({ title: '已删除', icon: 'none' })
}

function goAiWithSuggestion(): void {
  chatStore.setDraft(nextMealSuggestion.value)
  uni.switchTab({ url: '/pages/aiCreate' })
}

onMounted(fetchDay)
</script>

<template>
  <view class="page">
    <view class="header">
      <view class="back" hover-class="back--hover" @click="onBack">
        <uni-icons type="left" size="20" color="var(--color-on-surface)" />
      </view>
      <text class="title font-headline">今日已摄入营养统计</text>
      <view class="actions">
        <view class="ghost" hover-class="ghost--hover" @click="fetchDay">刷新</view>
      </view>
    </view>

    <scroll-view class="content" scroll-y>
      <view v-if="loading" class="card shadow-editorial">
        <text class="muted">加载中...</text>
      </view>
      <view v-else-if="error" class="card shadow-editorial">
        <text class="muted">{{ error }}</text>
        <view class="ghost ghost-inline" hover-class="ghost--hover" @click="fetchDay">重试</view>
      </view>

      <view v-else-if="day" class="stack">
        <view class="card shadow-editorial">
          <view class="card-head">
            <text class="card-title font-headline">今日摄入营养统计</text>
            <view class="badge">
              <text class="badge-text">已达成 {{ achieved }}%</text>
            </view>
          </view>

          <view class="stats">
            <view class="stat">
              <view class="stat-row">
                <text class="stat-label">热量</text>
                <text class="stat-value">{{ total.kcal }} / {{ targets.kcal }} kcal</text>
              </view>
              <view class="bar"><view class="bar-fill" :style="{ width: `${pct(total.kcal, targets.kcal)}%` }" /></view>
            </view>
            <view class="stat">
              <view class="stat-row">
                <text class="stat-label">蛋白质</text>
                <text class="stat-value">{{ total.protein }} / {{ targets.protein }} g</text>
              </view>
              <view class="bar"><view class="bar-fill" :style="{ width: `${pct(total.protein, targets.protein)}%` }" /></view>
            </view>
            <view class="stat">
              <view class="stat-row">
                <text class="stat-label">碳水</text>
                <text class="stat-value">{{ total.carbs }} / {{ targets.carbs }} g</text>
              </view>
              <view class="bar"><view class="bar-fill" :style="{ width: `${pct(total.carbs, targets.carbs)}%` }" /></view>
            </view>
            <view class="stat">
              <view class="stat-row">
                <text class="stat-label">脂肪</text>
                <text class="stat-value">{{ total.fat }} / {{ targets.fat }} g</text>
              </view>
              <view class="bar"><view class="bar-fill" :style="{ width: `${pct(total.fat, targets.fat)}%` }" /></view>
            </view>
          </view>
        </view>

        <view class="card shadow-editorial">
          <view class="card-head">
            <text class="card-title font-headline">早午晚餐记录</text>
            <text class="muted">{{ day.date }}</text>
          </view>

          <view class="meal-grid">
            <view v-for="m in (['breakfast','lunch','dinner'] as const)" :key="m" class="meal">
              <view class="meal-head">
                <text class="meal-title">{{ mealLabel(m) }}</text>
                <view class="add" hover-class="add--hover" @click="openAdd(m)">
                  <uni-icons type="plus" size="18" color="var(--color-on-surface)" />
                </view>
              </view>

              <view v-if="day.records[m].items.length === 0" class="meal-empty">
                <text class="muted">暂无记录</text>
              </view>
              <view v-else class="meal-list">
                <view v-for="it in day.records[m].items" :key="it.id" class="meal-item">
                  <view class="meal-item-main">
                    <text class="meal-item-name">{{ it.name }}</text>
                    <text class="meal-item-meta">{{ it.kcal }}kcal · P{{ it.protein }} C{{ it.carbs }} F{{ it.fat }}</text>
                  </view>
                  <view class="trash" hover-class="trash--hover" @click="removeItem(m, it)">
                    <uni-icons type="trash" size="16" color="var(--color-on-surface-variant)" />
                  </view>
                </view>
              </view>

              <view class="meal-foot">
                <text class="muted">小计 {{ sum(day.records[m].items).kcal }}kcal</text>
              </view>
            </view>
          </view>
        </view>

        <view class="card shadow-editorial">
          <view class="card-head">
            <text class="card-title font-headline">每周摄入统计</text>
            <text class="muted">近 7 天</text>
          </view>

          <view class="trend">
            <view v-for="p in day.weekly" :key="p.date" class="trend-col">
              <view class="trend-bar">
                <view class="trend-bar-fill" :style="{ height: `${Math.max(8, pct(p.total.kcal, targets.kcal))}%` }" />
              </view>
              <text class="trend-day">{{ p.date.slice(5) }}</text>
            </view>
          </view>
        </view>

        <view class="card shadow-editorial">
          <view class="card-head">
            <text class="card-title font-headline">下一餐建议</text>
            <view class="ghost ghost-inline" hover-class="ghost--hover" @click="goAiWithSuggestion">去创作</view>
          </view>
          <text class="suggest">{{ nextMealSuggestion }}</text>
        </view>
      </view>
    </scroll-view>

    <view v-if="modalVisible" class="modal" @click="closeAdd">
      <view class="modal-backdrop" />
      <view class="modal-panel" @click.stop>
        <text class="modal-title font-headline">添加{{ mealLabel(modalMeal) }}</text>

        <view class="field">
          <text class="label">食物名称</text>
          <input v-model="name" class="input" maxlength="30" />
        </view>

        <view class="row">
          <view class="field field-half">
            <text class="label">热量(kcal)</text>
            <input v-model="kcal" class="input" type="number" />
          </view>
          <view class="field field-half">
            <text class="label">蛋白(g)</text>
            <input v-model="protein" class="input" type="number" />
          </view>
        </view>

        <view class="row">
          <view class="field field-half">
            <text class="label">碳水(g)</text>
            <input v-model="carbs" class="input" type="number" />
          </view>
          <view class="field field-half">
            <text class="label">脂肪(g)</text>
            <input v-model="fat" class="input" type="number" />
          </view>
        </view>

        <text v-if="formErr" class="err">{{ formErr }}</text>

        <view class="modal-actions">
          <button class="ghost-btn" :disabled="saving" @click="closeAdd">取消</button>
          <button class="primary-btn" :disabled="saving" @click="submitAdd">{{ saving ? '保存中...' : '保存' }}</button>
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

.header {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  height: 112rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
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
  background-color: rgba(var(--rgb-black), 0.05);
}

.title {
  flex: 1;
  font-size: 32rpx;
  font-weight: 900;
}

.actions {
  display: flex;
  align-items: center;
}

.ghost {
  height: 72rpx;
  padding: 0 28rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 900;
  color: var(--color-on-surface);
}

.ghost--hover {
  background-color: var(--color-surface-container-low);
}

.ghost-inline {
  height: 64rpx;
  padding: 0 20rpx;
}

.content {
  padding: 144rpx 48rpx 96rpx;
  min-height: 100vh;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.card {
  padding: 40rpx;
  border-radius: var(--radius-xl);
  background-color: var(--color-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
}

.card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.card-title {
  font-size: 36rpx;
  font-weight: 900;
}

.muted {
  font-size: 22rpx;
  color: var(--color-on-surface-variant);
}

.badge {
  padding: 10rpx 18rpx;
  border-radius: var(--radius-full);
  background-color: rgba(var(--rgb-primary-container), 0.24);
  border-width: 1rpx;
  border-style: solid;
  border-color: rgba(var(--rgb-primary-container), 0.32);
}

.badge-text {
  font-size: 22rpx;
  font-weight: 900;
  color: var(--color-primary);
}

.stats {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.stat-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.stat-label {
  font-size: 26rpx;
  font-weight: 900;
}

.stat-value {
  font-size: 26rpx;
  font-weight: 900;
  color: var(--color-on-surface-variant);
}

.bar {
  margin-top: 12rpx;
  height: 18rpx;
  border-radius: var(--radius-full);
  background-color: rgba(var(--rgb-black), 0.06);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
}

.meal-grid {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.meal {
  padding: 24rpx;
  border-radius: 28rpx;
  background-color: rgba(var(--rgb-black), 0.04);
}

.meal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.meal-title {
  font-size: 28rpx;
  font-weight: 900;
}

.add {
  width: 72rpx;
  height: 72rpx;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

.add--hover {
  background-color: rgba(var(--rgb-black), 0.06);
}

.meal-empty {
  padding: 18rpx 0;
}

.meal-list {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.meal-item {
  padding: 16rpx 16rpx;
  border-radius: 24rpx;
  background-color: var(--color-surface);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.meal-item-main {
  min-width: 0;
  flex: 1;
}

.meal-item-name {
  font-size: 26rpx;
  font-weight: 900;
}

.meal-item-meta {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--color-on-surface-variant);
}

.trash {
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

.trash--hover {
  background-color: rgba(var(--rgb-black), 0.05);
}

.meal-foot {
  margin-top: 14rpx;
  display: flex;
  justify-content: flex-end;
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

.suggest {
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--color-on-surface);
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
  top: 12vh;
  border-radius: 32rpx;
  background-color: var(--color-surface);
  padding: 40rpx;
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
}

.modal-title {
  font-size: 36rpx;
  font-weight: 900;
}

.field {
  margin-top: 24rpx;
}

.row {
  display: flex;
  gap: 16rpx;
}

.field-half {
  flex: 1;
}

.label {
  font-size: 22rpx;
  color: var(--color-on-surface-variant);
  margin-bottom: 10rpx;
}

.input {
  height: 88rpx;
  border-radius: 24rpx;
  background-color: var(--color-surface-container-low);
  padding: 0 24rpx;
  font-size: 26rpx;
  color: var(--color-on-surface);
}

.err {
  margin-top: 16rpx;
  font-size: 22rpx;
  color: var(--color-danger);
}

.modal-actions {
  margin-top: 32rpx;
  display: flex;
  gap: 16rpx;
}

.ghost-btn,
.primary-btn {
  flex: 1;
  height: 88rpx;
  border-radius: var(--radius-full);
  font-size: 28rpx;
  font-weight: 900;
  line-height: 88rpx;
}

.ghost-btn {
  background-color: transparent;
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
  color: var(--color-on-surface);
}

.primary-btn {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
}
</style>

