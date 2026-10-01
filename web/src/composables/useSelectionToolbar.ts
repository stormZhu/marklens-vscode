import { ref, computed, onMounted, onBeforeUnmount, getCurrentInstance, type Ref } from 'vue'
import { addToChat, switchToNativeTextEditor } from '@/bridge/vscodeBridge'
import { useToast } from '@/composables/useToast'
import { gt } from '@/composables/useLocale'
import { localConfig } from '@/composables/useSettingsConfig'

/**
 * Extract source line range (1-based) from a DOM Range inside a rendered Markdown body.
 * Traverses upwards from startContainer and endContainer to find elements with data-source-line / data-source-end.
 */
export function extractSourceLineRange(
  range: Range,
  rootEl?: HTMLElement | null,
): { startLine: number; endLine: number } {
  const getLineFromNode = (node: Node | null, preferEnd = false): number | null => {
    let curr: Node | null = node
    while (curr && curr !== rootEl) {
      if (curr.nodeType === Node.ELEMENT_NODE) {
        const el = curr as HTMLElement
        if (preferEnd) {
          const endAttr = el.getAttribute('data-source-end')
          if (endAttr) {
            const parsed = parseInt(endAttr, 10)
            if (!isNaN(parsed) && parsed > 0) return parsed
          }
        }
        const lineAttr = el.getAttribute('data-source-line')
        if (lineAttr) {
          const parsed = parseInt(lineAttr, 10)
          if (!isNaN(parsed) && parsed > 0) return parsed
        }
      }
      curr = curr.parentNode
    }
    return null
  }

  const sLine = getLineFromNode(range.startContainer, false) ?? 1
  const eLine = getLineFromNode(range.endContainer, true) ?? sLine

  return {
    startLine: Math.min(sLine, eLine),
    endLine: Math.max(sLine, eLine),
  }
}

export function computeToolbarPosition(range: Range): {
  top: number
  left: number
  placement: 'top' | 'bottom'
} {
  const rect = range.getBoundingClientRect()
  const toolbarHeight = 36
  const toolbarEstimatedHalfWidth = 110
  const margin = 8

  let placement: 'top' | 'bottom' = 'top'
  let top = rect.top - margin
  if (rect.top < toolbarHeight + margin + 40) {
    placement = 'bottom'
    top = rect.bottom + margin
  }

  let left = rect.left + rect.width / 2
  const minLeft = toolbarEstimatedHalfWidth + 12
  const maxLeft =
    (typeof window !== 'undefined' ? window.innerWidth : 1000) -
    toolbarEstimatedHalfWidth -
    12
  left = Math.max(minLeft, Math.min(maxLeft, left))

  return { top, left, placement }
}

export interface UseSelectionToolbarOptions {
  enabled?: () => boolean
}

export function useSelectionToolbar(
  containerRef: Ref<HTMLElement | null>,
  toolbarElRef?: Ref<HTMLElement | null>,
  options: UseSelectionToolbarOptions = {},
) {
  const visible = ref(false)
  const position = ref({ top: 0, left: 0 })
  const placement = ref<'top' | 'bottom'>('top')
  const selectedText = ref('')
  const startLine = ref(1)
  const endLine = ref(1)

  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
  const shortcutKey = isMac ? '⌘U' : 'Ctrl+U'

  let isPointerDown = false
  let checkTimer: ReturnType<typeof setTimeout> | null = null

  const isEnabled = () => {
    if (options.enabled && !options.enabled()) return false
    return localConfig.selectionToolbar !== false
  }

  function hide() {
    visible.value = false
  }

  function updateSelection() {
    if (!isEnabled() || isPointerDown) return

    const root = containerRef.value
    if (!root) {
      hide()
      return
    }

    const sel = typeof window !== 'undefined' ? window.getSelection() : null
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      hide()
      return
    }

    const text = sel.toString().trim()
    if (!text) {
      hide()
      return
    }

    const range = sel.getRangeAt(0)
    // Check if selection is inside container
    const isInsideContainer =
      root.contains(range.commonAncestorContainer) ||
      root.contains(range.startContainer) ||
      root.contains(range.endContainer)

    if (!isInsideContainer) {
      hide()
      return
    }

    // Ignore if selecting inside inputs/textareas
    const startParent = range.startContainer.parentElement
    if (startParent?.closest('input, textarea, [contenteditable="true"]')) {
      hide()
      return
    }

    const { startLine: sLine, endLine: eLine } = extractSourceLineRange(range, root)
    const { top, left, placement: pl } = computeToolbarPosition(range)

    selectedText.value = text
    startLine.value = sLine
    endLine.value = eLine
    position.value = { top, left }
    placement.value = pl
    visible.value = true
  }

  function scheduleUpdateSelection(delay = 50) {
    if (checkTimer) clearTimeout(checkTimer)
    checkTimer = setTimeout(() => {
      updateSelection()
    }, delay)
  }

  function handleAddToChat() {
    if (!selectedText.value) return
    addToChat(selectedText.value, startLine.value, endLine.value)
    hide()
  }

  function handleEditSource() {
    switchToNativeTextEditor(startLine.value, true)
    hide()
  }

  async function handleCopy() {
    if (!selectedText.value) return
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(selectedText.value)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = selectedText.value
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      const toast = useToast()
      toast.show(gt('selectionToolbar.copied') || '已复制选中文本', {
        type: 'success',
        duration: 2000,
      })
    } catch {
      // Fallback
    }
    hide()
  }

  function onPointerDown(e: MouseEvent | TouchEvent) {
    const target = e.target as HTMLElement | null
    // If clicking inside the floating toolbar, do not hide or reset selection
    if (toolbarElRef?.value && target && toolbarElRef.value.contains(target)) {
      return
    }
    isPointerDown = true
    hide()
  }

  function onPointerUp() {
    isPointerDown = false
    scheduleUpdateSelection(20)
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.key === 'Shift' || e.key.startsWith('Arrow')) {
      scheduleUpdateSelection(30)
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey
    if (isCmdOrCtrl && (e.key === 'u' || e.key === 'U')) {
      const sel = typeof window !== 'undefined' ? window.getSelection() : null
      if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
        e.preventDefault()
        e.stopPropagation()
        const text = sel.toString().trim()
        const range = sel.getRangeAt(0)
        const root = containerRef.value
        const { startLine: sLine, endLine: eLine } = extractSourceLineRange(range, root)
        addToChat(text, sLine, eLine)
        hide()
      }
    }
  }

  function onScroll() {
    if (visible.value) {
      hide()
    }
  }

  if (getCurrentInstance()) {
    onMounted(() => {
      if (typeof window === 'undefined') return
      window.addEventListener('pointerdown', onPointerDown, { passive: true })
      window.addEventListener('pointerup', onPointerUp, { passive: true })
      window.addEventListener('keyup', onKeyUp, { passive: true })
      window.addEventListener('keydown', onKeyDown)
      window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    })

    onBeforeUnmount(() => {
      if (typeof window === 'undefined') return
      if (checkTimer) clearTimeout(checkTimer)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll, { capture: true })
    })
  }

  return {
    visible,
    position,
    placement,
    selectedText,
    startLine,
    endLine,
    shortcutKey,
    handleAddToChat,
    handleEditSource,
    handleCopy,
    hide,
    updateSelection,
  }
}
