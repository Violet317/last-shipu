<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { InventoryCategory, InventoryItem } from '@/api/inventory'
import { useChatStore } from '@/stores/chat'
import { useInventoryStore } from '@/stores/inventory'

const active = ref<InventoryCategory>('veg')
const input = ref<string>('')
const deleteMode = ref<boolean>(false)
const pendingDeleteIds = ref<string[]>([])

const chatStore = useChatStore()
const inventoryStore = useInventoryStore()

const topHeightPx = ref<number>(260)
const windowHeightPx = ref<number>(0)

const categoryLabel = computed<string>(() => (active.value === 'veg' ? '蔬菜' : active.value === 'meat' ? '肉类' : '厨具'))

const emojiMap: Record<string, string> = {
  土豆: '🥔',
  胡萝卜: '🥕',
  花菜: '🥦',
  西兰花: '🥦',
  西葫芦: '🥒',
  黄瓜: '🥒',
  番茄: '🍅',
  洋葱: '🧅',
  茄子: '🍆',
  菌菇: '🍄',
  菠菜: '🥬',
  生菜: '🥬',
  紫甘蓝: '🥬',
  白菜: '🥬',
  包菜: '🥬',
  玉米: '🌽',
  南瓜: '🎃',
  芦笋: '🥬',
  秋葵: '🥬',
  四季豆: '🫛',
  豌豆: '🫛',
  豆腐: '🧊',
  鸡胸肉: '🍗',
  鸡腿: '🍗',
  鸡翅: '🍗',
  牛里脊: '🥩',
  牛腩: '🥩',
  猪里脊: '🥩',
  五花肉: '🥓',
  火腿: '🍖',
  香肠: '🌭',
  鸡蛋: '🥚',
  虾仁: '🦐',
  鳕鱼: '🐟',
  三文鱼: '🐟',
  龙利鱼: '🐟',
  鱿鱼: '🦑',
  平底锅: '🍳',
  炒锅: '🍳',
  汤锅: '🥘',
  蒸锅: '♨️',
  压力锅: '⏲️',
  电饭煲: '🍚',
  空气炸锅: '🍟',
  烤箱: '🔥',
  刀具: '🔪',
  砧板: '🪵',
}

function emojiOf(name: string, category: InventoryCategory): string {
  const v = emojiMap[name]
  if (v) return v
  return category === 'veg' ? '🥬' : category === 'meat' ? '🥩' : '🍳'
}

const filtered = computed<InventoryItem[]>(() => {
  const k = input.value.trim().toLowerCase()
  const list = inventoryStore.byCategory(active.value)
  if (!k) return list
  return list.filter((x) => x.nameZh.includes(k) || x.nameEn.toLowerCase().includes(k))
})

function isSelected(item: InventoryItem): boolean {
  if (item.category === 'tool') return chatStore.selectedTools.includes(item.nameZh)
  return chatStore.selectedIngredients.includes(item.nameZh)
}

function toggle(item: InventoryItem): void {
  if (item.category === 'tool') {
    chatStore.toggleTool(item.nameZh)
    return
  }
  chatStore.toggleIngredient(item.nameZh)
}

function unselectIfSelected(item: InventoryItem): void {
  if (item.category === 'tool') {
    if (chatStore.selectedTools.includes(item.nameZh)) chatStore.toggleTool(item.nameZh)
    return
  }
  if (chatStore.selectedIngredients.includes(item.nameZh)) chatStore.toggleIngredient(item.nameZh)
}

function removeSelectedIngredient(name: string): void {
  chatStore.toggleIngredient(name)
}

function removeSelectedTool(name: string): void {
  chatStore.toggleTool(name)
}

function onStartCreate(): void {
  if (chatStore.selectedIngredients.length === 0) {
    uni.showToast({ title: '请先选择食材', icon: 'none' })
    return
  }
  uni.switchTab({ url: '/pages/aiCreate' })
}

function startDeleteMode(): void {
  deleteMode.value = true
  pendingDeleteIds.value = []
}

function cancelDeleteMode(): void {
  deleteMode.value = false
  pendingDeleteIds.value = []
}

function togglePendingDelete(id: string): void {
  if (pendingDeleteIds.value.includes(id)) {
    pendingDeleteIds.value = pendingDeleteIds.value.filter((x) => x !== id)
    return
  }
  pendingDeleteIds.value = [...pendingDeleteIds.value, id]
}

async function confirmDelete(): Promise<void> {
  if (pendingDeleteIds.value.length === 0) {
    uni.showToast({ title: '请选择要删除的条目', icon: 'none' })
    return
  }
  const count = pendingDeleteIds.value.length
  const res = await new Promise<UniApp.ShowModalRes>((resolve) => {
    uni.showModal({
      title: '删除确认',
      content: `确认删除 ${count} 个条目？`,
      confirmText: '删除',
      cancelText: '取消',
      success: (r) => resolve(r),
      fail: () => resolve({ confirm: false, cancel: true } as UniApp.ShowModalRes),
    })
  })
  if (!res.confirm) return

  const ids = pendingDeleteIds.value.slice()
  let okCount = 0
  for (const id of ids) {
    const item = inventoryStore.items.find((x) => x.id === id)
    const ok = await inventoryStore.remove(id)
    if (!ok) continue
    if (item) unselectIfSelected(item)
    okCount += 1
  }
  uni.showToast({ title: okCount > 0 ? '已删除' : '未删除', icon: 'none' })
  cancelDeleteMode()
}

async function addFromInput(): Promise<void> {
  const name = input.value.trim()
  if (!name) {
    uni.showToast({ title: '请输入名称', icon: 'none' })
    return
  }
  const existed = inventoryStore.byCategory(active.value).some((x) => x.nameZh === name)
  if (existed) {
    uni.showToast({ title: '已存在', icon: 'none' })
    return
  }
  const created = await inventoryStore.create({
    category: active.value,
    nameZh: name,
    nameEn: name,
    kcalPer100g: 0,
    unit: active.value === 'tool' ? 'pcs' : 'g',
    thumbnailUrl: '/static/images/design/screen.png',
  })
  if (!created) return
  input.value = ''
  toggle(created)
  uni.showToast({ title: '已添加', icon: 'none' })
}

const selectedIngredients = computed<Array<{ name: string; icon: string }>>(() => {
  return chatStore.selectedIngredients.map((name) => ({ name, icon: emojiOf(name, 'veg') }))
})

const selectedTools = computed<Array<{ name: string; icon: string }>>(() => {
  return chatStore.selectedTools.map((name) => ({ name, icon: emojiOf(name, 'tool') }))
})

const contentHeightStyle = computed(() => {
  const h = Math.max(0, windowHeightPx.value - topHeightPx.value)
  return { height: `${h}px` }
})

async function measureTop(): Promise<void> {
  await nextTick()
  const sys = uni.getSystemInfoSync() as unknown as { windowHeight?: number }
  windowHeightPx.value = Number(sys.windowHeight ?? 0)
  await new Promise<void>((resolve) => {
    uni.createSelectorQuery()
      .select('.top')
      .boundingClientRect((r) => {
        const rect = r as unknown as { height?: number } | null
        const cap = typeof (uni as unknown as { upx2px?: (v: number) => number }).upx2px === 'function' ? (uni as unknown as { upx2px: (v: number) => number }).upx2px(560) : 360
        if (rect && typeof rect.height === 'number') topHeightPx.value = Math.min(rect.height, cap)
        resolve()
      })
      .exec()
  })
}

onMounted(async () => {
  await inventoryStore.fetch()
  await measureTop()
})

watch(
  () => [active.value, chatStore.selectedCount, deleteMode.value],
  async () => {
    await measureTop()
  },
)
</script>

<template>
  <view class="page">
    <view class="top">
      <view class="tabs">
        <view class="tab" :class="active === 'veg' ? 'tab--on' : ''" @click="active = 'veg'">蔬菜</view>
        <view class="tab" :class="active === 'meat' ? 'tab--on' : ''" @click="active = 'meat'">肉类</view>
        <view class="tab" :class="active === 'tool' ? 'tab--on' : ''" @click="active = 'tool'">厨具</view>
      </view>

      <view class="input-row">
        <uni-icons type="compose" size="18" color="var(--color-outline)" />
        <input
          v-model="input"
          class="input"
          :placeholder="`输入没有的${categoryLabel}，回车添加`"
          confirm-type="done"
          @confirm="addFromInput"
        />
        <view class="add" hover-class="add--hover" @click="addFromInput">
          <uni-icons type="plus" size="18" color="var(--color-on-surface)" />
        </view>
      </view>

      <view class="go-row">
        <button v-if="!deleteMode" class="go" :disabled="chatStore.selectedIngredients.length === 0" hover-class="go--hover" @click="onStartCreate">
          开始创作
        </button>
        <button v-if="!deleteMode" class="del" hover-class="del--hover" @click="startDeleteMode">删除食材</button>

        <button v-if="deleteMode" class="del del--danger" :disabled="pendingDeleteIds.length === 0" hover-class="del--hover" @click="confirmDelete">
          确定删除 ({{ pendingDeleteIds.length }})
        </button>
        <button v-if="deleteMode" class="ghost" hover-class="ghost--hover" @click="cancelDeleteMode">取消</button>
      </view>

      <view class="selected">
        <view class="selected-head">
          <text class="selected-title">当前选择 ({{ chatStore.selectedCount }})</text>
        </view>

        <view class="selected-row">
          <view v-if="chatStore.selectedCount === 0" class="selected-empty">
            <text class="selected-empty-text">点下方图标添加「家里有的」</text>
          </view>

          <view v-else class="selected-wrap">
            <view class="selected-chips">
              <view v-for="it in selectedIngredients" :key="`ing_${it.name}`" class="chip" hover-class="chip--hover" @click="removeSelectedIngredient(it.name)">
                <text class="chip-emoji">{{ it.icon }}</text>
                <text class="chip-text">{{ it.name }}</text>
                <uni-icons type="closeempty" size="14" color="var(--color-on-surface-variant)" />
              </view>
              <view v-for="it in selectedTools" :key="`tool_${it.name}`" class="chip chip--tool" hover-class="chip--hover" @click="removeSelectedTool(it.name)">
                <text class="chip-emoji">{{ it.icon }}</text>
                <text class="chip-text">{{ it.name }}</text>
                <uni-icons type="closeempty" size="14" color="var(--color-on-surface-variant)" />
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <scroll-view class="content" scroll-y :style="contentHeightStyle">
      <view class="section-title">
        <text class="section-title-text">{{ categoryLabel }}（点图标表示家里有）</text>
        <text class="section-title-sub">{{ deleteMode ? '点选要删除的条目' : '可输入添加' }}</text>
      </view>

      <view v-if="inventoryStore.loading" class="hint">
        <text class="hint-text">加载中...</text>
      </view>
      <view v-else-if="inventoryStore.error" class="hint">
        <text class="hint-text">{{ inventoryStore.error }}</text>
      </view>
      <view v-else-if="filtered.length === 0" class="hint">
        <text class="hint-text">暂无条目，试试上方输入添加</text>
      </view>

      <view v-else class="grid">
        <view
          v-for="it in filtered"
          :key="it.id"
          class="icon-item"
          :class="deleteMode ? (pendingDeleteIds.includes(it.id) ? 'icon-item--del' : '') : (isSelected(it) ? 'icon-item--on' : '')"
          hover-class="icon-item--hover"
          @click="deleteMode ? togglePendingDelete(it.id) : toggle(it)"
        >
          <text class="emoji">{{ emojiOf(it.nameZh, it.category) }}</text>
          <text class="text">{{ it.nameZh }}</text>
        </view>
      </view>

      <view class="spacer" />
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  height: 100vh;
  background-color: var(--color-background);
  color: var(--color-on-surface);
}

.top {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: var(--z-header);
  padding: 24rpx 48rpx 20rpx;
  background-color: rgba(var(--rgb-appbar-bg), 0.92);
  backdrop-filter: blur(18px);
  border-bottom-width: 1rpx;
  border-bottom-style: solid;
  border-bottom-color: rgba(var(--rgb-black), 0.06);
  max-height: 560rpx;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

.tabs {
  display: flex;
  gap: 16rpx;
}

.tab {
  flex: 1;
  height: 72rpx;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 900;
  color: var(--color-on-surface-variant);
  background-color: rgba(var(--rgb-black), 0.04);
}

.tab--on {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
}

.input-row {
  margin-top: 16rpx;
  height: 88rpx;
  border-radius: var(--radius-full);
  background-color: rgba(var(--rgb-black), 0.04);
  display: flex;
  align-items: center;
  padding: 0 20rpx;
  gap: 14rpx;
}

.input {
  flex: 1;
  height: 88rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: var(--color-on-surface);
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

.go-row {
  margin-top: 14rpx;
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
}

.selected {
  margin-top: 16rpx;
  padding: 18rpx 20rpx;
  border-radius: 28rpx;
  background-color: rgba(var(--rgb-black), 0.04);
}

.selected-head {
  display: flex;
  align-items: center;
}

.selected-title {
  font-size: 24rpx;
  font-weight: 900;
  color: var(--color-on-surface);
}

.selected-row {
  margin-top: 14rpx;
  min-height: 72rpx;
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.go {
  height: 64rpx;
  padding: 0 20rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 24rpx;
  font-weight: 900;
  line-height: 64rpx;
}

.go[disabled] {
  opacity: 0.45;
}

.go--hover {
  opacity: 0.9;
}

.del,
.ghost {
  height: 64rpx;
  padding: 0 20rpx;
  border-radius: var(--radius-full);
  font-size: 24rpx;
  font-weight: 900;
  line-height: 64rpx;
}

.del {
  background-color: rgba(var(--rgb-black), 0.06);
  color: var(--color-on-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: rgba(var(--rgb-black), 0.08);
}

.del--danger {
  background-color: rgba(var(--rgb-danger), 0.12);
  border-color: rgba(var(--rgb-danger), 0.24);
  color: var(--color-danger);
}

.del[disabled] {
  opacity: 0.45;
}

.del--hover {
  opacity: 0.9;
}

.ghost {
  background-color: transparent;
  border-width: 1rpx;
  border-style: solid;
  border-color: rgba(var(--rgb-black), 0.14);
  color: var(--color-on-surface-variant);
}

.ghost--hover {
  background-color: rgba(var(--rgb-black), 0.04);
}

.selected-empty {
  flex: 1;
  padding: 6rpx 0;
}

.selected-empty-text {
  font-size: 22rpx;
  color: var(--color-on-surface-variant);
}

.selected-chips {
  display: flex;
  gap: 12rpx;
  padding: 0 2rpx;
  flex-wrap: wrap;
}

.selected-wrap {
  flex: 1;
  max-height: 260rpx;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

.chip {
  padding: 10rpx 14rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: rgba(var(--rgb-black), 0.06);
  display: flex;
  align-items: center;
  gap: 10rpx;
  white-space: nowrap;
}

.chip--tool {
  background-color: rgba(var(--rgb-black), 0.03);
}

.chip--hover {
  background-color: var(--color-surface-container-low);
}

.chip-emoji {
  font-size: 24rpx;
}

.chip-text {
  font-size: 22rpx;
  font-weight: 900;
  color: var(--color-on-surface);
}

.content {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 28rpx 48rpx 220rpx;
}

.section-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.section-title-text {
  font-size: 24rpx;
  font-weight: 900;
  color: var(--color-on-surface);
}

.section-title-sub {
  font-size: 22rpx;
  color: var(--color-on-surface-variant);
}

.hint {
  padding: 36rpx 0;
  display: flex;
  justify-content: center;
}

.hint-text {
  font-size: 24rpx;
  color: var(--color-on-surface-variant);
}

.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.icon-item {
  height: 56rpx;
  padding: 0 16rpx 0 12rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: rgba(var(--rgb-black), 0.06);
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.icon-item--hover {
  background-color: var(--color-surface-container-low);
}

.icon-item--on {
  background-color: rgba(var(--rgb-primary-container), 0.24);
  border-color: rgba(var(--rgb-primary-container), 0.4);
}

.icon-item--del {
  background-color: rgba(var(--rgb-danger), 0.12);
  border-color: rgba(var(--rgb-danger), 0.24);
}

.icon-item--del .text {
  color: var(--color-danger);
}

.emoji {
  font-size: 24rpx;
}

.text {
  font-size: 24rpx;
  font-weight: 900;
  color: var(--color-on-surface);
}

.icon-item--on .text {
  color: var(--color-primary);
}

.spacer {
  height: 40rpx;
}
</style>

