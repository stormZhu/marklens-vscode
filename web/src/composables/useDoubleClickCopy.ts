import { inject } from 'vue'
import { copyText } from '@/utils/clipboard.ts'
import { flashElement } from '@/utils/domFlash'
import { gt } from '@/composables/useLocale'
import { usePlatformDetect } from '@/composables/usePlatformDetect'
import { isExternalLink, isAnchorLink, slugifyForHeading, stripLeadingNumbering } from '@/utils/doubleClickUtils.ts'
import { findAnchorTargetElement, scrollToTargetElement } from '@/utils/toc.ts'

const BLOCK_SELECTORS = 'p, h1, h2, h3, h4, h5, h6, li, pre, blockquote, table, .mermaid'

/**
 * Try to decode a percent-encoded href.
 * Browsers may encode non-ASCII chars (e.g. 中文 → %E4%B8%AD%E6%96%87) in href
 * attributes when HTML is inserted via innerHTML/v-html. This ensures file paths
 * with Chinese characters are decoded back to their original form before being
 * used as filesystem paths.
 */
function tryDecodeHref(href: string): string {
    try {
        // Only decode if the href contains percent-encoded sequences
        if (!href.includes('%')) return href
        return decodeURIComponent(href)
    } catch {
        // If decoding fails (e.g. malformed percent encoding), return as-is
        return href
    }
}

interface ToastShow {
    show: (msg: string, opts?: { icon?: string; duration?: number }) => void
}

export interface LinkHandler {
    (path: string, lineStart?: number, lineEnd?: number, lineRanges?: string): void
}

export interface DoubleClickCopyOptions {
    /** 行级选择器（如 '.code-line'），设置后双击查找行级元素而非块级元素 */
    lineSelector?: string
    /** 复制成功后的回调，接收 (target元素, 复制的文本) */
    onCopy?: (target: EventTarget | null, text: string) => void
}

/**
 * 双击复制块级或行级元素的文本
 * 使用 click 事件手动判断双击，确保两次点击的是同一个元素
 */
export function useDoubleClickCopy(options?: DoubleClickCopyOptions) {
    const toast = inject<ToastShow | null>('toast', null)
    const { isPC } = usePlatformDetect()
    let lastTarget: EventTarget | null = null
    let lastTime = 0
    const DBLCLICK_THRESHOLD = 300 // ms，与浏览器默认双击间隔一致

    /**
     * 执行复制操作
     */
    function doCopy(target: EventTarget | null): boolean {
        // Try line selector first (code view), then fall back to block selectors (markdown view)
        let element: HTMLElement | null = null
        let isLineMode = false
        if (options?.lineSelector) {
            element = (target as HTMLElement | null)?.closest<HTMLElement>(options.lineSelector) ?? null
            isLineMode = true
        }
        if (!element) {
            element = (target as HTMLElement | null)?.closest<HTMLElement>(BLOCK_SELECTORS) ?? null
            isLineMode = false
        }
        if (!element) return false

        // 行级模式：只取 .code-text 的文本（不含行号）
        let text: string
        if (isLineMode) {
            const codeText = element.querySelector('.code-text')
            text = (codeText?.textContent ?? element.textContent)?.trim() || ''
        } else {
            text = element.textContent?.trim() || ''
        }
        if (!text) return false

        copyText(text, () => {
            // 触发闪烁动画
            flashElement(element, { className: 'copy-flash' })

            // 显示 toast 提示
            if (toast) {
                toast.show(gt('common.copied'), { icon: '📋', duration: 1500 })
            }
        })

        // 复制成功后调用回调
        if (options?.onCopy) {
            options.onCopy(target, text)
        }

        return true
    }

    /**
     * 处理锚点链接点击
     */
    function handleAnchorClick(event: MouseEvent, onOpenFile?: LinkHandler): boolean {
        const target = event.target as HTMLElement
        const anchor = target.closest<HTMLAnchorElement>('a[href]')

        if (!anchor) return false

        const href = anchor.getAttribute('href')
        if (!href) return false

        // 处理锚点链接 (#xxx)
        if (isAnchorLink(href)) {
            return handleHashLink(event, href, anchor)
        }

        // Decode percent-encoded href (e.g. %E4%B8%AD%E6%96%87 → 中文)
        // Browsers may encode non-ASCII chars in href attributes when inserting via innerHTML/v-html
        const decodedHref = tryDecodeHref(href)

        // 处理相对路径链接 (非 http/https 链接)
        if (!isExternalLink(decodedHref) && onOpenFile) {
            // Prefer the annotated, resolved path (set by annotateFilePaths) and
            // its line range; fall back to the raw decoded href (parsed later).
            const dataFilePath = anchor.getAttribute('data-file-path')
            const dataLineStart = anchor.getAttribute('data-line-start')
            const dataLineEnd = anchor.getAttribute('data-line-end')
            const dataLineRanges = anchor.getAttribute('data-line-ranges') || undefined
            const filePath = dataFilePath || decodedHref
            const lineStart = dataLineStart ? parseInt(dataLineStart, 10) : undefined
            const lineEnd = dataLineEnd ? parseInt(dataLineEnd, 10) : undefined
            event.preventDefault()
            if (dataLineRanges) {
                onOpenFile(filePath, lineStart, lineEnd, dataLineRanges)
            } else if (lineStart !== undefined) {
                onOpenFile(filePath, lineStart, lineEnd)
            } else {
                onOpenFile(filePath)
            }
            return true
        }

        return false
    }

    /**
     * 处理锚点链接 (#xxx)
     */
    function handleHashLink(event: MouseEvent, href: string, anchor: HTMLAnchorElement): boolean {
        const targetId = decodeURIComponent(href.substring(1))
        const linkText = anchor.textContent?.trim() || ''

        const scrollContainer =
            anchor.closest<HTMLElement>('.markdown-body') ||
            document.querySelector<HTMLElement>('.markdown-body') ||
            anchor.closest<HTMLElement>('.file-content') ||
            document.documentElement

        const targetElement = findAnchorTargetElement(scrollContainer, targetId, linkText)

        if (targetElement) {
            event.preventDefault()
            event.stopPropagation()
            scrollToTargetElement(scrollContainer, targetElement)
            return true
        }

        return false
    }

    /**
     * 处理原生 click 事件，手动判断双击
     * 只有在短时间内点击同一个元素时才触发双击复制
     *
     * PC 模式下禁用"双击复制段落"（markdown 预览的段落/代码行复制），
     * 但仍保留文件路径/锚点链接的处理。
     */
    function handleDblClick(event: MouseEvent, onOpenFile?: LinkHandler): void {
        // 首先检查是否点击了链接
        if (handleAnchorClick(event, onOpenFile)) {
            return
        }

        // PC 模式禁用双击复制段落
        if (isPC.value) {
            return
        }

        const now = Date.now()
        const target = event.target
        const timeDiff = now - lastTime

        // 判断是否是双击：短时间内点击同一个元素
        if (lastTarget === target && timeDiff < DBLCLICK_THRESHOLD) {
            // 清除状态，防止连续触发
            lastTarget = null
            lastTime = 0

            // 执行复制
            doCopy(target)
        } else {
            // 记录这次点击
            lastTarget = target
            lastTime = now
        }
    }

    return {
        handleDblClick,
    }
}
