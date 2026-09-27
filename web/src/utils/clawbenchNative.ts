import { getVsCodeApi, rpcCall } from '@/bridge/vscodeBridge'

export interface ClawBenchNativeBridge {
  log?: (level: string, tag: string, msg: string) => void
  downloadFile?: (path: string) => void | Promise<void>
  downloadFileWithProgress?: (path: string, name: string, id: number) => void | Promise<void>
  cancelDownload?: (id: number) => void
  downloadUrl?: (url: string, filename: string) => void
  downloadBlob?: (base64: string, filename: string) => void
  setLanguage?: (lang: string) => void
  setZoomFactor?: (factor: number) => void
  setFloatingWindowEnabled?: (enabled: boolean) => void
  setLiveUpdateEnabled?: (enabled: boolean) => void
  canPostPromotedNotifications?: () => boolean
  openLiveUpdateSettings?: () => void
  setNativePushEnabled?: (enabled: boolean) => void
}

const vscodeNativeAdapter: ClawBenchNativeBridge = {
  downloadBlob(base64: string, filename: string) {
    void rpcCall('saveBlob', { base64, filename }).catch(() => {})
  },
  downloadFile(path: string) {
    void rpcCall('saveFile', { path }).catch(() => {})
  },
}

export function getNative(): ClawBenchNativeBridge | undefined {
  if (getVsCodeApi()) {
    return vscodeNativeAdapter
  }
  return undefined
}

export function isNativeApp(): boolean {
  return false
}

export function isDesktopApp(): boolean {
  return false
}
