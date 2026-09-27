import { describe, it, expect, beforeAll } from 'vitest'
import { configureMarkedRenderer } from '@/utils/markedConfig'
import { buildMarkdownPreviewDom } from '@/composables/useMarkdownRenderPipeline'
import { handleCodeBlockClick, handleTableBlockClick } from '@/composables/useCodeBlockHeader'

beforeAll(() => {
  configureMarkedRenderer()
})

describe('ClawBench Markdown Render Pipeline (1:1 Parity)', () => {
  it('renders headings with slugified IDs and data-source-line attributes', () => {
    const md = `# 5.1 工具体系总览\n\nSome paragraph text.\n\n## 5.2 Builtin 工具集`
    const { html } = buildMarkdownPreviewDom({
      content: md,
      path: 'docs/chapter5.md',
      projectRoot: '/workspace/project',
    })

    const container = document.createElement('div')
    container.innerHTML = html

    const h1 = container.querySelector('h1')
    expect(h1).not.toBeNull()
    expect(h1?.getAttribute('data-source-line')).toBe('1')
    expect(h1?.textContent).toContain('5.1 工具体系总览')

    const h2 = container.querySelector('h2')
    expect(h2).not.toBeNull()
    expect(h2?.getAttribute('data-source-line')).toBe('5')
  })

  it('wraps code blocks with .code-block-wrapper, language badge, copy and wrap buttons', () => {
    const md = '```go\npackage main\nfunc main() {}\n```'
    const { html } = buildMarkdownPreviewDom({
      content: md,
      path: 'README.md',
      projectRoot: '/workspace/project',
    })

    const container = document.createElement('div')
    container.innerHTML = html

    const wrapper = container.querySelector('.code-block-wrapper')
    expect(wrapper).not.toBeNull()
    expect(wrapper?.querySelector('.code-block-lang')?.textContent?.toLowerCase()).toBe('go')
    expect(wrapper?.querySelector('.code-block-copy-btn')).not.toBeNull()
    expect(wrapper?.querySelector('.code-block-wrap-btn')).not.toBeNull()

    // Default has word-wrap enabled; clicking wrap button toggles .word-wrap off then back on
    expect(wrapper?.classList.contains('word-wrap')).toBe(true)
    const wrapBtn = wrapper?.querySelector('.code-block-wrap-btn') as HTMLElement
    const clickEvent = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(clickEvent, 'target', { value: wrapBtn })
    expect(handleCodeBlockClick(clickEvent)).toBe(true)
    expect(wrapper?.classList.contains('word-wrap')).toBe(false)
    expect(handleCodeBlockClick(clickEvent)).toBe(true)
    expect(wrapper?.classList.contains('word-wrap')).toBe(true)
  })

  it('wraps tables with .table-block-wrapper, copy menu (Markdown/HTML/TSV), wrap toggle, and row indices', () => {
    const md = [
      '| 子包路径 | 职责 |',
      '| --- | --- |',
      '| `internal/agenttool` | 工具核心接口 |',
      '| `internal/bash` | Shell命令执行 |',
    ].join('\n')

    const { html, detectedPaths } = buildMarkdownPreviewDom({
      content: md,
      path: 'docs/chapter5.md',
      projectRoot: '/workspace/project',
    })

    const container = document.createElement('div')
    container.innerHTML = html

    const tableWrapper = container.querySelector('.table-block-wrapper')
    expect(tableWrapper).not.toBeNull()
    expect(tableWrapper?.querySelector('.table-block-copy-btn')).not.toBeNull()
    expect(tableWrapper?.querySelector('.table-block-wrap-btn')).not.toBeNull()
    expect(tableWrapper?.querySelectorAll('.table-block-copy-menu-item').length).toBe(3)

    // Table rows have data-row-idx for TableRowModal expansion
    const rows = tableWrapper?.querySelectorAll('tbody tr[data-row-idx]')
    expect(rows?.length).toBe(2)
    expect(rows?.[0].getAttribute('data-row-idx')).toBe('0')
    expect(rows?.[1].getAttribute('data-row-idx')).toBe('1')

    // Detected file paths include internal/agenttool and internal/bash
    expect(detectedPaths).toContain('internal/agenttool')
    expect(detectedPaths).toContain('internal/bash')

    // Annotated path spans and open buttons (↗) are injected
    const pathSpan = container.querySelector('.chat-file-path')
    const openBtn = container.querySelector('.chat-file-open-btn')
    expect(pathSpan).not.toBeNull()
    expect(openBtn).not.toBeNull()

    // Table wrap toggle works (default is word-wrap on)
    expect(tableWrapper?.classList.contains('word-wrap')).toBe(true)
    const wrapBtn = tableWrapper?.querySelector('.table-block-wrap-btn') as HTMLElement
    const clickEvent = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(clickEvent, 'target', { value: wrapBtn })
    expect(handleTableBlockClick(clickEvent)).toBe(true)
    expect(tableWrapper?.classList.contains('word-wrap')).toBe(false)
    expect(handleTableBlockClick(clickEvent)).toBe(true)
    expect(tableWrapper?.classList.contains('word-wrap')).toBe(true)
  })

  it('renders inline and display KaTeX math formulas and Mermaid blocks', () => {
    const md = [
      'Inline formula $E = mc^2$ here.',
      '',
      '$$',
      '\\int_0^1 x^2 dx = \\frac{1}{3}',
      '$$',
      '',
      '```mermaid',
      'flowchart LR',
      '  A --> B',
      '```',
    ].join('\n')

    const { html } = buildMarkdownPreviewDom({
      content: md,
      path: 'math.md',
      projectRoot: '/workspace/project',
    })

    const container = document.createElement('div')
    container.innerHTML = html

    expect(container.querySelector('.katex')).not.toBeNull()
    expect(container.querySelector('.katex-display')).not.toBeNull()
    expect(container.querySelector('pre.mermaid')).not.toBeNull()
  })

  it('lifts local images into .image-block-wrapper with lightbox and open-file buttons', () => {
    const md = '![Architecture](./assets/arch.png)'
    const { html } = buildMarkdownPreviewDom(
      {
        content: md,
        path: 'docs/guide.md',
        projectRoot: '/workspace/project',
      },
      { isPC: true, imageTimestamp: 12345 },
    )

    const container = document.createElement('div')
    container.innerHTML = html

    const fig = container.querySelector('.image-block-wrapper')
    expect(fig).not.toBeNull()
    expect(fig?.querySelector('.image-block-view-btn')).not.toBeNull()
    expect(fig?.querySelector('.image-block-open-btn')).not.toBeNull()

    const img = fig?.querySelector('img.lightbox-img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('data-attach-src')).toBe('docs/assets/arch.png')
    expect(img?.getAttribute('data-full-src')).toBe('/api/fs/raw/docs/assets/arch.png?t=12345')
  })
})
