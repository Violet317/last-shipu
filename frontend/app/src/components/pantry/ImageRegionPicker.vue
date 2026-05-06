<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onMounted, ref, watch } from 'vue'

export interface RegionRect {
  x: number
  y: number
  w: number
  h: number
}

const props = defineProps<{
  src: string
  regions: RegionRect[]
}>()

const emit = defineEmits<{
  (e: 'update:regions', v: RegionRect[]): void
}>()

const hostW = ref<number>(1)
const hostH = ref<number>(1)
const drawing = ref<boolean>(false)
const start = ref<{ x: number; y: number } | null>(null)
const current = ref<RegionRect | null>(null)

const allRegions = computed(() => {
  const list = props.regions.slice()
  if (current.value) list.push(current.value)
  return list
})

async function measure(): Promise<void> {
  await nextTick()
  const inst = getCurrentInstance()
  if (!inst) return
  await new Promise<void>((resolve) => {
    uni.createSelectorQuery()
      .in(inst as any)
      .select('.host')
      .boundingClientRect((r) => {
        const rect = r as unknown as { width?: number; height?: number } | null
        hostW.value = Math.max(1, Number(rect?.width ?? 1))
        hostH.value = Math.max(1, Number(rect?.height ?? 1))
        resolve()
      })
      .exec()
  })
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function toNorm(px: number, py: number): { x: number; y: number } {
  return { x: clamp01(px / hostW.value), y: clamp01(py / hostH.value) }
}

function onTouchStart(e: any): void {
  const t = e?.touches?.[0]
  if (!t) return
  drawing.value = true
  const p = toNorm(Number(t.x ?? t.clientX ?? 0), Number(t.y ?? t.clientY ?? 0))
  start.value = p
  current.value = { x: p.x, y: p.y, w: 0.001, h: 0.001 }
}

function onTouchMove(e: any): void {
  if (!drawing.value || !start.value) return
  const t = e?.touches?.[0]
  if (!t) return
  const p = toNorm(Number(t.x ?? t.clientX ?? 0), Number(t.y ?? t.clientY ?? 0))
  const x1 = start.value.x
  const y1 = start.value.y
  const x2 = p.x
  const y2 = p.y
  const x = Math.min(x1, x2)
  const y = Math.min(y1, y2)
  const w = Math.max(0.001, Math.abs(x2 - x1))
  const h = Math.max(0.001, Math.abs(y2 - y1))
  current.value = { x, y, w, h }
}

function onTouchEnd(): void {
  if (!drawing.value) return
  drawing.value = false
  const rect = current.value
  start.value = null
  current.value = null
  if (!rect) return
  if (rect.w < 0.02 || rect.h < 0.02) return
  emit('update:regions', [...props.regions, rect].slice(0, 10))
}

function remove(idx: number): void {
  emit(
    'update:regions',
    props.regions.filter((_, i) => i !== idx)
  )
}

function styleOf(r: RegionRect): Record<string, string> {
  return {
    left: `${r.x * 100}%`,
    top: `${r.y * 100}%`,
    width: `${r.w * 100}%`,
    height: `${r.h * 100}%`,
  }
}

onMounted(async () => {
  await measure()
})

watch(
  () => props.src,
  async () => {
    await measure()
  }
)
</script>

<template>
  <view class="host" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
    <image class="img" mode="aspectFit" :src="src" />
    <view class="overlay">
      <view v-for="(r, idx) in allRegions" :key="idx" class="rect" :style="styleOf(r)">
        <view v-if="idx < regions.length" class="badge" @click.stop="remove(idx)">
          <uni-icons type="closeempty" size="14" color="white" />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.host {
  position: relative;
  width: 100%;
  height: 520rpx;
  border-radius: 18rpx;
  overflow: hidden;
  background-color: rgba(var(--rgb-black), 0.04);
}

.img {
  width: 100%;
  height: 100%;
}

.overlay {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
}

.rect {
  position: absolute;
  border-width: 2rpx;
  border-style: solid;
  border-color: rgba(255, 179, 0, 0.95);
  background-color: rgba(255, 179, 0, 0.12);
  border-radius: 10rpx;
}

.badge {
  position: absolute;
  right: -12rpx;
  top: -12rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: var(--radius-full);
  background-color: rgba(var(--rgb-danger), 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
