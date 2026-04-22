import 'pinia'
import type { PersistOptions } from '@/stores/plugins/securePersist'

declare module 'pinia' {
  export interface DefineStoreOptionsBase<S, Store> {
    persist?: PersistOptions<S>
  }
}

