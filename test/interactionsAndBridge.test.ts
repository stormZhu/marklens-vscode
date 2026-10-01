import { describe, it, expect, beforeEach } from 'vitest'
import { useTableRowExpand } from '@/composables/useTableRowExpand'
import { resolveThemeId, THEMES } from '@/utils/themeMeta'
import {
  documentState,
  handleHostMessage,
  installFetchInterceptor,
  resolveLocalMediaInContainer,
} from '@/bridge/vscodeBridge'

describe('Desktop Table Row Click-to-Expand & VSCode Webview Bridge', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-vscode-color-kind')
    document.body.className = ''
  })

  it('does not open TableRowModal by default when tableRowExpand is disabled', () => {
    const { tableRowModal, handleTableRowClick, isEnabled } = useTableRowExpand()
    expect(isEnabled.value).toBe(false)

    const wrapper = document.createElement('div')
    wrapper.innerHTML = `
      <table data-table-idx="0">
        <thead><tr><th>Path</th><th>Role</th></tr></thead>
        <tbody>
          <tr data-row-idx="0"><td>internal/agenttool</td><td>Core interface</td></tr>
        </tbody>
      </table>
    `
    const firstRowTd = wrapper.querySelector('tbody tr[data-row-idx="0"] td') as HTMLElement
    const clickEvent = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(clickEvent, 'target', { value: firstRowTd })

    const handled = handleTableRowClick(clickEvent)
    expect(handled).toBe(false)
    expect(tableRowModal.value).toBeNull()
  })

  it('opens TableRowModal when tableRowExpand is enabled', () => {
    const { tableRowModal, handleTableRowClick, closeTableRowModal, isEnabled } = useTableRowExpand({
      enabled: () => true,
    })
    expect(isEnabled.value).toBe(true)

    const wrapper = document.createElement('div')
    wrapper.innerHTML = `
      <table data-table-idx="0">
        <thead><tr><th>Path</th><th>Role</th></tr></thead>
        <tbody>
          <tr data-row-idx="0"><td>internal/agenttool</td><td>Core interface</td></tr>
          <tr data-row-idx="1"><td>internal/bash</td><td>Shell execution</td></tr>
        </tbody>
      </table>
    `
    const firstRowTd = wrapper.querySelector('tbody tr[data-row-idx="0"] td') as HTMLElement
    const clickEvent = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(clickEvent, 'target', { value: firstRowTd })

    const handled = handleTableRowClick(clickEvent)
    expect(handled).toBe(true)
    expect(tableRowModal.value).not.toBeNull()
    expect(tableRowModal.value?.headers).toEqual(['Path', 'Role'])
    expect(tableRowModal.value?.currentIndex).toBe(0)
    expect(tableRowModal.value?.rows.length).toBe(2)

    closeTableRowModal()
    expect(tableRowModal.value).toBeNull()
  })

  it('does not open TableRowModal when clicking an interactive file-path chip inside a cell even when enabled', () => {
    const { tableRowModal, handleTableRowClick } = useTableRowExpand({
      enabled: () => true,
    })

    const wrapper = document.createElement('div')
    wrapper.innerHTML = `
      <table data-table-idx="0">
        <thead><tr><th>Path</th></tr></thead>
        <tbody>
          <tr data-row-idx="0">
            <td><span class="chat-file-path" data-file-path="internal/agenttool">internal/agenttool</span></td>
          </tr>
        </tbody>
      </table>
    `
    const chip = wrapper.querySelector('.chat-file-path') as HTMLElement
    const clickEvent = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(clickEvent, 'target', { value: chip })

    expect(handleTableRowClick(clickEvent)).toBe(false)
    expect(tableRowModal.value).toBeNull()
  })

  it('resolves auto theme from VSCode color kind and supports all 36 themes', () => {
    expect(THEMES.length).toBe(36)

    document.documentElement.setAttribute('data-vscode-color-kind', 'light')
    expect(resolveThemeId('auto')).toBe('bluloco-light')

    document.documentElement.setAttribute('data-vscode-color-kind', 'dark')
    expect(resolveThemeId('auto')).toBe('bluloco-dark')

    expect(resolveThemeId('tokyo-night')).toBe('tokyo-night')
    expect(resolveThemeId('catppuccin-latte')).toBe('catppuccin-latte')
  })

  it('rewrites /api/fs/raw and /api/fs/thumb image URLs to webviewRootUri in live DOM', () => {
    documentState.webviewRootUri = 'https://file+.vscode-resource.vscode-cdn.net/workspace'

    const div = document.createElement('div')
    div.innerHTML = `
      <img src="/api/fs/thumb?target=docs%2Farch.png&w=800" data-full-src="/api/fs/raw/docs/arch.png?t=99" />
    `
    resolveLocalMediaInContainer(div)

    const img = div.querySelector('img')!
    expect(img.getAttribute('src')).toBe(
      'https://file+.vscode-resource.vscode-cdn.net/workspace/docs/arch.png',
    )
    expect(img.getAttribute('data-full-src')).toBe(
      'https://file+.vscode-resource.vscode-cdn.net/workspace/docs/arch.png?t=99',
    )
  })

  it('intercepts /api/file/batch-exists and /api/fs/file via VSCode message RPC', async () => {
    window.__CLAWBENCH_VSCODE_API__ = {
      postMessage(msg: unknown) {
        const m = msg as { type: string; reqId: number; method: string; params: Record<string, unknown> }
        if (m.type === 'rpcRequest') {
          if (m.method === 'batchExists') {
            handleHostMessage(
              new MessageEvent('message', {
                data: {
                  type: 'rpcResponse',
                  reqId: m.reqId,
                  result: { results: { 'internal/agenttool': 'dir', 'main.go': 'file' } },
                },
              }),
            )
          } else if (m.method === 'readFile') {
            handleHostMessage(
              new MessageEvent('message', {
                data: {
                  type: 'rpcResponse',
                  reqId: m.reqId,
                  result: {
                    data: {
                      name: 'main.go',
                      path: 'main.go',
                      content: 'package main\nfunc main() {}',
                      supported: true,
                      size: 27,
                      totalLines: 2,
                      windowStart: 1,
                      windowEnd: 2,
                    },
                  },
                },
              }),
            )
          }
        }
      },
      getState: () => ({}),
      setState: () => {},
    }

    installFetchInterceptor()

    const batchResp = await fetch('/api/file/batch-exists', {
      method: 'POST',
      body: JSON.stringify({ paths: ['internal/agenttool', 'main.go'] }),
    })
    expect(batchResp.ok).toBe(true)
    const batchData = await batchResp.json()
    expect(batchData.results).toEqual({
      'internal/agenttool': 'dir',
      'main.go': 'file',
    })

    const fileResp = await fetch('/api/fs/file/main.go?lineStart=1&lineEnd=2')
    expect(fileResp.ok).toBe(true)
    const fileData = await fileResp.json()
    expect(fileData.content).toBe('package main\nfunc main() {}')
    expect(fileData.windowStart).toBe(1)
    expect(fileData.windowEnd).toBe(2)
  })

  it('forwards host commands (toggleViewMode, switchToSource) via CustomEvent', () => {
    const received: string[] = []
    const listener = (e: Event) => {
      received.push((e as CustomEvent<string>).detail)
    }
    window.addEventListener('clawbench-vscode-command', listener)
    try {
      handleHostMessage(
        new MessageEvent('message', {
          data: { type: 'command', command: 'toggleViewMode' },
        }),
      )
      handleHostMessage(
        new MessageEvent('message', {
          data: { type: 'command', command: 'switchToSource' },
        }),
      )
      expect(received).toEqual(['toggleViewMode', 'switchToSource'])
    } finally {
      window.removeEventListener('clawbench-vscode-command', listener)
    }
  })

  it('dispatches clawbench-vscode-scroll-to-line on updateDocument targetLine and scrollToLine messages', () => {
    const lines: number[] = []
    const listener = (e: Event) => {
      const detail = (e as CustomEvent<{ line: number }>).detail
      lines.push(detail.line)
    }
    window.addEventListener('clawbench-vscode-scroll-to-line', listener)
    try {
      handleHostMessage(
        new MessageEvent('message', {
          data: {
            type: 'updateDocument',
            path: '/workspace/README.md',
            content: '# Title',
            targetLine: 42,
          },
        }),
      )
      handleHostMessage(
        new MessageEvent('message', {
          data: {
            type: 'scrollToLine',
            line: 108,
          },
        }),
      )
      expect(lines).toEqual([42, 108])
    } finally {
      window.removeEventListener('clawbench-vscode-scroll-to-line', listener)
    }
  })
})
