<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { generateRecipe, type GenerateRecipeRequest } from '@/api/recipe'
import { useChatStore, type ChatMessage } from '@/stores/chat'
import { useRecipeStore } from '@/stores/recipe'
import { useRecipeDetailsStore } from '@/stores/recipeDetails'
import { useShortcutsStore } from '@/stores/shortcuts'

const loading = ref<boolean>(false)
const chatStore = useChatStore()
const recipeStore = useRecipeStore()
const recipeDetailsStore = useRecipeDetailsStore()
const shortcutsStore = useShortcutsStore()

const draft = computed<string>({
  get: () => chatStore.draft,
  set: (v) => chatStore.setDraft(v),
})

const scrollInto = ref<string>('')

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`
}

function onBack(): void {
  uni.switchTab({ url: '/pages/home' })
}

function onOpenPlus(): void {
  uni.showActionSheet({
    itemList: ['选择食材', '清空已选', '清空对话'],
    success: (res) => {
      if (res.tapIndex === 0) {
        uni.switchTab({ url: '/pages/ingredients' })
        return
      }
      if (res.tapIndex === 1) {
        chatStore.clearSelected()
        return
      }
      if (res.tapIndex === 2) {
        chatStore.resetMessages()
        return
      }
    },
  })
}

const shortcuts = computed(() => shortcutsStore.enabled)

function applyShortcut(prompt: string): void {
  chatStore.setDraft(prompt)
}

onMounted(async () => {
  await shortcutsStore.fetch()
})

async function onSend(): Promise<void> {
  if (loading.value) return
  const text = draft.value.trim()
  if (!text && chatStore.selectedIngredients.length === 0) {
    uni.showToast({ title: '请输入需求或先选择食材', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const finalText = text || `请基于我已选食材生成一道菜，要求步骤清晰，给出热量与替代食材建议。`
    const userMsg: ChatMessage = { id: uid('u'), role: 'user', text: finalText }
    chatStore.pushMessage(userMsg)
    chatStore.setDraft('')

    const body: GenerateRecipeRequest = {
      prompt: finalText,
      ingredients: chatStore.selectedIngredients,
      tools: chatStore.selectedTools,
    }
    const detail = await generateRecipe(body)
    const createdAtMs = Date.now()
    recipeDetailsStore.put({ ...detail, createdAtMs })
    recipeStore.setRecent([
      {
        id: detail.id,
        title: detail.title,
        coverUrl: detail.coverUrl,
        tags: detail.tags,
        kcal: detail.kcal,
        durationMinutes: detail.durationMinutes,
        createdAtMs,
      },
      ...recipeStore.recent,
    ])

    const assistantMsg: ChatMessage = {
      id: uid('a'),
      role: 'assistant',
      text: `夏日清淡晚餐，这道「${detail.title}」非常适合。只需${detail.durationMinutes}分钟，酸甜开胃，且富含优质蛋白。`,
      recipe: {
        id: detail.id,
        title: detail.title,
        coverUrl: detail.coverUrl,
        durationMinutes: detail.durationMinutes,
        kcal: detail.kcal,
      },
    }
    chatStore.pushMessage(assistantMsg)

    await nextTick()
    scrollInto.value = assistantMsg.id
  } catch (e) {
    uni.showToast({ title: e instanceof Error ? e.message : '生成失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function onOpenRecipe(id: string): void {
  uni.navigateTo({ url: `/pages/recipeDetail?id=${encodeURIComponent(id)}` })
}
</script>

<template>
  <view class="page">
    <view class="top">
      <view class="top-left" @click="onBack">
        <uni-icons type="left" size="20" color="var(--color-on-surface)" />
      </view>
      <text class="top-title font-headline">膳语</text>
      <view class="top-right" />
    </view>

    <scroll-view class="chat" scroll-y :scroll-into-view="scrollInto" scroll-with-animation>
      <view class="bar">
        <view class="bar-left">
          <view v-if="chatStore.selectedIngredients.length === 0 && chatStore.selectedTools.length === 0" class="bar-empty">
            <text class="bar-empty-text">未选择食材/厨具，去「食材库」添加</text>
          </view>
          <scroll-view v-else class="bar-scroll" scroll-x>
            <view class="bar-chips">
              <view v-for="name in chatStore.selectedIngredients" :key="name" class="bar-chip">
                <text class="bar-chip-text">{{ name }}</text>
              </view>
              <view v-for="name in chatStore.selectedTools" :key="name" class="bar-chip bar-chip--tool">
                <text class="bar-chip-text">{{ name }}</text>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>

      <view v-if="shortcuts.length > 0" class="shortcuts">
        <scroll-view class="shortcuts-scroll" scroll-x>
          <view class="shortcuts-inner">
            <view v-for="sc in shortcuts" :key="sc.id" class="shortcut" hover-class="shortcut--hover" @click="applyShortcut(sc.prompt)">
              <text class="shortcut-text">{{ sc.title }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="welcome" v-if="chatStore.messages.length === 0">
        <view class="welcome-icon">
          <uni-icons type="star" size="22" color="var(--color-primary)" />
        </view>
        <text class="welcome-title font-headline">你好，我是你的专属主厨。</text>
        <text class="welcome-sub">
          今天想吃点什么？我可以为你定制食谱、规划备菜，或者解答烹饪答疑。
        </text>
        <view class="day-pill">
          <text class="day-text">今天</text>
        </view>
      </view>

      <view v-for="m in chatStore.messages" :key="m.id" class="msg" :id="m.id" :class="m.role">
        <view class="bubble" :class="m.role">
          <text class="bubble-text">{{ m.text }}</text>
          <view v-if="m.recipe" class="recipe" @click="onOpenRecipe(m.recipe.id)">
            <image class="recipe-img" mode="aspectFill" :src="m.recipe.coverUrl" />
            <view class="recipe-body">
              <text class="recipe-title font-headline">{{ m.recipe.title }}</text>
              <view class="recipe-meta">
                <view class="meta-item">
                  <uni-icons type="calendar" size="14" color="var(--color-on-surface-variant)" />
                  <text class="meta-text">{{ m.recipe.durationMinutes }} mins</text>
                </view>
                <view class="meta-dot" />
                <view class="meta-item">
                  <uni-icons type="fire" size="14" color="var(--color-on-surface-variant)" />
                  <text class="meta-text">{{ m.recipe.kcal }} kcal</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-space" />
    </scroll-view>

    <view class="composer">
      <button class="plus" @click="onOpenPlus">
        <uni-icons type="plus" size="20" color="var(--color-on-surface)" />
      </button>
      <view class="input-wrap">
        <input v-model="draft" class="input" placeholder="输入你想做的菜或食材..." />
      </view>
      <button class="send" :disabled="loading" @click="onSend">
        <uni-icons type="arrow-up" size="18" color="var(--color-on-primary)" />
      </button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: var(--color-background);
  color: var(--color-on-surface);
}

.top {
  height: 112rpx;
  padding: 0 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.top-left,
.top-right {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
}

.top-title {
  font-size: 40rpx;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--color-primary);
}

.chat {
  padding: 24rpx 32rpx 0;
  height: calc(100vh - 112rpx - 144rpx);
}

.bar {
  padding: 8rpx 0 18rpx;
}

.bar-empty {
  padding: 18rpx 24rpx;
  border-radius: 24rpx;
  background-color: rgba(var(--rgb-black), 0.05);
}

.bar-empty-text {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--color-on-surface-variant);
}

.bar-scroll {
  width: 100%;
}

.bar-chips {
  display: flex;
  gap: 12rpx;
  padding: 0 4rpx;
}

.bar-chip {
  padding: 10rpx 18rpx;
  border-radius: var(--radius-full);
  background-color: rgba(var(--rgb-black), 0.05);
  border-width: 1rpx;
  border-style: solid;
  border-color: rgba(var(--rgb-black), 0.06);
}

.bar-chip--tool {
  background-color: rgba(var(--rgb-black), 0.08);
}

.bar-chip-text {
  font-size: 22rpx;
  font-weight: 800;
  color: var(--color-on-surface);
}

.shortcuts {
  margin-bottom: 10rpx;
}

.shortcuts-scroll {
  width: 100%;
}

.shortcuts-inner {
  display: flex;
  gap: 12rpx;
  padding: 0 4rpx;
}

.shortcut {
  padding: 12rpx 18rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: rgba(var(--rgb-black), 0.06);
}

.shortcut--hover {
  background-color: var(--color-surface-container-low);
}

.shortcut-text {
  font-size: 22rpx;
  font-weight: 900;
  color: var(--color-primary);
}

.welcome {
  padding: 80rpx 32rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.welcome-icon {
  width: 112rpx;
  height: 112rpx;
  border-radius: var(--radius-full);
  background-color: rgba(var(--rgb-black), 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
}

.welcome-title {
  font-size: 44rpx;
  font-weight: 800;
  margin-bottom: 16rpx;
}

.welcome-sub {
  font-size: 26rpx;
  line-height: 1.7;
  color: var(--color-on-surface-variant);
  margin-bottom: 32rpx;
}

.day-pill {
  padding: 10rpx 28rpx;
  border-radius: var(--radius-full);
  background-color: rgba(var(--rgb-black), 0.06);
}

.day-text {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--color-on-surface-variant);
}

.msg {
  width: 100%;
  display: flex;
  margin-top: 24rpx;
}

.msg.user {
  justify-content: flex-end;
}

.msg.assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: 640rpx;
  padding: 28rpx 28rpx;
  border-radius: var(--radius-xl);
}

.bubble.user {
  background-color: rgba(var(--rgb-black), 0.06);
}

.bubble.assistant {
  background-color: var(--color-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: rgba(var(--rgb-black), 0.06);
}

.bubble-text {
  font-size: 28rpx;
  line-height: 1.6;
  color: var(--color-on-surface);
}

.recipe {
  margin-top: 24rpx;
  border-radius: var(--radius-xl);
  overflow: hidden;
  background-color: var(--color-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: rgba(var(--rgb-black), 0.06);
}

.recipe-img {
  width: 100%;
  height: 340rpx;
}

.recipe-body {
  padding: 32rpx;
}

.recipe-title {
  font-size: 32rpx;
  font-weight: 800;
  margin-bottom: 16rpx;
}

.recipe-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  color: var(--color-on-surface-variant);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.meta-text {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--color-on-surface-variant);
}

.meta-dot {
  width: 6rpx;
  height: 6rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-outline-variant);
}

.bottom-space {
  height: 160rpx;
}

.composer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 24rpx 32rpx 48rpx;
  background: linear-gradient(180deg, rgba(var(--rgb-black), 0) 0%, rgba(var(--rgb-white), 0.92) 40%, rgba(var(--rgb-white), 1) 100%);
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.plus {
  width: 96rpx;
  height: 96rpx;
  border-radius: var(--radius-full);
  background-color: rgba(var(--rgb-black), 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
}

.input-wrap {
  flex: 1;
  height: 96rpx;
  border-radius: var(--radius-full);
  background-color: rgba(var(--rgb-black), 0.06);
  padding: 0 32rpx;
  display: flex;
  align-items: center;
}

.input {
  width: 100%;
  height: 96rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-on-surface);
}

.send {
  width: 96rpx;
  height: 96rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
