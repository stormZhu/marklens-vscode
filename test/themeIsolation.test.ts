import { describe, it, expect, beforeEach } from 'vitest'
import { isDarkTheme, applyThemeAttributes, resolveThemeId, THEMES } from '@/utils/themeMeta'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('Theme Isolation & Host Theme Decoupling', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-theme-base')
    document.documentElement.removeAttribute('data-hljs-theme')
    document.documentElement.removeAttribute('data-vscode-color-kind')
    document.body.className = ''
  })

  it('correctly classifies all dark and light themes', () => {
    expect(isDarkTheme('github-dark')).toBe(true)
    expect(isDarkTheme('tokyo-night')).toBe(true)
    expect(isDarkTheme('monokai')).toBe(true)
    expect(isDarkTheme('solarized-dark')).toBe(true)

    expect(isDarkTheme('github-light')).toBe(false)
    expect(isDarkTheme('one-light')).toBe(false)
    expect(isDarkTheme('solarized-light')).toBe(false)
    expect(isDarkTheme('catppuccin-latte')).toBe(false)
  })

  it('applies dark theme attributes correctly even when host is in light mode', () => {
    // Simulate VS Code host in light mode
    document.documentElement.setAttribute('data-vscode-color-kind', 'light')
    document.body.className = 'vscode-light'

    // User chooses dark theme
    applyThemeAttributes('tokyo-night')

    expect(document.documentElement.getAttribute('data-theme')).toBe('tokyo-night')
    expect(document.documentElement.getAttribute('data-theme-base')).toBe('dark')
    expect(document.documentElement.getAttribute('data-hljs-theme')).toBe('dark')
  })

  it('applies light theme attributes correctly even when host is in dark mode', () => {
    // Simulate VS Code host in dark mode
    document.documentElement.setAttribute('data-vscode-color-kind', 'dark')
    document.body.className = 'vscode-dark'

    // User chooses light theme
    applyThemeAttributes('github-light')

    expect(document.documentElement.getAttribute('data-theme')).toBe('github-light')
    expect(document.documentElement.getAttribute('data-theme-base')).toBe('light')
    expect(document.documentElement.getAttribute('data-hljs-theme')).toBe('light')
  })

  it('resolves auto theme to match host color kind when in auto mode', () => {
    document.documentElement.setAttribute('data-vscode-color-kind', 'light')
    expect(resolveThemeId('auto')).toBe('bluloco-light')

    document.documentElement.setAttribute('data-vscode-color-kind', 'dark')
    expect(resolveThemeId('auto')).toBe('bluloco-dark')
  })

  it('ensures markdown stylesheets explicitly set text color on inline code', () => {
    const markdownCommonCss = readFileSync(resolve(__dirname, '../web/css/markdown-common.css'), 'utf-8')
    const contentCss = readFileSync(resolve(__dirname, '../web/css/content.css'), 'utf-8')
    const baseCss = readFileSync(resolve(__dirname, '../web/css/base.css'), 'utf-8')

    // Verify inline code has color definition
    expect(markdownCommonCss).toContain('color: var(--text-bold, var(--text-primary))')
    expect(contentCss).toContain('color: var(--text-bold, var(--text-primary))')

    // Verify host isolation overrides --vscode-textPreformat-foreground
    expect(baseCss).toContain('--vscode-textPreformat-foreground: var(--text-bold, var(--text-primary))')
    expect(baseCss).toContain('body.vscode-light')
    expect(baseCss).toContain('body.vscode-dark')
  })
})
