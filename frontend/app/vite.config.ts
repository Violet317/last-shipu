import { defineConfig, type PluginOption } from 'vite'
import Uni from '@dcloudio/vite-plugin-uni'

type UniPluginFactory = () => PluginOption

const uni: UniPluginFactory =
  typeof Uni === 'function'
    ? (Uni as unknown as UniPluginFactory)
    : ((Uni as unknown as { default: UniPluginFactory }).default as UniPluginFactory)

export default defineConfig({
  plugins: [uni()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        // 后端接口本身带 /api 前缀，不需要 rewrite
      }
    }
  }
})
