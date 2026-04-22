<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { createComment, createPost, isLikedByMe, listComments, listPosts, toggleLike, type ForumComment, type ForumPost, type ForumUser } from '@/api/forum'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const loading = ref<boolean>(false)
const error = ref<string>('')
const posts = ref<ForumPost[]>([])
const keyword = ref<string>('')
const filterAuthorId = ref<string>('')

const me = computed<ForumUser>(() => {
  const name = userStore.profile?.nickname?.trim() || (userStore.isAuthed ? '用户' : '游客')
  const id = userStore.profile?.id ? String(userStore.profile.id) : 'guest'
  return { id, name }
})

const authors = computed(() => {
  const map = new Map<string, { id: string; name: string; count: number }>()
  for (const p of posts.value) {
    const v = map.get(p.author.id) ?? { id: p.author.id, name: p.author.name, count: 0 }
    v.count += 1
    map.set(p.author.id, v)
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count)
})

const filteredPosts = computed(() => {
  const k = keyword.value.trim()
  return posts.value.filter((p) => {
    if (filterAuthorId.value && p.author.id !== filterAuthorId.value) return false
    if (!k) return true
    return p.content.includes(k) || p.author.name.includes(k)
  })
})

function onBack(): void {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  uni.switchTab({ url: '/pages/extra' })
}

async function fetchPosts(): Promise<void> {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    posts.value = await listPosts()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function fmt(ms: number): string {
  const d = new Date(ms)
  return d.toLocaleString()
}

const composer = ref<string>('')
const sending = ref<boolean>(false)

async function onCreatePost(): Promise<void> {
  const text = composer.value.trim()
  if (!text) {
    uni.showToast({ title: '请输入内容', icon: 'none' })
    return
  }
  if (sending.value) return
  sending.value = true
  try {
    await createPost(me.value, { content: text })
    composer.value = ''
    await fetchPosts()
    uni.showToast({ title: '已发布', icon: 'none' })
  } finally {
    sending.value = false
  }
}

const openComments = ref<Record<string, boolean>>({})
const commentsMap = ref<Record<string, ForumComment[]>>({})
const commentDraft = ref<Record<string, string>>({})
const commentLoading = ref<Record<string, boolean>>({})

async function toggleComments(post: ForumPost): Promise<void> {
  const open = Boolean(openComments.value[post.id])
  openComments.value = { ...openComments.value, [post.id]: !open }
  if (!open && !commentsMap.value[post.id]) {
    commentLoading.value = { ...commentLoading.value, [post.id]: true }
    try {
      const list = await listComments(post.id)
      commentsMap.value = { ...commentsMap.value, [post.id]: list }
    } finally {
      commentLoading.value = { ...commentLoading.value, [post.id]: false }
    }
  }
}

async function onLike(post: ForumPost): Promise<void> {
  const next = await toggleLike(post.id)
  if (!next) return
  posts.value = posts.value.map((p) => (p.id === post.id ? next : p))
}

async function onAddComment(post: ForumPost): Promise<void> {
  const text = (commentDraft.value[post.id] ?? '').trim()
  if (!text) {
    uni.showToast({ title: '请输入评论', icon: 'none' })
    return
  }
  const loadingKey = `${post.id}_send`
  if (commentLoading.value[loadingKey]) return
  commentLoading.value = { ...commentLoading.value, [loadingKey]: true }
  try {
    await createComment(me.value, post.id, { content: text })
    commentDraft.value = { ...commentDraft.value, [post.id]: '' }
    const list = await listComments(post.id)
    commentsMap.value = { ...commentsMap.value, [post.id]: list }
    posts.value = posts.value.map((p) => (p.id === post.id ? { ...p, commentCount: p.commentCount + 1 } : p))
  } finally {
    commentLoading.value = { ...commentLoading.value, [loadingKey]: false }
  }
}

onMounted(fetchPosts)
</script>

<template>
  <view class="page">
    <view class="header">
      <view class="back" hover-class="back--hover" @click="onBack">
        <uni-icons type="left" size="20" color="var(--color-on-surface)" />
      </view>
      <text class="title font-headline">社区论坛</text>
      <view class="header-actions">
        <view class="ghost" hover-class="ghost--hover" @click="fetchPosts">刷新</view>
      </view>
    </view>

    <scroll-view class="content" scroll-y>
      <view class="composer shadow-editorial">
        <text class="composer-title font-headline">发帖</text>
        <textarea v-model="composer" class="textarea" maxlength="300" placeholder="分享你的作品、技巧或问题..." />
        <view class="composer-foot">
          <text class="composer-meta">以 {{ me.name }} 发布</text>
          <button class="primary" :disabled="sending" @click="onCreatePost">{{ sending ? '发布中...' : '发布' }}</button>
        </view>
      </view>

      <view class="search shadow-editorial">
        <uni-icons type="search" size="18" color="var(--color-on-surface-variant)" />
        <input v-model="keyword" class="search-input" placeholder="搜索内容或作者..." />
      </view>

      <scroll-view v-if="authors.length > 0" class="chips" scroll-x>
        <view class="chips-inner">
          <view class="chip" :class="!filterAuthorId ? 'chip--on' : ''" hover-class="chip--hover" @click="filterAuthorId = ''">
            <text class="chip-text">全部</text>
          </view>
          <view
            v-for="a in authors"
            :key="a.id"
            class="chip"
            :class="filterAuthorId === a.id ? 'chip--on' : ''"
            hover-class="chip--hover"
            @click="filterAuthorId = a.id"
          >
            <text class="chip-text">{{ a.name }} ({{ a.count }})</text>
          </view>
        </view>
      </scroll-view>

      <view v-if="loading" class="empty">
        <text class="empty-text">加载中...</text>
      </view>
      <view v-else-if="error" class="empty">
        <text class="empty-text">{{ error }}</text>
      </view>
      <view v-else-if="filteredPosts.length === 0" class="empty">
        <text class="empty-text">暂无帖子</text>
      </view>

      <view v-else class="list">
        <view v-for="p in filteredPosts" :key="p.id" class="post shadow-editorial">
          <view class="post-head">
            <view class="post-author">
              <view class="avatar">
                <text class="avatar-text font-headline">{{ p.author.name.slice(0, 1) }}</text>
              </view>
              <view class="post-author-meta">
                <text class="author">{{ p.author.name }}</text>
                <text class="time">{{ fmt(p.createdAtMs) }}</text>
              </view>
            </view>
          </view>
          <text class="post-text">{{ p.content }}</text>

          <view class="post-actions">
            <view class="action" hover-class="action--hover" @click="onLike(p)">
              <uni-icons :type="isLikedByMe(p) ? 'heart-filled' : 'heart'" size="18" color="var(--color-primary)" />
              <text class="action-text">{{ p.likeCount }}</text>
            </view>
            <view class="action" hover-class="action--hover" @click="toggleComments(p)">
              <uni-icons type="chat" size="18" color="var(--color-on-surface-variant)" />
              <text class="action-text">{{ p.commentCount }}</text>
            </view>
          </view>

          <view v-if="openComments[p.id]" class="comments">
            <view v-if="commentLoading[p.id]" class="comments-empty">
              <text class="empty-text">加载评论...</text>
            </view>
            <view v-else-if="(commentsMap[p.id]?.length ?? 0) === 0" class="comments-empty">
              <text class="empty-text">暂无评论</text>
            </view>
            <view v-else class="comments-list">
              <view v-for="c in commentsMap[p.id]" :key="c.id" class="comment">
                <text class="comment-author">{{ c.author.name }}</text>
                <text class="comment-text">{{ c.content }}</text>
              </view>
            </view>

            <view class="comment-input">
              <input v-model="commentDraft[p.id]" class="comment-ipt" placeholder="写评论..." maxlength="120" />
              <view class="send" hover-class="send--hover" @click="onAddComment(p)">
                <uni-icons type="arrow-up" size="18" color="var(--color-on-primary)" />
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
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

.header-actions {
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

.content {
  padding: 144rpx 48rpx 96rpx;
  min-height: 100vh;
}

.composer,
.search,
.post {
  padding: 40rpx;
  border-radius: var(--radius-xl);
  background-color: var(--color-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
}

.composer-title {
  font-size: 32rpx;
  font-weight: 900;
}

.textarea {
  margin-top: 18rpx;
  height: 180rpx;
  border-radius: 24rpx;
  background-color: var(--color-surface-container-low);
  padding: 18rpx 24rpx;
  font-size: 26rpx;
  color: var(--color-on-surface);
}

.composer-foot {
  margin-top: 18rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.composer-meta {
  font-size: 22rpx;
  color: var(--color-on-surface-variant);
}

.primary {
  height: 88rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 24rpx;
  font-weight: 900;
  line-height: 88rpx;
  padding: 0 32rpx;
}

.primary[disabled] {
  opacity: 0.45;
}

.search {
  margin-top: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.search-input {
  flex: 1;
  height: 72rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: var(--color-on-surface);
}

.chips {
  margin-top: 16rpx;
  width: 100%;
}

.chips-inner {
  display: flex;
  gap: 12rpx;
  padding: 0 4rpx;
}

.chip {
  padding: 10rpx 18rpx;
  border-radius: var(--radius-full);
  background-color: rgba(var(--rgb-black), 0.05);
  border-width: 1rpx;
  border-style: solid;
  border-color: rgba(var(--rgb-black), 0.06);
}

.chip--hover {
  background-color: rgba(var(--rgb-black), 0.07);
}

.chip--on {
  background-color: rgba(var(--rgb-primary-container), 0.26);
  border-color: rgba(var(--rgb-primary-container), 0.36);
}

.chip-text {
  font-size: 22rpx;
  font-weight: 900;
  color: var(--color-on-surface);
  white-space: nowrap;
}

.empty {
  margin-top: 24rpx;
  padding: 36rpx 0;
  display: flex;
  justify-content: center;
}

.empty-text {
  font-size: 24rpx;
  color: var(--color-on-surface-variant);
}

.list {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.post-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.post-author {
  display: flex;
  gap: 16rpx;
  align-items: center;
}

.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: var(--radius-full);
  background-color: rgba(var(--rgb-black), 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  font-size: 28rpx;
  font-weight: 900;
  color: var(--color-on-surface);
}

.post-author-meta {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.author {
  font-size: 26rpx;
  font-weight: 900;
  color: var(--color-on-surface);
}

.time {
  font-size: 22rpx;
  color: var(--color-on-surface-variant);
}

.post-text {
  margin-top: 18rpx;
  font-size: 26rpx;
  line-height: 1.7;
  color: var(--color-on-surface);
}

.post-actions {
  margin-top: 18rpx;
  display: flex;
  gap: 20rpx;
}

.action {
  padding: 10rpx 16rpx;
  border-radius: var(--radius-full);
  background-color: rgba(var(--rgb-black), 0.04);
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.action--hover {
  background-color: rgba(var(--rgb-black), 0.06);
}

.action-text {
  font-size: 22rpx;
  font-weight: 900;
  color: var(--color-on-surface);
}

.comments {
  margin-top: 20rpx;
  padding-top: 18rpx;
  border-top-width: 1rpx;
  border-top-style: solid;
  border-top-color: rgba(var(--rgb-black), 0.06);
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.comment {
  padding: 14rpx 16rpx;
  border-radius: 22rpx;
  background-color: rgba(var(--rgb-black), 0.04);
}

.comment-author {
  font-size: 22rpx;
  font-weight: 900;
  color: var(--color-on-surface);
}

.comment-text {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: var(--color-on-surface-variant);
  line-height: 1.6;
}

.comments-empty {
  padding: 18rpx 0;
}

.comment-input {
  margin-top: 14rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.comment-ipt {
  flex: 1;
  height: 76rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-surface-container-low);
  padding: 0 24rpx;
  font-size: 24rpx;
  color: var(--color-on-surface);
}

.send {
  width: 76rpx;
  height: 76rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.send--hover {
  opacity: 0.9;
}
</style>
