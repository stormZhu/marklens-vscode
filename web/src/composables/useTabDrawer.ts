import { ref, computed, readonly, type Ref, type ComputedRef } from 'vue'

export interface TabDrawerOptions {
  autoRestore?: boolean
}

export interface TabDrawer {
  effectiveOpen: ComputedRef<boolean>
  isOpen: Readonly<Ref<boolean>>
  open: () => void
  close: () => void
  toggle: () => void
}

export function useTabDrawer(_tabId: string, openRefOrOptions?: Ref<boolean> | TabDrawerOptions): TabDrawer {
  const isLegacy = openRefOrOptions != null && typeof openRefOrOptions === 'object' && 'value' in openRefOrOptions
  const openRef = isLegacy ? (openRefOrOptions as Ref<boolean>) : ref(false)
  return {
    effectiveOpen: computed(() => openRef.value),
    isOpen: readonly(openRef),
    open: () => { openRef.value = true },
    close: () => { openRef.value = false },
    toggle: () => { openRef.value = !openRef.value },
  }
}
