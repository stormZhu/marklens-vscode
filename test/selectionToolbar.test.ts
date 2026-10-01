import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import {
  extractSourceLineRange,
  computeToolbarPosition,
  useSelectionToolbar,
} from '@/composables/useSelectionToolbar'
import SelectionToolbar from '@/components/file/SelectionToolbar.vue'
import * as vscodeBridge from '@/bridge/vscodeBridge'
import { handleAddToChat } from '../src/extension/extension'

describe('Selection Floating Toolbar & Add to Chat', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  describe('extractSourceLineRange', () => {
    it('extracts startLine and endLine from a single paragraph with data-source-line', () => {
      const root = document.createElement('div')
      root.innerHTML = '<p data-source-line="10">Hello <b>World</b></p>'
      const p = root.querySelector('p')!
      const b = root.querySelector('b')!

      const range = document.createRange()
      range.setStart(p.firstChild!, 0)
      range.setEnd(b.firstChild!, 5)

      const res = extractSourceLineRange(range, root)
      expect(res).toEqual({ startLine: 10, endLine: 10 })
    })

    it('extracts range spanning multiple blocks with data-source-line and data-source-end', () => {
      const root = document.createElement('div')
      root.innerHTML = `
        <h2 data-source-line="4">Heading</h2>
        <p data-source-line="6">Paragraph 1</p>
        <pre data-source-line="8" data-source-end="15"><code>const a = 1;</code></pre>
      `
      const h2 = root.querySelector('h2')!
      const code = root.querySelector('code')!

      const range = document.createRange()
      range.setStart(h2.firstChild!, 0)
      range.setEnd(code.firstChild!, 5)

      const res = extractSourceLineRange(range, root)
      expect(res).toEqual({ startLine: 4, endLine: 15 })
    })

    it('falls back gracefully when elements lack data-source-line', () => {
      const root = document.createElement('div')
      root.innerHTML = '<div><span>No line attribute</span></div>'
      const span = root.querySelector('span')!

      const range = document.createRange()
      range.setStart(span.firstChild!, 0)
      range.setEnd(span.firstChild!, 5)

      const res = extractSourceLineRange(range, root)
      expect(res.startLine).toBeGreaterThanOrEqual(1)
      expect(res.endLine).toBeGreaterThanOrEqual(res.startLine)
    })
  })

  describe('computeToolbarPosition', () => {
    it('places toolbar above selection when there is sufficient room at the top', () => {
      const mockRange = {
        getBoundingClientRect: () => ({
          top: 150,
          bottom: 170,
          left: 100,
          right: 200,
          width: 100,
          height: 20,
        }),
      } as unknown as Range

      const pos = computeToolbarPosition(mockRange)
      expect(pos.placement).toBe('top')
      expect(pos.top).toBe(150 - 8) // rect.top - margin
      expect(pos.left).toBe(100 + 50) // rect.left + width / 2
    })

    it('places toolbar below selection when too close to the top of viewport', () => {
      const mockRange = {
        getBoundingClientRect: () => ({
          top: 20,
          bottom: 40,
          left: 200,
          right: 300,
          width: 100,
          height: 20,
        }),
      } as unknown as Range

      const pos = computeToolbarPosition(mockRange)
      expect(pos.placement).toBe('bottom')
      expect(pos.top).toBe(40 + 8) // rect.bottom + margin
    })

    it('clamps horizontal position within viewport bounds', () => {
      const leftOverflowRange = {
        getBoundingClientRect: () => ({
          top: 100,
          bottom: 120,
          left: 10,
          right: 30,
          width: 20,
          height: 20,
        }),
      } as unknown as Range

      const posLeft = computeToolbarPosition(leftOverflowRange)
      expect(posLeft.left).toBeGreaterThanOrEqual(120) // minLeft clamped
    })
  })

  describe('useSelectionToolbar actions', () => {
    it('dispatches addToChat with text and source lines', () => {
      const postSpy = vi.spyOn(vscodeBridge, 'addToChat').mockImplementation(() => {})
      const containerRef = ref<HTMLElement | null>(document.createElement('div'))

      const toolbar = useSelectionToolbar(containerRef)
      toolbar.selectedText.value = 'Selected markdown content'
      toolbar.startLine.value = 12
      toolbar.endLine.value = 18
      toolbar.visible.value = true

      toolbar.handleAddToChat()

      expect(postSpy).toHaveBeenCalledWith('Selected markdown content', 12, 18)
      expect(toolbar.visible.value).toBe(false)
    })

    it('dispatches switchToNativeTextEditor when editing source', () => {
      const switchSpy = vi.spyOn(vscodeBridge, 'switchToNativeTextEditor').mockImplementation(() => {})
      const containerRef = ref<HTMLElement | null>(document.createElement('div'))

      const toolbar = useSelectionToolbar(containerRef)
      toolbar.startLine.value = 25
      toolbar.visible.value = true

      toolbar.handleEditSource()

      expect(switchSpy).toHaveBeenCalledWith(25, true)
      expect(toolbar.visible.value).toBe(false)
    })

    it('copies text and hides toolbar', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      })
      const containerRef = ref<HTMLElement | null>(document.createElement('div'))

      const toolbar = useSelectionToolbar(containerRef)
      toolbar.selectedText.value = 'Text to copy'
      toolbar.visible.value = true

      await toolbar.handleCopy()

      expect(writeTextMock).toHaveBeenCalledWith('Text to copy')
      expect(toolbar.visible.value).toBe(false)
    })
  })

  describe('Extension Host handleAddToChat', () => {
    const mockUri = {
      toString: () => 'file:///project/doc.md',
      fsPath: '/project/doc.md',
      scheme: 'file',
    } as any

    it('invokes Trae workbench.action.chat.icube.open when available', async () => {
      const vscode = await import('vscode')
      const executeCommandSpy = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined as any)
      vi.spyOn(vscode.commands, 'getCommands').mockResolvedValue(['workbench.action.chat.icube.open'])

      const handled = await handleAddToChat(mockUri, 'Hello from Trae', 5, 10)
      expect(handled).toBe(true)
      expect(executeCommandSpy).toHaveBeenCalledWith('workbench.action.chat.icube.open', {
        addToChat: true,
        keepOpen: true,
        docviewPayload: {
          uri: mockUri,
          selection: {
            startLineNumber: 5,
            startColumn: 1,
            endLineNumber: 10,
            endColumn: 1,
          },
          markdownSelection: 'Hello from Trae',
        },
      })
    })

    it('falls back to workbench.action.chat.open when Trae command is absent', async () => {
      const vscode = await import('vscode')
      const executeCommandSpy = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined as any)
      vi.spyOn(vscode.commands, 'getCommands').mockResolvedValue(['workbench.action.chat.open'])
      vi.spyOn(vscode.workspace, 'asRelativePath').mockReturnValue('doc.md')

      const handled = await handleAddToChat(mockUri, 'Copilot chat text', 3, 7)
      expect(handled).toBe(true)
      expect(executeCommandSpy).toHaveBeenCalledWith('workbench.action.chat.open', {
        query: '#file:doc.md:3-7\nCopilot chat text\n',
      })
    })

    it('falls back to clipboard when no AI chat commands are registered', async () => {
      const vscode = await import('vscode')
      vi.spyOn(vscode.commands, 'getCommands').mockResolvedValue([])
      const writeTextSpy = vi.spyOn(vscode.env.clipboard, 'writeText').mockResolvedValue(undefined)
      const infoSpy = vi.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined as any)

      const handled = await handleAddToChat(mockUri, 'Clipboard fallback text', 8, 8)
      expect(handled).toBe(true)
      expect(writeTextSpy).toHaveBeenCalledWith('Clipboard fallback text')
      expect(infoSpy).toHaveBeenCalled()
    })
  })

  describe('SelectionToolbar component mount smoke test', () => {
    it('mounts without throwing runtime errors', () => {
      const container = document.createElement('div')
      const wrapper = mount(SelectionToolbar, {
        props: {
          containerRef: container,
        },
      })
      expect(wrapper.exists()).toBe(true)
      wrapper.unmount()
    })
  })
})
