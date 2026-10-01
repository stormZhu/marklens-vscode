import { reactive, ref } from 'vue'
import { appLog } from '@/utils/appLog'

export interface VsCodeApi {
  postMessage(message: unknown): void
  getState(): unknown
  setState(state: unknown): void
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VsCodeApi
    __CLAWBENCH_VSCODE_API__?: VsCodeApi
  }
}

let vscodeApiInstance: VsCodeApi | null = null

export function getVsCodeApi(): VsCodeApi | null {
  if (vscodeApiInstance) return vscodeApiInstance
  if (typeof window !== 'undefined') {
    if (window.__CLAWBENCH_VSCODE_API__) {
      vscodeApiInstance = window.__CLAWBENCH_VSCODE_API__
      return vscodeApiInstance
    }
    if (typeof window.acquireVsCodeApi === 'function') {
      vscodeApiInstance = window.acquireVsCodeApi()
      window.__CLAWBENCH_VSCODE_API__ = vscodeApiInstance
      return vscodeApiInstance
    }
  }
  return null
}

export interface DocumentState {
  path: string
  relativePath: string
  name: string
  content: string
  projectRoot: string
  homeDir: string
  webviewRootUri: string
  themeSetting: string
  vscodeColorKind: 'light' | 'dark'
  locale: 'zh' | 'en'
}

export const documentState = reactive<DocumentState>({
  path: '',
  relativePath: '',
  name: '',
  content: '',
  projectRoot: '',
  homeDir: '',
  webviewRootUri: '',
  themeSetting: 'auto',
  vscodeColorKind: 'dark',
  locale: 'zh',
})

export const bridgeReady = ref(false)

interface PendingRpc {
  resolve: (val: unknown) => void
  reject: (err: Error) => void
  timer: ReturnType<typeof setTimeout>
}

let rpcSeq = 0
const pendingRpcs = new Map<number, PendingRpc>()

export function rpcCall<T = unknown>(
  method: string,
  params: Record<string, unknown> = {},
  timeoutMs = 15000,
): Promise<T> {
  const api = getVsCodeApi()
  if (!api) {
    return Promise.reject(new Error(`VSCode API unavailable for RPC: ${method}`))
  }
  const reqId = ++rpcSeq
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingRpcs.delete(reqId)
      reject(new Error(`RPC timeout: ${method}`))
    }, timeoutMs)
    pendingRpcs.set(reqId, {
      resolve: resolve as (val: unknown) => void,
      reject,
      timer,
    })
    api.postMessage({
      type: 'rpcRequest',
      reqId,
      method,
      params,
    })
  })
}

export function postToHost(message: Record<string, unknown>): void {
  const api = getVsCodeApi()
  if (!api) {
    appLog.d('VsCodeBridge', 'postToHost skipped (no VSCode API)', message)
    return
  }
  api.postMessage(message)
}

export function openFileInVscode(
  path: string,
  lineStart?: number,
  lineEnd?: number,
  lineRanges?: string,
): void {
  postToHost({
    type: 'openFile',
    path,
    lineStart,
    lineEnd,
    lineRanges,
  })
}

export function revealInVscodeExplorer(path: string): void {
  postToHost({
    type: 'revealInExplorer',
    path,
  })
}

export function switchToNativeTextEditor(line?: number, userScrolled?: boolean): void {
  postToHost({
    type: 'switchToTextEditor',
    line,
    userScrolled,
  })
}

export function openPreviewToSide(): void {
  postToHost({
    type: 'openPreviewToSide',
  })
}

export function saveThemePreference(theme: string): void {
  postToHost({
    type: 'saveThemePreference',
    theme,
  })
}

export function saveConfigPreference(key: string, value: unknown): void {
  postToHost({
    type: 'saveConfigPreference',
    key,
    value,
  })
}

export function openExternalUrl(url: string): void {
  postToHost({
    type: 'openExternal',
    url,
  })
}

export function addToChat(text: string, startLine?: number, endLine?: number): void {
  postToHost({
    type: 'addToChat',
    text,
    startLine,
    endLine,
  })
}


/**
 * Convert `/api/fs/raw/...` or `/api/fs/thumb?...` URLs on live DOM elements
 * into VSCode Webview resource URIs so local images/audio/video render directly.
 *
 * Note: This runs on the mounted preview DOM (`MarkdownPreview.vue` / `MediaPreviewBody.vue`)
 * while `buildMarkdownPreviewDom` still produces `/api/fs/raw/...` in string output,
 * keeping `exportMarkdownHtml.ts` (which matches `/api/fs/raw/...` in a detached container)
 * 100% compatible.
 */
export function resolveLocalMediaInContainer(container: ParentNode | null): void {
  if (!container) return
  const rootUri = documentState.webviewRootUri.replace(/\/+$/, '')

  const rewriteUrl = (rawUrl: string): { immediate?: string; asyncPath?: string; cacheBust?: string } | null => {
    if (!rawUrl || !rawUrl.startsWith('/api/fs/')) return null

    // 1. /api/fs/raw/?target=<encodedAbsPath>&t=...
    if (rawUrl.startsWith('/api/fs/raw/?') || rawUrl.startsWith('/api/fs/raw?')) {
      const qIdx = rawUrl.indexOf('?')
      const params = new URLSearchParams(rawUrl.slice(qIdx + 1))
      const target = params.get('target')
      const t = params.get('t')
      if (target) {
        return { asyncPath: target, cacheBust: t || undefined }
      }
      return null
    }

    // 2. /api/fs/raw/<encodedRel>?t=...
    const rawMatch = rawUrl.match(/^\/api\/fs\/raw\/([^?]+)(?:\?(.*))?$/)
    if (rawMatch) {
      const relEncoded = rawMatch[1]
      const query = rawMatch[2] || ''
      if (rootUri) {
        return { immediate: `${rootUri}/${relEncoded}${query ? '?' + query : ''}` }
      }
      try {
        return { asyncPath: decodeURIComponent(relEncoded) }
      } catch {
        return { asyncPath: relEncoded }
      }
    }

    // 3. /api/fs/thumb?target=<encodedPath>&w=...
    if (rawUrl.startsWith('/api/fs/thumb')) {
      const qIdx = rawUrl.indexOf('?')
      const params = new URLSearchParams(qIdx >= 0 ? rawUrl.slice(qIdx + 1) : '')
      const target = params.get('target')
      if (!target) return null
      if (target.startsWith('/') || /^[A-Za-z]:[/\\]/.test(target)) {
        return { asyncPath: target }
      }
      // Project-relative path
      const encodedSegments = target
        .split('/')
        .map(s => encodeURIComponent(s))
        .join('/')
      if (rootUri) {
        return { immediate: `${rootUri}/${encodedSegments}` }
      }
      return { asyncPath: target }
    }

    return null
  }

  const elements = container.querySelectorAll<HTMLElement>('img, audio, video, source')
  elements.forEach((el) => {
    const src = el.getAttribute('src')
    const fullSrc = el.getAttribute('data-full-src')

    if (fullSrc) {
      const resolvedFull = rewriteUrl(fullSrc)
      if (resolvedFull?.immediate) {
        el.setAttribute('data-full-src', resolvedFull.immediate)
      } else if (resolvedFull?.asyncPath) {
        void rpcCall<{ uri: string }>('getWebviewUri', { path: resolvedFull.asyncPath }).then((res) => {
          if (res?.uri) {
            const suffix = resolvedFull.cacheBust ? `?t=${resolvedFull.cacheBust}` : ''
            el.setAttribute('data-full-src', res.uri + suffix)
          }
        }).catch(() => {})
      }
    }

    if (src) {
      const resolvedSrc = rewriteUrl(src)
      if (resolvedSrc?.immediate) {
        el.setAttribute('src', resolvedSrc.immediate)
      } else if (resolvedSrc?.asyncPath) {
        void rpcCall<{ uri: string }>('getWebviewUri', { path: resolvedSrc.asyncPath }).then((res) => {
          if (res?.uri) {
            const suffix = resolvedSrc.cacheBust ? `?t=${resolvedSrc.cacheBust}` : ''
            el.setAttribute('src', res.uri + suffix)
          }
        }).catch(() => {})
      }
    }
  })
}

let fetchIntercepted = false

/**
 * Intercept `/api/...` fetch requests inside the VSCode Webview and route them
 * over the Extension Host message bridge.
 */
export function installFetchInterceptor(): void {
  if (fetchIntercepted || typeof window === 'undefined') return
  fetchIntercepted = true

  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url

    // Only intercept relative /api/ calls when VSCode API is active
    if (!urlStr.startsWith('/api/') || !getVsCodeApi()) {
      return originalFetch(input, init)
    }

    try {
      const parsedUrl = new URL(urlStr, 'http://localhost')
      const pathname = parsedUrl.pathname
      const method = (init?.method || 'GET').toUpperCase()

      if (pathname === '/api/client-log') {
        return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
      }

      if (pathname === '/api/file/batch-exists' && method === 'POST') {
        const bodyText = typeof init?.body === 'string' ? init.body : '{}'
        const body = JSON.parse(bodyText) as { paths?: string[] }
        const res = await rpcCall<{ results: Record<string, string> }>('batchExists', {
          paths: body.paths || [],
        })
        return new Response(JSON.stringify(res), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (pathname === '/api/file/batch-base64' && method === 'POST') {
        const bodyText = typeof init?.body === 'string' ? init.body : '{}'
        const body = JSON.parse(bodyText) as { paths?: string[] }
        const res = await rpcCall<{
          results: Record<string, { mime: string; data: string }>
          skipped?: Array<{ path: string; reason: string }>
        }>('batchBase64', {
          paths: body.paths || [],
        })
        return new Response(JSON.stringify(res), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (
        (pathname === '/api/file' ||
          pathname === '/api/fs/file' ||
          pathname.startsWith('/api/fs/file/')) &&
        method === 'GET'
      ) {
        let path = parsedUrl.searchParams.get('target') || parsedUrl.searchParams.get('path') || ''
        if (!path && pathname.startsWith('/api/fs/file/')) {
          path = decodeURIComponent(pathname.slice('/api/fs/file/'.length))
        }
        const startLineStr = parsedUrl.searchParams.get('lineStart') || parsedUrl.searchParams.get('startLine')
        const endLineStr = parsedUrl.searchParams.get('lineEnd') || parsedUrl.searchParams.get('endLine')
        const res = await rpcCall<{
          status?: number
          error?: string
          data?: Record<string, unknown>
        }>('readFile', {
          path,
          startLine: startLineStr ? parseInt(startLineStr, 10) : undefined,
          endLine: endLineStr ? parseInt(endLineStr, 10) : undefined,
        })
        if (res.status && res.status >= 400) {
          return new Response(JSON.stringify({ error: res.error || 'Failed to read file' }), {
            status: res.status,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return new Response(JSON.stringify(res.data || res), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if ((pathname === '/api/dir' || pathname === '/api/projects') && method === 'GET') {
        const path = parsedUrl.searchParams.get('path') || ''
        const res = await rpcCall<{
          status?: number
          error?: string
          items?: unknown[]
        }>('readDir', { path })
        if (res.status && res.status >= 400) {
          return new Response(JSON.stringify({ error: res.error || 'Not a directory' }), {
            status: res.status,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return new Response(JSON.stringify({ items: res.items || [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (pathname.startsWith('/api/fs/raw')) {
        let targetPath = parsedUrl.searchParams.get('target') || ''
        if (!targetPath && pathname.startsWith('/api/fs/raw/')) {
          targetPath = decodeURIComponent(pathname.slice('/api/fs/raw/'.length))
        }
        const res = await rpcCall<{
          results: Record<string, { mime: string; data: string }>
        }>('batchBase64', { paths: [targetPath] })
        const item = res.results?.[targetPath]
        if (!item) {
          return new Response('Not found', { status: 404 })
        }
        const binary = atob(item.data)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i)
        }
        return new Response(bytes, {
          status: 200,
          headers: { 'Content-Type': item.mime || 'application/octet-stream' },
        })
      }
    } catch (err) {
      appLog.w('VsCodeBridge', 'Intercepted fetch failed', { url: urlStr, error: String(err) })
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unsupported endpoint in VSCode extension' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export function handleHostMessage(event: MessageEvent): void {
  const msg = event.data
  if (!msg || typeof msg !== 'object') return

  if (msg.type === 'rpcResponse') {
    const pending = pendingRpcs.get(msg.reqId)
    if (pending) {
      clearTimeout(pending.timer)
      pendingRpcs.delete(msg.reqId)
      if (msg.error) {
        pending.reject(new Error(String(msg.error)))
      } else {
        pending.resolve(msg.result)
      }
    }
    return
  }

  if (msg.type === 'updateDocument') {
    if (typeof msg.path === 'string') documentState.path = msg.path
    if (typeof msg.relativePath === 'string') documentState.relativePath = msg.relativePath
    if (typeof msg.name === 'string') documentState.name = msg.name
    if (typeof msg.content === 'string') documentState.content = msg.content
    if (typeof msg.projectRoot === 'string') documentState.projectRoot = msg.projectRoot
    if (typeof msg.homeDir === 'string') documentState.homeDir = msg.homeDir
    if (typeof msg.webviewRootUri === 'string') documentState.webviewRootUri = msg.webviewRootUri
    if (typeof msg.themeSetting === 'string') documentState.themeSetting = msg.themeSetting
    if (msg.vscodeColorKind === 'light' || msg.vscodeColorKind === 'dark') {
      documentState.vscodeColorKind = msg.vscodeColorKind
    }
    if (typeof msg.locale === 'string' && (msg.locale === 'zh' || msg.locale === 'en')) {
      documentState.locale = msg.locale
    }
    if (typeof msg.tableRowExpand === 'boolean') {
      window.dispatchEvent(
        new CustomEvent('clawbench-vscode-config-updated', {
          detail: { key: 'tableRowExpand', value: msg.tableRowExpand },
        }),
      )
    }
    bridgeReady.value = true
    window.dispatchEvent(new CustomEvent('clawbench-vscode-doc-updated', { detail: msg }))
    if (typeof msg.targetLine === 'number' && msg.targetLine > 0) {
      window.dispatchEvent(
        new CustomEvent('clawbench-vscode-scroll-to-line', {
          detail: { line: msg.targetLine },
        }),
      )
    }
    return
  }

  if (msg.type === 'updateConfig' && typeof msg.key === 'string') {
    window.dispatchEvent(new CustomEvent('clawbench-vscode-config-updated', { detail: msg }))
    return
  }

  if (msg.type === 'scrollToLine' && typeof msg.line === 'number' && msg.line > 0) {
    window.dispatchEvent(
      new CustomEvent('clawbench-vscode-scroll-to-line', {
        detail: { line: msg.line },
      }),
    )
    return
  }

  if (msg.type === 'updateTheme') {
    if (typeof msg.themeSetting === 'string') documentState.themeSetting = msg.themeSetting
    if (msg.vscodeColorKind === 'light' || msg.vscodeColorKind === 'dark') {
      documentState.vscodeColorKind = msg.vscodeColorKind
    }
    window.dispatchEvent(new CustomEvent('clawbench-vscode-theme-updated', { detail: msg }))
    return
  }

  if (msg.type === 'command') {
    window.dispatchEvent(new CustomEvent('clawbench-vscode-command', { detail: msg.command }))
  }
}
