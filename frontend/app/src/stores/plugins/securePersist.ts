import type { PiniaPluginContext } from 'pinia'
import { createSecureStorage } from '@/utils/secureStorage'

export type PersistMode = 'encrypted'

export interface PersistOptions<State extends object> {
  key: string
  mode: PersistMode
  paths?: Array<keyof State & string>
}

const storage = createSecureStorage({
  namespace: 'last_shipu',
  keyStorageKey: '__last_shipu_key__',
})

function pickState<State extends Record<string, unknown>>(state: State, paths: Array<string> | undefined): Partial<State> {
  if (!paths || paths.length === 0) return state
  const picked: Partial<State> = {}
  for (const p of paths) {
    picked[p as keyof State] = state[p as keyof State]
  }
  return picked
}

export function createSecurePersistPlugin() {
  return (context: PiniaPluginContext) => {
    const persist =
      (context.options as unknown as { persist?: PersistOptions<Record<string, unknown>> }).persist ??
      ((context.store as unknown as { $options?: { persist?: PersistOptions<Record<string, unknown>> } }).$options?.persist ?? undefined)
    if (!persist) return

    const fromStorage = storage.getItem<Record<string, unknown>>(persist.key)
    if (fromStorage && typeof fromStorage === 'object') {
      context.store.$patch(fromStorage as any)
    }

    context.store.$subscribe((_mutation, state) => {
      const paths = Array.isArray(persist.paths) ? (persist.paths as Array<string>) : undefined
      const picked = pickState(state as Record<string, unknown>, paths)
      storage.setItem(persist.key, picked)
    })
  }
}
