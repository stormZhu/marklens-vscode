import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  resolveBlockAttachClick,
  handleBlockAttachClick,
  getCodeBlockMarkdown,
} from '@/utils/mdBlockAttach'
import {
  resolveMdImageBadgeClick,
  handleMdImageAttachClick,
} from '@/utils/mdImageAttach'
import { annotateMediaBlocks } from '@/utils/mediaBlockFactory'
import { annotateCodeBlockHeaders, annotateTableBlockHeaders } from '@/composables/useCodeBlockHeader'
import * as vscodeBridge from '@/bridge/vscodeBridge'

describe('Code Block, Table & Image Add to Chat Buttons', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  describe('Code Block Add to Chat', () => {
    it('annotates code block with attach-to-chat button', () => {
      const html = '<pre data-source-line="10" data-source-end="15"><code class="language-typescript">const x = 1</code></pre>'
      const annotated = annotateCodeBlockHeaders(html)
      expect(annotated).toContain('code-block-attach-btn')
      expect(annotated).toContain('data-action="attach"')
    })

    it('formats code block markdown with correct fences and language', () => {
      const pre = document.createElement('pre')
      pre.innerHTML = '<code class="language-python">print("hello")</code>'
      const md = getCodeBlockMarkdown(pre)
      expect(md).toBe('```python\nprint("hello")\n```')
    })

    it('uses quadruple backticks when code text contains triple backticks', () => {
      const pre = document.createElement('pre')
      pre.innerHTML = '<code>```markdown\nhello\n```</code>'
      const md = getCodeBlockMarkdown(pre)
      expect(md.startsWith('````')).toBe(true)
      expect(md.endsWith('````')).toBe(true)
    })

    it('resolves click and calls addToChat with code and line range', () => {
      const addToChatSpy = vi.spyOn(vscodeBridge, 'addToChat').mockImplementation(() => {})
      const container = document.createElement('div')
      container.className = 'markdown-body'
      container.setAttribute('data-file-path', 'test.md')
      container.innerHTML = `
        <div class="code-block-wrapper">
          <div class="code-block-header">
            <span class="code-block-header-actions">
              <button class="code-block-attach-btn" data-action="attach">📎</button>
            </span>
          </div>
          <pre data-source-line="12" data-source-end="18"><code class="language-typescript">export interface Msg { id: string }</code></pre>
        </div>
      `
      document.body.appendChild(container)

      const btn = container.querySelector('.code-block-attach-btn')!
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
      btn.dispatchEvent(clickEvent)

      const handled = handleBlockAttachClick(clickEvent)
      expect(handled).toBe(true)
      expect(addToChatSpy).toHaveBeenCalledWith(
        '```typescript\nexport interface Msg { id: string }\n```',
        12,
        18
      )
      expect(btn.classList.contains('is-attached')).toBe(true)
    })
  })

  describe('Table Block Add to Chat', () => {
    it('annotates table with attach-to-chat button', () => {
      const html = `
        <div class="table-wrap">
          <table data-source-line="20" data-source-end="25">
            <thead><tr><th>Host</th><th>Command</th></tr></thead>
            <tbody><tr><td>Trae</td><td>open</td></tr></tbody>
          </table>
        </div>
      `
      const annotated = annotateTableBlockHeaders(html)
      expect(annotated).toContain('table-block-attach-btn')
      expect(annotated).toContain('data-action="attach"')
    })

    it('resolves click and calls addToChat with table markdown and line range', () => {
      const addToChatSpy = vi.spyOn(vscodeBridge, 'addToChat').mockImplementation(() => {})
      const container = document.createElement('div')
      container.className = 'markdown-body'
      container.innerHTML = `
        <div class="table-block-wrapper">
          <div class="table-block-header">
            <span class="table-block-header-actions">
              <button class="table-block-attach-btn" data-action="attach">📎</button>
            </span>
          </div>
          <div class="table-wrap">
            <table data-source-line="30" data-source-end="35">
              <thead><tr><th>Name</th><th>Role</th></tr></thead>
              <tbody><tr><td>Alice</td><td>Admin</td></tr></tbody>
            </table>
          </div>
        </div>
      `
      document.body.appendChild(container)

      const btn = container.querySelector('.table-block-attach-btn')!
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
      btn.dispatchEvent(clickEvent)

      const handled = handleBlockAttachClick(clickEvent)
      expect(handled).toBe(true)
      expect(addToChatSpy).toHaveBeenCalledWith(
        '| Name | Role |\n| --- | --- |\n| Alice | Admin |',
        30,
        35
      )
      expect(btn.classList.contains('is-attached')).toBe(true)
    })
  })

  describe('Image Block Add to Chat', () => {
    it('annotates local and remote images with attach-to-chat button in image-block-header', () => {
      const html = '<p data-source-line="40"><img src="https://example.com/pic.png" alt="Remote Pic"></p>'
      const annotated = annotateMediaBlocks(html)
      expect(annotated).toContain('image-block-header')
      expect(annotated).toContain('image-block-attach-btn')
    })

    it('resolves click on local image and calls addToChat with data-attach-src', () => {
      const addToChatSpy = vi.spyOn(vscodeBridge, 'addToChat').mockImplementation(() => {})
      const container = document.createElement('div')
      container.className = 'markdown-body'
      container.innerHTML = `
        <div class="image-block-wrapper" data-source-line="45">
          <div class="image-block-header">
            <span class="image-block-header-actions">
              <button class="image-block-attach-btn" data-action="attach">📎</button>
            </span>
          </div>
          <span class="lightbox-img-wrap">
            <img class="lightbox-img" src="vscode-resource:/path/preview.png" data-attach-src="assets/preview.png" alt="Arch Diagram">
          </span>
        </div>
      `
      document.body.appendChild(container)

      const btn = container.querySelector('.image-block-attach-btn')!
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
      btn.dispatchEvent(clickEvent)

      const handled = handleMdImageAttachClick(clickEvent)
      expect(handled).toBe(true)
      expect(addToChatSpy).toHaveBeenCalledWith(
        '![Arch Diagram](assets/preview.png)',
        45,
        45
      )
      expect(btn.classList.contains('is-attached')).toBe(true)
    })

    it('resolves click on remote image and calls addToChat with src', () => {
      const addToChatSpy = vi.spyOn(vscodeBridge, 'addToChat').mockImplementation(() => {})
      const container = document.createElement('div')
      container.className = 'markdown-body'
      container.innerHTML = `
        <div class="image-block-wrapper" data-source-line="55">
          <div class="image-block-header">
            <span class="image-block-header-actions">
              <button class="image-block-attach-btn" data-action="attach">📎</button>
            </span>
          </div>
          <span class="lightbox-img-wrap">
            <img class="lightbox-img" src="https://example.com/logo.svg" alt="Company Logo">
          </span>
        </div>
      `
      document.body.appendChild(container)

      const btn = container.querySelector('.image-block-attach-btn')!
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
      btn.dispatchEvent(clickEvent)

      const handled = handleMdImageAttachClick(clickEvent)
      expect(handled).toBe(true)
      expect(addToChatSpy).toHaveBeenCalledWith(
        '![Company Logo](https://example.com/logo.svg)',
        55,
        55
      )
    })

    it('resolves click on mermaid diagram inside image-block-wrapper', () => {
      const addToChatSpy = vi.spyOn(vscodeBridge, 'addToChat').mockImplementation(() => {})
      const container = document.createElement('div')
      container.className = 'markdown-body'
      container.innerHTML = `
        <div class="image-block-wrapper">
          <div class="image-block-header">
            <span class="image-block-header-actions">
              <button class="image-block-attach-btn mermaid-block-attach-btn" data-action="attach">📎</button>
            </span>
          </div>
          <div class="mermaid" data-source-line="60" data-source-end="68" data-mermaid="graph TD\nA-->B">
            <svg></svg>
          </div>
        </div>
      `
      document.body.appendChild(container)

      const btn = container.querySelector('.image-block-attach-btn')!
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
      btn.dispatchEvent(clickEvent)

      const handled = handleMdImageAttachClick(clickEvent)
      expect(handled).toBe(true)
      expect(addToChatSpy).toHaveBeenCalledWith(
        '```mermaid\ngraph TD\nA-->B\n```',
        60,
        68
      )
    })
  })
})
