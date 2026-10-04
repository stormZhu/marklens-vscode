import { reactive } from 'vue'
import { resolveThemeId, applyThemeAttributes } from '@/utils/themeMeta'
import { saveThemePreference, saveConfigPreference } from '@/bridge/vscodeBridge'

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
  fontSize: 16,
  cmdWheelZoom: false,
  headerShortcutTips: true,
  markdownCodeLinkPreview: true,
  tableRowExpand: false,
  selectionToolbar: true,
})

if (typeof localStorage !== 'undefined') {
  for (const key of Object.keys(localConfig)) {
    try {
      const raw = localStorage.getItem(LOCAL_PREFIX + key)
      if (raw !== null) {
        localConfig[key] = JSON.parse(raw)
      }
    } catch {
      // ignore storage errors in restricted webviews
    }
  }
}

// Apply persisted fontSize / uiScale on startup
if (typeof document !== 'undefined') {
  const fs = Number(localConfig.fontSize)
  if (fs > 0) {
    document.documentElement.style.setProperty('--md-font-size', `${fs}px`)
  }
  const scale = Number(localConfig.uiScale)
  if (scale > 0 && scale !== 1) {
    document.documentElement.style.zoom = String(scale)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('clawbench-vscode-config-updated', ((e: CustomEvent<{ key?: string; value?: unknown }>) => {
    const detail = e.detail
    if (detail && typeof detail.key === 'string' && detail.key in localConfig) {
      localConfig[detail.key] = detail.value as any
      try {
        localStorage.setItem(LOCAL_PREFIX + detail.key, JSON.stringify(detail.value))
      } catch {
        // ignore
      }
    }
  }) as EventListener)
}

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

  if (key === 'tableRowExpand') {
    saveConfigPreference('tableRowExpand', value)
  }

  if (key === 'fontSize' && typeof value === 'number' && typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--md-font-size', `${value}px`)
  }

  if (key === 'uiScale' && typeof value === 'number' && typeof document !== 'undefined') {
    document.documentElement.style.zoom = value === 1 ? '' : String(value)
  }
}

export function useSettingsConfig() {
  return {
    localConfig,
    setLocalConfig,
  }
}
