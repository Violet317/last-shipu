<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { checkout, getCart, listProducts, setCart, type CartItem, type ProductCategory, type ShopProduct } from '@/api/shop'

const loading = ref<boolean>(false)
const error = ref<string>('')
const products = ref<ShopProduct[]>([])
const keyword = ref<string>('')
const category = ref<ProductCategory | 'all'>('all')
const cart = ref<CartItem[]>([])
const cartOpen = ref<boolean>(false)
const checkingOut = ref<boolean>(false)

function onBack(): void {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  uni.switchTab({ url: '/pages/extra' })
}

function money(cents: number): string {
  return `¥ ${(cents / 100).toFixed(2)}`
}

const filtered = computed(() => {
  const k = keyword.value.trim()
  return products.value
    .filter((p) => (category.value === 'all' ? true : p.category === category.value))
    .filter((p) => (!k ? true : p.title.includes(k) || p.subtitle.includes(k)))
})

const recommended = computed(() => {
  return products.value.slice().sort((a, b) => b.rating - a.rating).slice(0, 6)
})

const cartCount = computed(() => cart.value.reduce((acc, it) => acc + it.qty, 0))
const cartTotalCents = computed(() => {
  const map = new Map(products.value.map((p) => [p.id, p.priceCents] as const))
  return cart.value.reduce((acc, it) => acc + (map.get(it.productId) ?? 0) * it.qty, 0)
})

function qtyOf(productId: string): number {
  return cart.value.find((x) => x.productId === productId)?.qty ?? 0
}

async function syncCart(next: CartItem[]): Promise<void> {
  cart.value = await setCart(next)
}

async function addToCart(p: ShopProduct): Promise<void> {
  const q = qtyOf(p.id)
  const next = q > 0 ? cart.value.map((x) => (x.productId === p.id ? { ...x, qty: x.qty + 1 } : x)) : [...cart.value, { productId: p.id, qty: 1 }]
  await syncCart(next)
  uni.showToast({ title: '已加入购物车', icon: 'none' })
}

async function decFromCart(p: ShopProduct): Promise<void> {
  const q = qtyOf(p.id)
  if (q <= 0) return
  const next =
    q === 1 ? cart.value.filter((x) => x.productId !== p.id) : cart.value.map((x) => (x.productId === p.id ? { ...x, qty: x.qty - 1 } : x))
  await syncCart(next)
}

function openCart(): void {
  cartOpen.value = true
}

function closeCart(): void {
  cartOpen.value = false
}

const cartDetail = computed(() => {
  const map = new Map(products.value.map((p) => [p.id, p] as const))
  return cart.value
    .map((it) => {
      const p = map.get(it.productId)
      return p ? { product: p, qty: it.qty } : null
    })
    .filter((x) => x !== null) as Array<{ product: ShopProduct; qty: number }>
})

async function doCheckout(): Promise<void> {
  if (checkingOut.value) return
  if (cartCount.value === 0) {
    uni.showToast({ title: '购物车为空', icon: 'none' })
    return
  }
  const res = await new Promise<UniApp.ShowModalRes>((resolve) => {
    uni.showModal({
      title: '确认购买',
      content: `共 ${cartCount.value} 件，合计 ${money(cartTotalCents.value)}。确认下单？`,
      confirmText: '确认',
      cancelText: '取消',
      success: (r) => resolve(r),
      fail: () => resolve({ confirm: false, cancel: true } as UniApp.ShowModalRes),
    })
  })
  if (!res.confirm) return
  checkingOut.value = true
  try {
    const order = await checkout()
    cart.value = await getCart()
    closeCart()
    uni.showToast({ title: `下单成功 ${money(order.totalCents)}`, icon: 'none' })
  } finally {
    checkingOut.value = false
  }
}

async function fetchAll(): Promise<void> {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    products.value = await listProducts()
    cart.value = await getCart()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(fetchAll)
</script>

<template>
  <view class="page">
    <view class="header">
      <view class="back" hover-class="back--hover" @click="onBack">
        <uni-icons type="left" size="20" color="var(--color-on-surface)" />
      </view>
      <text class="title font-headline">美食商店</text>
      <view class="header-actions">
        <view class="cart-btn" hover-class="cart-btn--hover" @click="openCart">
          <uni-icons type="cart" size="20" color="var(--color-on-surface)" />
          <view v-if="cartCount > 0" class="badge"><text class="badge-text">{{ cartCount }}</text></view>
        </view>
      </view>
    </view>

    <scroll-view class="content" scroll-y>
      <view class="search shadow-editorial">
        <uni-icons type="search" size="18" color="var(--color-on-surface-variant)" />
        <input v-model="keyword" class="search-input" placeholder="搜索食材或厨具..." />
        <view class="ghost" hover-class="ghost--hover" @click="fetchAll">刷新</view>
      </view>

      <view class="tabs">
        <view class="tab" :class="category === 'all' ? 'tab--on' : ''" @click="category = 'all'">推荐</view>
        <view class="tab" :class="category === 'ingredient' ? 'tab--on' : ''" @click="category = 'ingredient'">食材</view>
        <view class="tab" :class="category === 'tool' ? 'tab--on' : ''" @click="category = 'tool'">厨具</view>
      </view>

      <view class="section" v-if="recommended.length > 0">
        <view class="section-head">
          <text class="section-title font-headline">精选推荐</text>
          <text class="section-sub">只卖食材与厨具</text>
        </view>
        <scroll-view class="rec-scroll" scroll-x>
          <view class="rec-row">
            <view v-for="p in recommended" :key="p.id" class="rec-card shadow-editorial">
              <text class="rec-emoji">{{ p.thumbnailEmoji }}</text>
              <text class="rec-title">{{ p.title }}</text>
              <text class="rec-price">{{ money(p.priceCents) }}</text>
              <view class="rec-btn" hover-class="rec-btn--hover" @click="addToCart(p)">
                <uni-icons type="plus" size="18" color="var(--color-on-primary)" />
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <view v-if="loading" class="empty"><text class="empty-text">加载中...</text></view>
      <view v-else-if="error" class="empty"><text class="empty-text">{{ error }}</text></view>
      <view v-else-if="filtered.length === 0" class="empty"><text class="empty-text">暂无商品</text></view>

      <view v-else class="grid">
        <view v-for="p in filtered" :key="p.id" class="item shadow-editorial">
          <view class="thumb">
            <text class="thumb-emoji">{{ p.thumbnailEmoji }}</text>
          </view>
          <view class="meta">
            <text class="name">{{ p.title }}</text>
            <text class="desc">{{ p.subtitle }}</text>
            <view class="foot">
              <text class="price">{{ money(p.priceCents) }}</text>
              <view class="qty">
                <view class="qty-btn" :class="qtyOf(p.id) > 0 ? '' : 'qty-btn--off'" hover-class="qty-btn--hover" @click="decFromCart(p)">
                  <uni-icons type="minus" size="18" color="var(--color-on-surface)" />
                </view>
                <text class="qty-text">{{ qtyOf(p.id) }}</text>
                <view class="qty-btn qty-btn--plus" hover-class="qty-btn--hover" @click="addToCart(p)">
                  <uni-icons type="plus" size="18" color="var(--color-on-primary)" />
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
      <view class="spacer" />
    </scroll-view>

    <view v-if="cartOpen" class="modal" @click="closeCart">
      <view class="modal-backdrop" />
      <view class="sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title font-headline">购物车</text>
          <view class="close" hover-class="close--hover" @click="closeCart">
            <uni-icons type="closeempty" size="18" color="var(--color-on-surface)" />
          </view>
        </view>

        <view v-if="cartDetail.length === 0" class="sheet-empty">
          <text class="empty-text">购物车为空</text>
        </view>
        <scroll-view v-else class="sheet-list" scroll-y>
          <view v-for="it in cartDetail" :key="it.product.id" class="sheet-item">
            <text class="sheet-emoji">{{ it.product.thumbnailEmoji }}</text>
            <view class="sheet-meta">
              <text class="sheet-name">{{ it.product.title }}</text>
              <text class="sheet-price">{{ money(it.product.priceCents) }}</text>
            </view>
            <view class="sheet-qty">
              <view class="qty-btn" hover-class="qty-btn--hover" @click="decFromCart(it.product)">
                <uni-icons type="minus" size="18" color="var(--color-on-surface)" />
              </view>
              <text class="qty-text">{{ it.qty }}</text>
              <view class="qty-btn qty-btn--plus" hover-class="qty-btn--hover" @click="addToCart(it.product)">
                <uni-icons type="plus" size="18" color="var(--color-on-primary)" />
              </view>
            </view>
          </view>
        </scroll-view>

        <view class="sheet-foot">
          <view class="sum">
            <text class="sum-text">合计</text>
            <text class="sum-money">{{ money(cartTotalCents) }}</text>
          </view>
          <button class="buy" :disabled="checkingOut || cartCount === 0" @click="doCheckout">{{ checkingOut ? '处理中...' : '确认购买' }}</button>
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

.header-actions {
  display: flex;
  align-items: center;
}

.cart-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.cart-btn--hover {
  background-color: rgba(var(--rgb-black), 0.05);
}

.badge {
  position: absolute;
  right: 6rpx;
  top: 6rpx;
  min-width: 30rpx;
  height: 30rpx;
  border-radius: 30rpx;
  background-color: var(--color-danger);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
}

.badge-text {
  font-size: 18rpx;
  font-weight: 900;
  color: white;
}

.content {
  padding: 144rpx 48rpx 96rpx;
  min-height: 100vh;
}

.search {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 28rpx;
  border-radius: var(--radius-xl);
  background-color: var(--color-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
}

.search-input {
  flex: 1;
  height: 72rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: var(--color-on-surface);
}

.ghost {
  height: 72rpx;
  padding: 0 24rpx;
  border-radius: var(--radius-full);
  background-color: rgba(var(--rgb-black), 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 900;
  color: var(--color-on-surface);
}

.ghost--hover {
  background-color: rgba(var(--rgb-black), 0.06);
}

.tabs {
  margin-top: 18rpx;
  display: flex;
  gap: 12rpx;
}

.tab {
  flex: 1;
  height: 72rpx;
  border-radius: var(--radius-full);
  background-color: rgba(var(--rgb-black), 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 900;
  color: var(--color-on-surface-variant);
}

.tab--on {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
}

.section {
  margin-top: 24rpx;
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 900;
}

.section-sub {
  font-size: 22rpx;
  color: var(--color-on-surface-variant);
}

.rec-scroll {
  width: 100%;
}

.rec-row {
  display: flex;
  gap: 16rpx;
  padding: 0 4rpx;
}

.rec-card {
  width: 260rpx;
  padding: 24rpx;
  border-radius: var(--radius-xl);
  background-color: var(--color-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
  position: relative;
}

.rec-emoji {
  font-size: 52rpx;
}

.rec-title {
  margin-top: 10rpx;
  font-size: 24rpx;
  font-weight: 900;
}

.rec-price {
  margin-top: 8rpx;
  font-size: 22rpx;
  font-weight: 900;
  color: var(--color-primary);
}

.rec-btn {
  position: absolute;
  right: 18rpx;
  bottom: 18rpx;
  width: 72rpx;
  height: 72rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.rec-btn--hover {
  opacity: 0.9;
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

.grid {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.item {
  padding: 28rpx;
  border-radius: var(--radius-xl);
  background-color: var(--color-surface);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
  display: flex;
  align-items: center;
  gap: 32rpx;
}

.thumb {
  width: 120rpx;
  height: 120rpx;
  border-radius: var(--radius-lg);
  background-color: var(--color-surface-container);
  border-width: 1rpx;
  border-style: solid;
  border-color: var(--color-outline-variant);
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumb-emoji {
  font-size: 56rpx;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex: 1;
  min-width: 0;
}

.name {
  font-size: var(--fs-14);
  font-weight: 800;
}

.desc {
  font-size: 22rpx;
  color: var(--color-on-surface-variant);
  line-height: 1.4;
}

.foot {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.price {
  font-size: 26rpx;
  font-weight: 900;
  color: var(--color-primary);
}

.qty {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.qty-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--radius-full);
  background-color: rgba(var(--rgb-black), 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}

.qty-btn--plus {
  background-color: var(--color-primary);
}

.qty-btn--off {
  opacity: 0.35;
}

.qty-btn--hover {
  opacity: 0.9;
}

.qty-text {
  min-width: 28rpx;
  text-align: center;
  font-size: 24rpx;
  font-weight: 900;
  color: var(--color-on-surface);
}

.spacer {
  height: 40rpx;
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

.sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  border-top-left-radius: 32rpx;
  border-top-right-radius: 32rpx;
  background-color: var(--color-surface);
  padding: 28rpx 28rpx 32rpx;
  border-top-width: 1rpx;
  border-top-style: solid;
  border-top-color: rgba(var(--rgb-black), 0.08);
  max-height: 78vh;
  display: flex;
  flex-direction: column;
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 900;
}

.close {
  width: 72rpx;
  height: 72rpx;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

.close--hover {
  background-color: rgba(var(--rgb-black), 0.05);
}

.sheet-empty {
  padding: 36rpx 0;
  display: flex;
  justify-content: center;
}

.sheet-list {
  margin-top: 18rpx;
  flex: 1;
}

.sheet-item {
  padding: 18rpx 10rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  border-bottom-width: 1rpx;
  border-bottom-style: solid;
  border-bottom-color: rgba(var(--rgb-black), 0.06);
}

.sheet-emoji {
  font-size: 44rpx;
}

.sheet-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.sheet-name {
  font-size: 26rpx;
  font-weight: 900;
}

.sheet-price {
  font-size: 22rpx;
  color: var(--color-on-surface-variant);
}

.sheet-qty {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.sheet-foot {
  margin-top: 18rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.sum {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.sum-text {
  font-size: 22rpx;
  color: var(--color-on-surface-variant);
}

.sum-money {
  font-size: 30rpx;
  font-weight: 900;
  color: var(--color-on-surface);
}

.buy {
  height: 88rpx;
  padding: 0 32rpx;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 26rpx;
  font-weight: 900;
  line-height: 88rpx;
}

.buy[disabled] {
  opacity: 0.45;
}
</style>
