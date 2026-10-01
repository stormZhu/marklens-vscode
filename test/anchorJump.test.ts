import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  slugify,
  gfmSlugify,
  normalizeForMatch,
  findAnchorTargetElement,
  scrollToTargetElement,
} from '@/utils/toc'
import { stripLeadingNumbering } from '@/utils/doubleClickUtils'

describe('In-page Anchor & TOC Jump Handling', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  describe('slugify & gfmSlugify & normalizeForMatch', () => {
    it('generates marked-compatible slugs with slugify', () => {
      expect(slugify('一、TUI 的整体形态')).toBe('一-tui-的整体形态')
      expect(slugify('1. Introduction & Overview')).toBe('1-introduction-overview')
    })

    it('generates GFM-compatible slugs with gfmSlugify (stripping punctuation)', () => {
      expect(gfmSlugify('一、TUI 的整体形态')).toBe('一tui-的整体形态')
      expect(gfmSlugify('五、事件桥：两条 goroutine，一个 channel')).toBe('五事件桥两条-goroutine一个-channel')
    })

    it('normalizes various slug/text formats to the exact same comparable string', () => {
      const gfm = '一tui-的整体形态'
      const marked = '一-tui-的整体形态'
      const typora = '一、tui-的整体形态'
      const raw = '一、TUI 的整体形态'

      expect(normalizeForMatch(gfm)).toBe('一tui的整体形态')
      expect(normalizeForMatch(marked)).toBe('一tui的整体形态')
      expect(normalizeForMatch(typora)).toBe('一tui的整体形态')
      expect(normalizeForMatch(raw)).toBe('一tui的整体形态')
    })

    it('strips leading numbering for Chinese, digits, and Roman numerals', () => {
      expect(stripLeadingNumbering('一、TUI 的整体形态')).toBe('TUI 的整体形态')
      expect(stripLeadingNumbering('1.2 Overview')).toBe('Overview')
      expect(stripLeadingNumbering('III. Summary')).toBe('Summary')
    })
  })

  describe('findAnchorTargetElement', () => {
    it('finds target by exact id', () => {
      const container = document.createElement('div')
      container.innerHTML = '<h2 id="section-one">Section One</h2>'
      const target = findAnchorTargetElement(container, 'section-one')
      expect(target).toBe(container.querySelector('#section-one'))
    })

    it('finds target by exact name attribute', () => {
      const container = document.createElement('div')
      container.innerHTML = '<a name="legacy-anchor"></a>'
      const target = findAnchorTargetElement(container, '#legacy-anchor')
      expect(target).toBe(container.querySelector('[name="legacy-anchor"]'))
    })

    it('resolves GFM slug when marked rendered ID contains dashes from punctuation', () => {
      // In Chinese documents, marked produces `id="一-tui-的整体形态"` (ideographic comma converted to dash)
      // but GFM / VSCode TOC generators produce `href="#一tui-的整体形态"` (punctuation stripped).
      const container = document.createElement('div')
      container.innerHTML = `
        <div class="markdown-body">
          <h2 id="一-tui-的整体形态">一、TUI 的整体形态</h2>
        </div>
      `
      const heading = container.querySelector('h2')!

      // 1. Target is GFM slug
      const foundFromGfm = findAnchorTargetElement(container, '#一tui-的整体形态')
      expect(foundFromGfm).toBe(heading)

      // 2. Target contains Chinese punctuation
      const foundFromChinese = findAnchorTargetElement(container, '#一、tui-的整体形态')
      expect(foundFromChinese).toBe(heading)

      // 3. Target is raw heading text
      const foundFromRaw = findAnchorTargetElement(container, '#一、TUI 的整体形态')
      expect(foundFromRaw).toBe(heading)

      // 4. Target is percent-encoded
      const foundFromEncoded = findAnchorTargetElement(
        container,
        '#' + encodeURIComponent('一、TUI 的整体形态')
      )
      expect(foundFromEncoded).toBe(heading)
    })

    it('matches target heading by link text when targetId is arbitrary or custom', () => {
      const container = document.createElement('div')
      container.innerHTML = `
        <h2 id="custom-heading-ref">五、事件桥：两条 goroutine，一个 channel</h2>
      `
      const heading = container.querySelector('h2')!

      const found = findAnchorTargetElement(
        container,
        '#custom-anchor',
        '五、事件桥：两条 goroutine，一个 channel'
      )
      expect(found).toBe(heading)
    })

    it('matches target heading by stripped numbering', () => {
      const container = document.createElement('div')
      container.innerHTML = `
        <h2 id="sec-1">一、TUI 的整体形态</h2>
      `
      const heading = container.querySelector('h2')!

      const found = findAnchorTargetElement(container, '#tui-的整体形态', 'TUI 的整体形态')
      expect(found).toBe(heading)
    })

    it('disambiguates duplicate headings with index suffixes', () => {
      const container = document.createElement('div')
      container.innerHTML = `
        <h2 id="introduction">Introduction</h2>
        <h2 id="introduction-2">Introduction</h2>
      `
      const first = container.querySelectorAll('h2')[0]
      const second = container.querySelectorAll('h2')[1]

      // In marked, duplicate is -2
      expect(findAnchorTargetElement(container, '#introduction')).toBe(first)
      expect(findAnchorTargetElement(container, '#introduction-2')).toBe(second)

      // In GFM, duplicate is -1
      expect(findAnchorTargetElement(container, '#introduction-1')).toBe(second)
    })

    it('returns null when target cannot be found', () => {
      const container = document.createElement('div')
      container.innerHTML = '<h2 id="section-a">Section A</h2>'
      expect(findAnchorTargetElement(container, '#non-existent')).toBeNull()
      expect(findAnchorTargetElement(null, '#section-a')).toBeNull()
    })
  })

  describe('scrollToTargetElement', () => {
    it('calculates correct container scrollTop and adjusts by topOffset', () => {
      const container = document.createElement('div')
      const target = document.createElement('h2')
      target.textContent = 'Heading'
      container.appendChild(target)
      document.body.appendChild(container)

      // Mock getBoundingClientRect
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
        top: 100,
        bottom: 600,
        left: 0,
        right: 800,
        width: 800,
        height: 500,
        x: 0,
        y: 100,
        toJSON: () => {},
      })

      vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
        top: 350,
        bottom: 390,
        left: 20,
        right: 780,
        width: 760,
        height: 40,
        x: 20,
        y: 350,
        toJSON: () => {},
      })

      container.scrollTop = 50
      // targetTop relative to container = 50 + (350 - 100) - 16 = 284
      scrollToTargetElement(container, target, 16)
      expect(container.scrollTop).toBe(284)
      expect(target.classList.contains('line-flash')).toBe(true)
    })
  })

  describe('Full Markdown Preview TOC Link Flow', () => {
    it('successfully finds and navigates to headings from a markdown TOC list', () => {
      // Simulates the exact DOM generated from the user screenshot
      const container = document.createElement('div')
      container.className = 'markdown-body'
      container.innerHTML = `
        <h1>全屏 TUI 事件桥与 MVU 生命周期设计</h1>
        <p>本笔记以 tui.Run 为主线...</p>
        <h2>目录</h2>
        <ul>
          <li><a id="link-1" href="#一tui-的整体形态">一、TUI 的整体形态</a></li>
          <li><a id="link-2" href="#二入口分派与门控">二、入口分派与门控</a></li>
          <li><a id="link-3" href="#五事件桥两条-goroutine一个-channel">五、事件桥：两条 goroutine，一个 channel</a></li>
        </ul>
        <h2 id="一-tui-的整体形态">一、TUI 的整体形态</h2>
        <p>内容一...</p>
        <h2 id="二-入口分派与门控">二、入口分派与门控</h2>
        <p>内容二...</p>
        <h2 id="五-事件桥-两条-goroutine-一个-channel">五、事件桥：两条 goroutine，一个 channel</h2>
        <p>内容五...</p>
      `
      document.body.appendChild(container)

      const link1 = container.querySelector<HTMLAnchorElement>('#link-1')!
      const link2 = container.querySelector<HTMLAnchorElement>('#link-2')!
      const link3 = container.querySelector<HTMLAnchorElement>('#link-3')!

      const target1 = container.querySelector<HTMLElement>('#一-tui-的整体形态')!
      const target2 = container.querySelector<HTMLElement>('#二-入口分派与门控')!
      const target3 = container.querySelector<HTMLElement>('#五-事件桥-两条-goroutine-一个-channel')!

      // Link 1: #一tui-的整体形态 -> #一-tui-的整体形态
      const href1 = decodeURIComponent(link1.getAttribute('href')!.slice(1))
      expect(findAnchorTargetElement(container, href1, link1.textContent || '')).toBe(target1)

      // Link 2: #二入口分派与门控 -> #二-入口分派与门控
      const href2 = decodeURIComponent(link2.getAttribute('href')!.slice(1))
      expect(findAnchorTargetElement(container, href2, link2.textContent || '')).toBe(target2)

      // Link 3: #五事件桥两条-goroutine一个-channel -> #五-事件桥-两条-goroutine-一个-channel
      const href3 = decodeURIComponent(link3.getAttribute('href')!.slice(1))
      expect(findAnchorTargetElement(container, href3, link3.textContent || '')).toBe(target3)
    })
  })

  describe('Component Rendering Smoke Test', () => {
    it('mounts MarkdownPreview component without runtime errors', async () => {
      const { mount } = await import('@vue/test-utils')
      const i18n = (await import('@/i18n')).default
      const MarkdownPreview = (await import('@/components/file/MarkdownPreview.vue')).default

      const wrapper = mount(MarkdownPreview, {
        props: {
          file: {
            name: 'test.md',
            path: 'test.md',
            content: '# Heading 1\nSome paragraph\n\n## Heading 2',
          },
          viewMode: 'rendered',
          wordWrap: true,
          showLineNumbers: true,
        },
        global: {
          plugins: [i18n],
        },
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.markdown-preview').exists()).toBe(true)
      wrapper.unmount()
    })

    it('mounts TocPanel component without runtime errors', async () => {
      const { mount } = await import('@vue/test-utils')
      const i18n = (await import('@/i18n')).default
      const TocPanel = (await import('@/components/TocPanel.vue')).default

      const wrapper = mount(TocPanel, {
        props: {
          open: true,
          file: {
            name: 'test.md',
            path: 'test.md',
            content: '# Heading 1\n## Heading 2',
          },
          codeView: false,
        },
        global: {
          plugins: [i18n],
        },
      })

      expect(wrapper.exists()).toBe(true)
      wrapper.unmount()
    })

    it('mounts App root component without runtime errors', async () => {
      const { mount } = await import('@vue/test-utils')
      const i18n = (await import('@/i18n')).default
      const App = (await import('@/App.vue')).default

      const wrapper = mount(App, {
        global: {
          plugins: [i18n],
        },
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.vscode-md-app').exists()).toBe(true)
      wrapper.unmount()
    })
  })
})


