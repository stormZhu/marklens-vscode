import { reactive } from 'vue'
import { resolveThemeId, applyThemeAttributes } from '@/utils/themeMeta'
import { saveThemePreference } from '@/bridge/vscodeBridge'

const LOCAL_PREFIX = 'clawbench-settings-'

export function getUIScale(): number {
  if (typeof document === 'undefined') return 1
  const z = document.documentElement.style.zoom
  if (!z) return 1
  const n = Number(z)
  return isNaN(n) ? 1 : n
}

export function toFixedCSS(viewportCoord: number): number {
  const z = getUIScale()
  return viewportCoord / z
}

export function getZoomedViewport(): { width: number; height: number } {
  if (typeof window === 'undefined') return { width: 1280, height: 800 }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

export const localConfig = reactive<Record<string, string | boolean | number | null>>({
  theme: 'auto',
  locale: 'zh',
  showHidden: false,
  wordWrap: true,
  lineNumbers: true,
  stickyScroll: true,
  uiScale: 1,
  headerShortcutTips: true,
  markdownCodeLinkPreview: true,
})

export function setLocalConfig(key: string, value: string | boolean | number | null): void {
  localConfig[key] = value
  try {
    localStorage.setItem(LOCAL_PREFIX + key, JSON.stringify(value))
  } catch {
    // ignore storage errors in restricted webviews
  }

  if (key === 'theme' && typeof value === 'string') {
    const resolved = resolveThemeId(value)
    applyThemeAttributes(resolved)
    saveThemePreference(value)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('clawbench-theme-change', { detail: resolved }))
    }
  }
}

export function useSettingsConfig() {
  return {
    localConfig,
    setLocalConfig,
  }
}
