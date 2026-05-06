<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useThemeStore } from '@/stores/theme'
import { useUserStore } from '@/stores/user'
import { runMigrations } from '@/utils/migrations'

const themeStore = useThemeStore()
const userStore = useUserStore()

onLaunch(() => {
  runMigrations()
  themeStore.init()
  if (userStore.isAuthed) {
    userStore.fetchProfile().catch(() => {
      // 静默失败
    })
  }
})

onShow(() => {
  themeStore.syncSystemTheme()
})
</script>

<style lang="scss">
@import "@/uni.scss";
</style>
