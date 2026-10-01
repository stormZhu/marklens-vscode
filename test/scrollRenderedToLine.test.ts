import { describe, it, expect } from 'vitest'
import {
  collectLineBlocks,
  computeTopSourceLineFromBlocks,
  computeScrollTopForSourceLine,
  findBlockAtOrBefore,
  type LineBlock,
} from '@/utils/scrollRenderedToLine'

function mockElementRect(el: HTMLElement, top: number, height: number): void {
  el.getBoundingClientRect = () =>
    ({
      top,
      bottom: top + height,
      left: 0,
      right: 800,
      width: 800,
      height,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect
}

describe('scrollRenderedToLine', () => {
  it('filters out ancestor container blocks (table, ul, blockquote) when child line blocks exist', () => {
    const container = document.createElement('div')
    mockElementRect(container, 0, 600)
    container.scrollTop = 0

    const content = document.createElement('div')
    content.className = 'markdown-content'
    container.appendChild(content)

    // Table with 2 rows
    const table = document.createElement('table')
    table.setAttribute('data-source-line', '10')
    table.setAttribute('data-source-end', '15')
    mockElementRect(table, 100, 120)

    const tr1 = document.createElement('tr')
    tr1.setAttribute('data-source-line', '10')
    mockElementRect(tr1, 101, 40)
    table.appendChild(tr1)

    const tr2 = document.createElement('tr')
    tr2.setAttribute('data-source-line', '12')
    mockElementRect(tr2, 141, 40)
    table.appendChild(tr2)

    content.appendChild(table)

    // Unordered list with a loose list item containing a <p> on the same line
    const ul = document.createElement('ul')
    ul.setAttribute('data-source-line', '20')
    ul.setAttribute('data-source-end', '25')
    mockElementRect(ul, 240, 100)

    const li1 = document.createElement('li')
    li1.setAttribute('data-source-line', '20')
    mockElementRect(li1, 240, 45)
    const pInLi = document.createElement('p')
    pInLi.setAttribute('data-source-line', '20')
    mockElementRect(pInLi, 240, 45)
    li1.appendChild(pInLi)
    ul.appendChild(li1)

    const li2 = document.createElement('li')
    li2.setAttribute('data-source-line', '22')
    mockElementRect(li2, 290, 45)
    ul.appendChild(li2)

    content.appendChild(ul)

    const blocks = collectLineBlocks(container)
    expect(blocks.map(b => b.line)).toEqual([10, 12, 20, 22])
    expect(blocks.map(b => b.top)).toEqual([101, 141, 240, 290])
  })

  it('forms a strict bijection between scrollTop and sourceLine across diverse blocks', () => {
    const dummyEl = document.createElement('div')
    const blocks: LineBlock[] = [
      { el: dummyEl, line: 1, endLine: 1, top: 0, height: 38 },
      { el: dummyEl, line: 3, endLine: 8, top: 54, height: 110 },
      { el: dummyEl, line: 10, endLine: 28, top: 180, height: 680 }, // Tall Mermaid diagram
      { el: dummyEl, line: 30, endLine: 30, top: 880, height: 32 },
      { el: dummyEl, line: 32, endLine: 45, top: 928, height: 280 },
    ]
    const totalLines = 45

    // Test round-trip from sourceLine -> scrollTop -> sourceLine
    for (const targetLine of [1, 2, 3, 5.5, 10, 14.25, 19.8, 28, 29, 30, 38.4, 45]) {
      const top = computeScrollTopForSourceLine(blocks, targetLine, totalLines)
      const recovered = computeTopSourceLineFromBlocks(blocks, top, totalLines)
      expect(recovered).toBeCloseTo(targetLine, 3)
    }

    // Test round-trip from scrollTop -> sourceLine -> scrollTop
    for (const scrollTop of [0, 27, 54, 110, 180, 450, 720, 880, 928, 1050, 1208]) {
      const line = computeTopSourceLineFromBlocks(blocks, scrollTop, totalLines)
      const recoveredTop = computeScrollTopForSourceLine(blocks, line, totalLines)
      expect(recoveredTop).toBeCloseTo(scrollTop, 2)
    }
  })

  it('findBlockAtOrBefore locates the owning block for any line', () => {
    const blocks = [{ line: 1 }, { line: 10 }, { line: 25 }, { line: 40 }]
    expect(findBlockAtOrBefore(blocks, 1)).toBe(0)
    expect(findBlockAtOrBefore(blocks, 9)).toBe(0)
    expect(findBlockAtOrBefore(blocks, 10)).toBe(1)
    expect(findBlockAtOrBefore(blocks, 24.9)).toBe(1)
    expect(findBlockAtOrBefore(blocks, 25)).toBe(2)
    expect(findBlockAtOrBefore(blocks, 100)).toBe(3)
  })
})
