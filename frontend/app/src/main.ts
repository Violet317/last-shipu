import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { createSecurePersistPlugin } from './stores/plugins/securePersist'

export function createApp() {
  const app = createSSRApp(App)

  const pinia = createPinia()
  pinia.use(createSecurePersistPlugin())

  app.use(pinia)

  return {
    app,
  }
}

