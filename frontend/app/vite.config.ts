import { defineConfig, type PluginOption } from 'vite'
import Uni from '@dcloudio/vite-plugin-uni'

type UniPluginFactory = () => PluginOption

const uni: UniPluginFactory =
  typeof Uni === 'function'
    ? (Uni as unknown as UniPluginFactory)
    : ((Uni as unknown as { default: UniPluginFactory }).default as UniPluginFactory)

export default defineConfig({
  plugins: [uni()],
})
