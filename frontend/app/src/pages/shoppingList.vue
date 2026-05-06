<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useShoppingStore } from '@/stores/shoppingList'

const store = useShoppingStore()
const input = ref<string>('')
const loading = computed(() => store.loading)

async function add(): Promise<void> {
  const name = input.value.trim()
  if (!name) {
    uni.showToast({ title: '请输入要买的食材', icon: 'none' })
    return
  }
  const existed = store.items.some((x) => x.name === name && !x.checked)
  if (existed) {
    uni.showToast({ title: '已在清单中', icon: 'none' })
    return
  }
  const created = await store.create({ name })
  if (!created) return
  input.value = ''
}

async function toggle(id: string): Promise<void> {
  const it = store.items.find((x) => x.id === id)
  if (!it) return
  await store.update(id, { checked: !it.checked })
}

async function remove(id: string): Promise<void> {
  await store.remove(id)
}

onMounted(async () => {
  await store.fetch()
})
</script>

<template>
  <view class="page">
    <view class="top">
      <view class="top-left" @click="uni.navigateBack()">
        <uni-icons type="left" size="20" color="var(--color-on-surface)" />
      </view>
      <text class="top-title font-headline">购物清单</text>
      <view class="top-right" />
    </view>

    <view class="body">
      <view class="input-row">
        <input v-model="input" class="input" placeholder="缺什么就加什么…" confirm-type="done" @confirm="add" />
        <view class="add" hover-class="add--hover" @click="add">
          <uni-icons type="plus" size="18" color="var(--color-on-surface)" />
        </view>
      </view>

      <view v-if="loading" class="hint"><text class="hint-text">加载中...</text></view>
      <view v-else-if="store.error" class="hint"><text class="hint-text">{{ store.error }}</text></view>

      <view v-else class="list">
        <view v-for="it in store.items" :key="it.id" class="row" :class="it.checked ? 'row--done' : ''">
          <view class="row-left" hover-class="row-left--hover" @click="toggle(it.id)">
            <view class="box" :class="it.checked ? 'box--on' : ''">
              <uni-icons v-if="it.checked" type="checkmarkempty" size="16" color="white" />
            </view>
            <text class="name">{{ it.name }}</text>
          </view>
          <view class="row-right" hover-class="row-right--hover" @click="remove(it.id)">
            <uni-icons type="trash" size="18" color="var(--color-danger)" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background-color: var(--color-background);
  color: var(--color-on-surface);
}

.top {
  height: 104rpx;
  padding: 0 36rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.top-left,
.top-right {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.top-title {
  font-size: 34rpx;
  font-weight: 900;
}

.body {
  padding: 18rpx 36rpx 40rpx;
}

.input-row {
  height: 88rpx;
  border-radius: var(--radius-full);
  background-color: rgba(var(--rgb-black), 0.04);
  display: flex;
  align-items: center;
  padding: 0 20rpx;
  gap: 12rpx;
}

.input {
  flex: 1;
  height: 88rpx;
  font-size: 26rpx;
  font-weight: 800;
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

.hint {
  margin-top: 18rpx;
  padding: 18rpx;
  border-radius: 18rpx;
  background-color: rgba(var(--rgb-black), 0.04);
}

.hint-text {
  color: var(--color-on-surface-variant);
  font-weight: 700;
}

.list {
  margin-top: 18rpx;
}

.row {
  height: 88rpx;
  border-radius: 18rpx;
  background-color: rgba(var(--rgb-black), 0.04);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14rpx;
  margin-bottom: 12rpx;
}

.row--done {
  opacity: 0.6;
}

.row-left {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 88rpx;
}

.row-left--hover {
  opacity: 0.9;
}

.box {
  width: 44rpx;
  height: 44rpx;
  border-radius: 12rpx;
  border-width: 2rpx;
  border-style: solid;
  border-color: rgba(var(--rgb-black), 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
}

.box--on {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.name {
  font-size: 28rpx;
  font-weight: 900;
}

.row-right {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
}

.row-right--hover {
  background-color: rgba(var(--rgb-danger), 0.08);
}
</style>

