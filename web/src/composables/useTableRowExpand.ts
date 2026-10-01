import { ref, computed } from 'vue'
import { parseTableDataFromElement, onTableMouseDown as onTableMouseDownRaw, onTableTouchStart as onTableTouchStartRaw, isTableDragClick } from '@/utils/tableRowExpand.ts'
import { usePlatformDetect } from '@/composables/usePlatformDetect.ts'
import { useSettingsConfig } from '@/composables/useSettingsConfig.ts'

export interface UseTableRowExpandOptions {
  enabled?: () => boolean
}

/**
 * Composable for table row expand modal.
 * Provides modal state, navigation, drag guard, and a unified click handler.
 * Used by ChatMessageList, ToolDetailDrawer, TaskExecDetail, and MarkdownPreview.
 *
 * Gated by marklens.tableRowExpand (default false).
 */
export function useTableRowExpand(options?: UseTableRowExpandOptions) {
  const tableRowModal = ref<{ headers: string[], rows: string[][], currentIndex: number } | null>(null)
  const { isPC } = usePlatformDetect()
  const { localConfig } = useSettingsConfig()

  const isEnabled = computed(() => {
    if (options?.enabled) return options.enabled()
    return localConfig.tableRowExpand === true
  })

  function closeTableRowModal() {
    tableRowModal.value = null
  }

  function tableRowPrev() {
    if (tableRowModal.value && tableRowModal.value.currentIndex > 0) {
      tableRowModal.value.currentIndex--
    }
  }

  function tableRowNext() {
    if (tableRowModal.value && tableRowModal.value.currentIndex < tableRowModal.value.rows.length - 1) {
      tableRowModal.value.currentIndex++
    }
  }

  /**
   * Handle a click event that may be on a table data row.
   * Returns true if a table row was clicked and the modal was opened.
   * Returns false if the click was not on a table row or feature is disabled.
   */
  function handleTableRowClick(event: MouseEvent | PointerEvent): boolean {
    if (!isEnabled.value) return false

    const target = event.target as HTMLElement
    // Skip if click target is an interactive element inside the cell (the
    // figure header view button, so the Lightbox handler opens it), or a
    // path/commit/worktree annotation (so clicks on those reach the
    // preview / commit / worktree handlers instead of opening the row modal).
    if (target.closest('a, button, [contenteditable], input, select, textarea, .image-block-view-btn, .chat-file-path, .chat-file-open-btn, .chat-commit-hash, .chat-commit-open-btn, .chat-worktree-btn')) return false
    const tr = target.closest('tbody tr[data-row-idx]')
    if (!tr || isTableDragClick(event)) return false
    event.preventDefault()
    event.stopPropagation()
    const table = tr.closest('table[data-table-idx]') as HTMLTableElement | null
    if (!table) return false
    const rowIndex = parseInt((tr as HTMLElement).getAttribute('data-row-idx') || '0', 10)
    const data = parseTableDataFromElement(table)
    if (data && data.rows.length > 0) {
      tableRowModal.value = {
        headers: data.headers,
        rows: data.rows,
        currentIndex: rowIndex,
      }
    }
    return true
  }

  function onTableMouseDown(event: MouseEvent) {
    if (!isEnabled.value) return
    onTableMouseDownRaw(event)
  }

  function onTableTouchStart(event: TouchEvent) {
    if (!isEnabled.value) return
    onTableTouchStartRaw(event)
  }

  return {
    tableRowModal,
    isEnabled,
    closeTableRowModal,
    tableRowPrev,
    tableRowNext,
    handleTableRowClick,
    onTableMouseDown,
    onTableTouchStart,
  }
}
