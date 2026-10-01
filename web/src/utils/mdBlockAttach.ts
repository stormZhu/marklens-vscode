/**
 * Attach a rendered markdown CODE BLOCK or TABLE to the chat as a reference to
 * the markdown file's source line range.
 *
 * The shared markdown pipeline stamps every fenced-code `<pre>` and `<table>`
 * with `data-source-line` / `data-source-end` (1-based inclusive source range,
 * see web/src/utils/markedConfig.ts). The header annotator (useCodeBlockHeader)
 * adds a paperclip `.code-block-attach-btn` / `.table-block-attach-btn` to each
 * block's header actions. Tapping it in a FILE-PREVIEW context attaches that
 * line range to Trae / VS Code AI chat.
 */

import { isShareMode } from '@/share/shareMode'
import { addToChat } from '@/bridge/vscodeBridge'
import { tableToMarkdown } from '@/composables/useCodeBlockHeader'
import type { MermaidAttachActions as RangedAttachActions } from '@/utils/mdMermaidAttach'
export type { RangedAttachActions }

/** Selectors of the header attach buttons injected by useCodeBlockHeader. */
export const BLOCK_ATTACH_BTN = '.code-block-attach-btn, .table-block-attach-btn'

export interface BlockRangeHit {
  /** 'code' when from a code block, 'table' when from a table block. */
  kind: 'code' | 'table'
  /** Markdown file path from `.markdown-body[data-file-path]`. */
  path: string
  /** 1-based first source line of the block. */
  startLine: number
  /** 1-based last source line of the block (inclusive). */
  endLine: number
  /** The block element (`pre` / `table`) whose center is the fly origin. */
  el: HTMLElement
  /** Formatted markdown text representing this block */
  text: string
}

/**
 * Format a code block element (<pre>) as fenced markdown with language tag.
 */
export function getCodeBlockMarkdown(pre: HTMLElement): string {
  const code = pre.querySelector('code')
  let lang = ''
  if (code) {
    for (const cls of Array.from(code.classList)) {
      if (cls.startsWith('language-')) {
        lang = cls.slice(9)
        break
      }
    }
  }
  const codeText = (code || pre).textContent || ''
  const fence = codeText.includes('```') ? '````' : '```'
  return `${fence}${lang}\n${codeText.replace(/\r?\n+$/, '')}\n${fence}`
}

/**
 * Resolve a click/tap target to a code/table range reference.
 * Returns null when not on an attach header button, or in share mode.
 */
export function resolveBlockAttachClick(e: Event): BlockRangeHit | null {
  const target = e.target as HTMLElement | null
  if (!target || !target.closest(BLOCK_ATTACH_BTN)) return null
  if (isShareMode()) return null

  const mdBody = target.closest<HTMLElement>('.markdown-body')
  const path = mdBody?.getAttribute('data-file-path') || ''

  const wrapper = target.closest<HTMLElement>('.code-block-wrapper, .table-block-wrapper')
  const el = wrapper?.querySelector<HTMLElement>('pre, table')
  if (!el) return null

  const startAttr = el.getAttribute('data-source-line') || wrapper?.getAttribute('data-source-line')
  const startLine = startAttr ? parseInt(startAttr, 10) : 1
  const endRaw = el.getAttribute('data-source-end') || wrapper?.getAttribute('data-source-end')
  const endLine = endRaw ? parseInt(endRaw, 10) : startLine

  const kind: 'code' | 'table' = el.tagName === 'TABLE' ? 'table' : 'code'
  const text = kind === 'table' ? tableToMarkdown(el as HTMLTableElement) : getCodeBlockMarkdown(el)

  return { kind, path, startLine, endLine, el, text }
}

/**
 * Add the code block or table to the AI chat (Trae / VS Code) with source line range.
 * Returns true when the button handled the event (caller stops propagation).
 */
export function handleBlockAttachClick(e: Event, actions?: RangedAttachActions): boolean {
  const hit = resolveBlockAttachClick(e)
  if (!hit) return false

  e.preventDefault()
  e.stopPropagation()

  // 1. Post to host AI chat (Trae / VS Code Copilot / Clipboard fallback)
  addToChat(hit.text, hit.startLine, hit.endLine)

  // 2. Feedback toast & action callback if provided
  if (actions?.toast) {
    actions.toast(actions.messages?.added || '已添加到对话', { icon: '📎', type: 'success', duration: 1500 })
  }
  if (actions?.add && hit.path) {
    actions.add(hit.path, hit.startLine, hit.endLine)
  }

  // 3. Visual button feedback
  const target = e.target as HTMLElement | null
  const btn = target?.closest<HTMLButtonElement>(BLOCK_ATTACH_BTN)
  if (btn) {
    btn.classList.add('is-attached')
    setTimeout(() => btn.classList.remove('is-attached'), 1200)
  }

  return true
}
