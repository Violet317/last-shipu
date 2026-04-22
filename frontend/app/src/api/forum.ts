import { apiConfig } from './config'
import { request } from './client'
import { getJson, mockOk, setJson } from './mockStorage'

export interface ForumUser {
  id: string
  name: string
}

export interface ForumComment {
  id: string
  postId: string
  author: ForumUser
  content: string
  createdAtMs: number
}

export interface ForumPost {
  id: string
  author: ForumUser
  content: string
  createdAtMs: number
  likeCount: number
  commentCount: number
  likedBy: string[]
}

export interface CreatePostRequest {
  content: string
}

export interface CreateCommentRequest {
  content: string
}

const POSTS_KEY = 'mock_forum_posts_v1'
const COMMENTS_KEY = 'mock_forum_comments_v1'
const DEVICE_KEY = 'mock_device_id_v1'

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`
}

function getDeviceId(): string {
  const existing = getJson<string>(DEVICE_KEY, '')
  if (existing) return existing
  const id = uid('dev')
  setJson(DEVICE_KEY, id)
  return id
}

function seedIfEmpty(): void {
  const posts = getJson<ForumPost[]>(POSTS_KEY, [])
  const comments = getJson<ForumComment[]>(COMMENTS_KEY, [])
  if (posts.length > 0) return

  const now = Date.now()
  const users: ForumUser[] = [
    { id: 'u1', name: '小满' },
    { id: 'u2', name: '阿橘' },
    { id: 'u3', name: '山海' },
  ]
  const seededPosts: ForumPost[] = [
    {
      id: uid('p'),
      author: users[0],
      content: '用空气炸锅做了鸡胸肉，外脆里嫩，求大家推荐低脂蘸料！',
      createdAtMs: now - 2 * 3600 * 1000,
      likeCount: 12,
      commentCount: 2,
      likedBy: [],
    },
    {
      id: uid('p'),
      author: users[1],
      content: '番茄+鸡蛋+菌菇一起炒，竟然很下饭。你们还有什么快手组合？',
      createdAtMs: now - 6 * 3600 * 1000,
      likeCount: 25,
      commentCount: 3,
      likedBy: [],
    },
    {
      id: uid('p'),
      author: users[2],
      content: '分享一个小技巧：蔬菜焯水后过冷水，口感更脆，颜色更亮。',
      createdAtMs: now - 24 * 3600 * 1000,
      likeCount: 18,
      commentCount: 1,
      likedBy: [],
    },
  ]
  const p1 = seededPosts[0].id
  const p2 = seededPosts[1].id
  const p3 = seededPosts[2].id
  const seededComments: ForumComment[] = [
    { id: uid('c'), postId: p1, author: users[1], content: '我喜欢用酸奶+蒜末+黑胡椒，清爽！', createdAtMs: now - 90 * 60 * 1000 },
    { id: uid('c'), postId: p1, author: users[2], content: '柠檬汁+一点盐+辣椒粉也不错。', createdAtMs: now - 60 * 60 * 1000 },
    { id: uid('c'), postId: p2, author: users[0], content: '我会加青椒，香味更足。', createdAtMs: now - 4 * 3600 * 1000 },
    { id: uid('c'), postId: p2, author: users[2], content: '可以试试加一小勺生抽和几滴香醋。', createdAtMs: now - 3 * 3600 * 1000 },
    { id: uid('c'), postId: p2, author: users[0], content: '菌菇用平底锅干煎一下再炒更香。', createdAtMs: now - 2 * 3600 * 1000 },
    { id: uid('c'), postId: p3, author: users[1], content: '赞同，尤其是西兰花！', createdAtMs: now - 20 * 3600 * 1000 },
  ]
  setJson(POSTS_KEY, seededPosts)
  setJson(COMMENTS_KEY, seededComments)
}

function readPosts(): ForumPost[] {
  seedIfEmpty()
  return getJson<ForumPost[]>(POSTS_KEY, [])
}

function writePosts(posts: ForumPost[]): void {
  setJson(POSTS_KEY, posts)
}

function readComments(): ForumComment[] {
  seedIfEmpty()
  return getJson<ForumComment[]>(COMMENTS_KEY, [])
}

function writeComments(comments: ForumComment[]): void {
  setJson(COMMENTS_KEY, comments)
}

export async function listPosts(): Promise<ForumPost[]> {
  if (!apiConfig.baseUrl) {
    const posts = readPosts().slice().sort((a, b) => b.createdAtMs - a.createdAtMs)
    const res = await mockOk(posts, 160)
    return res.data
  }
  return await request<ForumPost[]>({ url: '/api/forum/posts', method: 'GET' })
}

export async function listComments(postId: string): Promise<ForumComment[]> {
  if (!apiConfig.baseUrl) {
    const list = readComments()
      .filter((x) => x.postId === postId)
      .slice()
      .sort((a, b) => a.createdAtMs - b.createdAtMs)
    const res = await mockOk(list, 160)
    return res.data
  }
  return await request<ForumComment[]>({ url: `/api/forum/posts/${encodeURIComponent(postId)}/comments`, method: 'GET' })
}

export async function createPost(author: ForumUser, body: CreatePostRequest): Promise<ForumPost> {
  if (!apiConfig.baseUrl) {
    const posts = readPosts()
    const next: ForumPost = {
      id: uid('p'),
      author,
      content: body.content.trim(),
      createdAtMs: Date.now(),
      likeCount: 0,
      commentCount: 0,
      likedBy: [],
    }
    writePosts([next, ...posts])
    const res = await mockOk(next, 180)
    return res.data
  }
  return await request<ForumPost, CreatePostRequest>({ url: '/api/forum/posts', method: 'POST', body })
}

export async function toggleLike(postId: string): Promise<ForumPost | null> {
  if (!apiConfig.baseUrl) {
    const deviceId = getDeviceId()
    const posts = readPosts()
    const idx = posts.findIndex((x) => x.id === postId)
    if (idx < 0) return null
    const p = posts[idx]
    const liked = p.likedBy.includes(deviceId)
    const likedBy = liked ? p.likedBy.filter((x) => x !== deviceId) : [...p.likedBy, deviceId]
    const next: ForumPost = { ...p, likedBy, likeCount: Math.max(0, liked ? p.likeCount - 1 : p.likeCount + 1) }
    const copy = posts.slice()
    copy[idx] = next
    writePosts(copy)
    const res = await mockOk(next, 120)
    return res.data
  }
  return await request<ForumPost>({ url: `/api/forum/posts/${encodeURIComponent(postId)}/like`, method: 'POST' })
}

export async function createComment(author: ForumUser, postId: string, body: CreateCommentRequest): Promise<ForumComment> {
  if (!apiConfig.baseUrl) {
    const comments = readComments()
    const next: ForumComment = { id: uid('c'), postId, author, content: body.content.trim(), createdAtMs: Date.now() }
    writeComments([...comments, next])

    const posts = readPosts()
    const idx = posts.findIndex((x) => x.id === postId)
    if (idx >= 0) {
      const p = posts[idx]
      const copy = posts.slice()
      copy[idx] = { ...p, commentCount: p.commentCount + 1 }
      writePosts(copy)
    }

    const res = await mockOk(next, 160)
    return res.data
  }
  return await request<ForumComment, CreateCommentRequest>({ url: `/api/forum/posts/${encodeURIComponent(postId)}/comments`, method: 'POST', body })
}

export function isLikedByMe(post: ForumPost): boolean {
  const deviceId = getDeviceId()
  return post.likedBy.includes(deviceId)
}

