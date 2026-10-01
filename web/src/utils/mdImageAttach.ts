/**
 * "Attach image to chat" affordance for rendered markdown views.
 *
 * The file-preview pipeline lifts every image into a block-level
 * `.image-block-wrapper` figure whose header carries a paperclip
 * `.image-block-attach-btn`. Tapping it sends the image (with markdown syntax
 * and line range) to Trae / VS Code AI Chat.
 */

import { isShareMode } from '@/share/shareMode'
import { addToChat } from '@/bridge/vscodeBridge'
import { mermaidFenceEndLine } from '@/utils/mdMermaidAttach'

/** Selector of the injected attach button in the image block header. */
export const MD_IMAGE_ATTACH_BADGE = '.image-block-attach-btn'

export interface MdImageBadgeHit {
  /** Decoded project-relative file path if available. */
  path: string
  /** Wrapper element; its center is used as the fly-animation origin. */
  wrap: HTMLElement
  /** Formatted markdown text representing this media block */
  text: string
  /** 1-based source line of the image block */
  startLine?: number
  /** 1-based end source line of the image block */
  endLine?: number
}

/** Badge click / tap handling injected by callers (from useChatContext + useToast). */
export interface MdImageAttachActions {
  add?: (path: string) => void
  remove?: (path: string) => void
  has?: (path: string) => boolean
  toast?: (msg: string, opts?: { icon?: string; type?: 'success' | 'error' | 'info'; duration?: number }) => void
  /** i18n message keys resolved by the caller. */
  messages?: { added: string; removed: string }
}

/**
 * Resolve a click/tap target to an attach-hit for an image block.
 * Supports raster images, inline SVGs, and Mermaid diagrams.
 */
export function resolveMdImageBadgeClick(e: Event): MdImageBadgeHit | null {
  const target = e.target as HTMLElement | null
  if (!target || !target.closest(MD_IMAGE_ATTACH_BADGE)) return null
  if (isShareMode()) return null

  const wrap = target.closest<HTMLElement>('.image-block-wrapper')
  if (!wrap) return null

  const mdBody = target.closest<HTMLElement>('.markdown-body')
  const path = mdBody?.getAttribute('data-file-path') || ''

  const img = wrap.querySelector<HTMLImageElement>('img.lightbox-img, img')
  const mermaid = wrap.querySelector<HTMLElement>('div.mermaid')
  const svg = wrap.querySelector<SVGElement>('svg.lightbox-svg')

  let text = ''
  let startLine: number | undefined
  let endLine: number | undefined

  if (img) {
    const alt = img.getAttribute('alt') || ''
    const attachSrc = img.getAttribute('data-attach-src')
    const fullSrc = img.getAttribute('data-full-src')
    const src = attachSrc || img.getAttribute('src') || fullSrc || ''
    text = `![${alt}](${src})`

    const lineAttr = wrap.getAttribute('data-source-line') || img.closest('[data-source-line]')?.getAttribute('data-source-line')
    if (lineAttr) {
      startLine = parseInt(lineAttr, 10)
      const endAttr = wrap.getAttribute('data-source-end')
      endLine = endAttr ? parseInt(endAttr, 10) : startLine
    }
  } else if (mermaid) {
    const body = mermaid.getAttribute('data-mermaid') || mermaid.textContent || ''
    text = `\`\`\`mermaid\n${body.trim()}\n\`\`\``
    const lineAttr = mermaid.getAttribute('data-source-line') || wrap.getAttribute('data-source-line')
    if (lineAttr) {
      startLine = parseInt(lineAttr, 10)
      const endAttr = mermaid.getAttribute('data-source-end')
      endLine = endAttr ? parseInt(endAttr, 10) : mermaidFenceEndLine(startLine, body)
    }
  } else if (svg) {
    text = svg.outerHTML || ''
    const lineAttr = wrap.getAttribute('data-source-line')
    if (lineAttr) {
      startLine = parseInt(lineAttr, 10)
      endLine = startLine
    }
  }

  if (!text) return null
  return { path, wrap, text, startLine, endLine }
}

/**
 * Add the image / diagram to the AI chat (Trae / VS Code) with source line.
 * Returns true when the badge handled the event (caller should stopPropagation).
 */
export function handleMdImageAttachClick(
  e: Event,
  actions?: MdImageAttachActions
): boolean {
  const hit = resolveMdImageBadgeClick(e)
  if (!hit) return false

  e.preventDefault()
  e.stopPropagation()

  // 1. Send to host AI chat (Trae / VS Code Copilot / Clipboard fallback)
  addToChat(hit.text, hit.startLine, hit.endLine)

  // 2. Feedback toast & action callback if provided
  if (actions?.toast) {
    actions.toast(actions.messages?.added || '已添加到对话', { icon: '📎', type: 'success', duration: 1500 })
  }
  if (actions?.add && hit.path) {
    actions.add(hit.path)
  }

  // 3. Visual button feedback
  const target = e.target as HTMLElement | null
  const btn = target?.closest<HTMLButtonElement>(MD_IMAGE_ATTACH_BADGE)
  if (btn) {
    btn.classList.add('is-attached')
    setTimeout(() => btn.classList.remove('is-attached'), 1200)
  }

  return true
}
