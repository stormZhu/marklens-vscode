import { reactive } from 'vue'
import { openFileInVscode, revealInVscodeExplorer } from '@/bridge/vscodeBridge'

export interface StoreFile {
  name: string
  path: string
  content: string
  error?: boolean
  isBinary?: boolean
  tooLarge?: boolean
}

export interface DirEntryItem {
  name: string
  isDir?: boolean
  size?: number
}

export interface AppState {
  projectRoot: string
  homeDir: string
  currentFile: StoreFile | null
  currentDir: string
  dirEntries: DirEntryItem[]
  dirLoading: boolean
}

const state = reactive<AppState>({
  projectRoot: '',
  homeDir: '',
  currentFile: null,
  currentDir: '',
  dirEntries: [],
  dirLoading: false,
})

let listenersInstalled = false

export function installStoreNavigationBridge(): void {
  if (listenersInstalled || typeof window === 'undefined') return
  listenersInstalled = true

  window.addEventListener('open-file-overlay', (e: Event) => {
    const detail = (e as CustomEvent<{
      path?: string
      lineStart?: number
      lineEnd?: number
      lineRanges?: string
    }>).detail
    if (detail?.path) {
      openFileInVscode(detail.path, detail.lineStart, detail.lineEnd, detail.lineRanges)
    }
  })

  window.addEventListener('open-directory-from-context', (e: Event) => {
    const detail = (e as CustomEvent<{
      path?: string
      revealPath?: string
    }>).detail
    const target = detail?.revealPath || detail?.path
    if (target) {
      revealInVscodeExplorer(target)
    }
  })

  window.addEventListener('highlight-file-item', (e: Event) => {
    const detail = (e as CustomEvent<{ path?: string }>).detail
    if (detail?.path) {
      revealInVscodeExplorer(detail.path)
    }
  })
}

installStoreNavigationBridge()

export const store = {
  state,
  async selectFile(_path: string): Promise<boolean> {
    return true
  },
  async loadFiles(_dir?: string, ..._args: unknown[]): Promise<void> {
    // Handled by highlight-file-item listener above
  },
  async setProject(_path: string): Promise<void> {
    // No-op in VSCode extension
  },
}
