<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useThemeStore } from '@/stores/theme'
import { runMigrations } from '@/utils/migrations'

const themeStore = useThemeStore()

onLaunch(() => {
  runMigrations()
  themeStore.init()
})

onShow(() => {
  themeStore.syncSystemTheme()
})
</script>

<style lang="scss">
@import "@/uni.scss";
</style>
