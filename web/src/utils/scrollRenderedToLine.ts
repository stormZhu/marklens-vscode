// DOM helpers for line-anchored scrolling inside a rendered markdown pane.
//
// Rendered markdown blocks carry a `data-source-line` attribute (1-based source
// line, emitted by markedConfig). These helpers map between the container's
// scroll position and that line number — the coordinate shared with the
// CodeMirror source view.

export interface LineBlock {
    el: HTMLElement
    line: number
    endLine?: number
    /** Vertical position of the block top within the container's scroll area. */
    top: number
    /** Visual height of the block in pixels. */
    height: number
}

/**
 * Binary-search an ascending list of line-annotated blocks for the last block
 * whose line is <= target (i.e. the block that owns a given source line).
 * Returns the matching index, or 0 when every block is after target, or -1 when
 * the list is empty.
 */
export function findBlockAtOrBefore(blocks: { line: number }[], target: number): number {
    if (blocks.length === 0) return -1
    let lo = 0
    let hi = blocks.length - 1
    let ans = 0
    while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (blocks[mid].line <= target) {
            ans = mid
            lo = mid + 1
        } else {
            hi = mid - 1
        }
    }
    return ans
}

/**
 * Collect every leaf/non-shadowed `[data-source-line]` block inside the rendered
 * markdown container, in document order with strictly increasing `line`, with
 * its top measured relative to the container's scrollable content (rect
 * difference + current scrollTop, which cancels padding/borders).
 */
export function collectLineBlocks(container: HTMLElement): LineBlock[] {
    const blocks: LineBlock[] = []
    const root = container.querySelector('.markdown-content') ?? container
    const cRect = container.getBoundingClientRect()
    const cScroll = container.scrollTop
    for (const el of root.querySelectorAll<HTMLElement>('[data-source-line]')) {
        const line = parseInt(el.getAttribute('data-source-line') || '', 10)
        if (!Number.isFinite(line) || line <= 0) continue

        // Skip pure structural containers whose inner rows/items carry their own
        // granular [data-source-line] attributes (<tr>, <li>, <p>, etc.).
        const tag = el.tagName
        if (
            (tag === 'TABLE' || tag === 'UL' || tag === 'OL' || tag === 'BLOCKQUOTE') &&
            el.querySelector('[data-source-line]')
        ) {
            continue
        }

        // Deduplicate nested elements starting on the exact same source line
        // (e.g. a loose <li data-source-line="10"> containing <p data-source-line="10">).
        if (blocks.length > 0 && line <= blocks[blocks.length - 1].line) {
            continue
        }

        const measureEl =
            tag === 'PRE' || el.classList.contains('mermaid')
                ? (el.closest<HTMLElement>('.code-block-wrapper, .image-block-wrapper') ?? el)
                : el
        const rect = measureEl.getBoundingClientRect()
        const top = rect.top - cRect.top + cScroll
        const height = Math.max(1, rect.height)
        const endAttr = parseInt(el.getAttribute('data-source-end') || '', 10)
        const endLine = Number.isFinite(endAttr) && endAttr >= line ? endAttr : undefined
        blocks.push({ el, line, endLine, top, height })
    }
    return blocks
}

/**
 * Given collected LineBlocks and the container's current `scrollTop`, compute
 * the fractional 1-based source line at the top of the viewport.
 */
export function computeTopSourceLineFromBlocks(
    blocks: LineBlock[],
    scrollTop: number,
    totalLines: number,
): number {
    if (scrollTop <= 1 || blocks.length === 0) return 1
    if (scrollTop < blocks[0].top) {
        if (blocks[0].line > 1 && blocks[0].top > 1) {
            const frac = Math.max(0, Math.min(1, scrollTop / blocks[0].top))
            return 1 + frac * (blocks[0].line - 1)
        }
        return blocks[0].line
    }

    let idx = 0
    for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].top <= scrollTop + 0.5) idx = i
        else break
    }

    const blk = blocks[idx]
    const nextBlk = idx + 1 < blocks.length ? blocks[idx + 1] : null
    const endLine = nextBlk
        ? nextBlk.line
        : Math.max(blk.endLine ?? blk.line, totalLines)
    const spanLines = Math.max(0, endLine - blk.line)
    const spanPx = nextBlk
        ? Math.max(1, nextBlk.top - blk.top)
        : Math.max(1, blk.height)

    const offsetPx = scrollTop - blk.top
    if (spanLines > 0 && offsetPx > 0.5) {
        const frac = Math.max(0, Math.min(1, offsetPx / spanPx))
        return Math.min(totalLines, blk.line + frac * spanLines)
    }
    return blk.line
}

/**
 * Inverse of `computeTopSourceLineFromBlocks`: given a (possibly fractional)
 * 1-based `targetLine`, compute the exact `scrollTop` in pixels.
 */
export function computeScrollTopForSourceLine(
    blocks: LineBlock[],
    targetLine: number,
    totalLines: number,
): number {
    if (targetLine <= 1 || blocks.length === 0) return 0
    const clamped = Math.max(1, Math.min(totalLines, targetLine))

    if (clamped < blocks[0].line) {
        if (blocks[0].line > 1 && blocks[0].top > 0) {
            const frac = (clamped - 1) / (blocks[0].line - 1)
            return Math.max(0, frac * blocks[0].top)
        }
        return 0
    }

    const idx = findBlockAtOrBefore(blocks, clamped)
    if (idx < 0) return 0
    const blk = blocks[idx]
    const nextBlk = idx + 1 < blocks.length ? blocks[idx + 1] : null
    const endLine = nextBlk
        ? nextBlk.line
        : Math.max(blk.endLine ?? blk.line, totalLines)
    const spanLines = Math.max(0, endLine - blk.line)
    const spanPx = nextBlk
        ? Math.max(1, nextBlk.top - blk.top)
        : Math.max(1, blk.height)

    if (spanLines > 0 && clamped > blk.line) {
        const frac = Math.max(0, Math.min(1, (clamped - blk.line) / spanLines))
        return Math.max(0, blk.top + frac * spanPx)
    }
    return Math.max(0, blk.top)
}

/**
 * Capture: the source line anchored at the container's current viewport top,
 * plus the pixel offset of the viewport top below that block's top (so a
 * rendered→rendered restore can land inside a tall block). Returns null when
 * the pane has no line blocks yet.
 */
export function renderedLineAnchor(container: HTMLElement): { line: number; offset: number } | null {
    const blocks = collectLineBlocks(container)
    if (blocks.length === 0) return null
    const scrollTop = container.scrollTop
    let idx = 0
    for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].top <= scrollTop + 2) idx = i
        else break // blocks are in document order — stop past the viewport top
    }
    return { line: blocks[idx].line, offset: Math.max(0, scrollTop - blocks[idx].top) }
}

/**
 * The ideal scrollTop that places the block owning `line` at the container
 * top — NOT clamped to the current scroll range. Returns null when the pane
 * has no line blocks. Callers use this to defer a restore until the content
 * is tall enough (async images), instead of clamping to a wrong position.
 */
export function renderedLineScrollTop(container: HTMLElement, line: number): number | null {
    const blocks = collectLineBlocks(container)
    if (blocks.length === 0) return null
    const idx = findBlockAtOrBefore(blocks, line)
    return blocks[idx].top
}
