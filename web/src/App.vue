<template>
  <div class="vscode-md-app">
    <!-- Top Toolbar (ClawBench FileHeader style) -->
    <div class="file-header-bar">
      <div class="file-name-wrap">
        <FileIcon :path="currentFile.name || 'README.md'" :size="15" />
        <span
          class="file-path-hint"
          :class="{ copied: pathCopied }"
          :title="currentFile.path || currentFile.name"
          @click="handleCopyFilePath"
        >
          {{ currentFile.name || 'Untitled.md' }}
        </span>
        <span v-if="fileDirHint" class="file-dir-subhint" :title="fileDirHint">
          {{ fileDirHint }}
        </span>
      </div>

      <div class="header-actions">
        <!-- Refresh -->
        <RefreshButton
          icon="RotateCw"
          class="file-header-btn"
          :loading="refreshing"
          :disabled="refreshing"
          :title="t('nav.refresh')"
          @click.stop="handleRefresh"
        />

        <!-- TOC Outline Toggle -->
        <button
          class="file-header-btn"
          :class="{ active: tocOpen }"
          :title="t('file.header.toc')"
          @click.stop="tocOpen = !tocOpen"
        >
          <List :size="14" />
        </button>

        <!-- In-page Search Toggle -->
        <button
          class="file-header-btn"
          :class="{ active: searchOpen }"
          :title="t('file.header.search') + ' (⌘F / Ctrl+F)'"
          @click.stop="toggleSearch"
        >
          <Search :size="14" />
        </button>

        <!-- Toggle Rendered / Source View -->
        <button
          class="file-header-btn"
          :class="{ active: viewMode === 'rendered' }"
          :title="viewMode === 'rendered' ? t('file.header.sourceView') : t('file.header.renderedView')"
          @click.stop="toggleViewMode"
        >
          <Eye :size="14" />
        </button>

        <!-- Switch to Native VSCode Text Editor -->
        <button
          class="file-header-btn"
          :title="t('file.header.edit') + ' (VSCode)'"
          @click.stop="handleEditInVscode"
        >
          <Pencil :size="14" />
        </button>

        <!-- Export Standalone HTML -->
        <button
          class="file-header-btn"
          :disabled="exporting"
          :title="t('file.header.exportHtml')"
          @click.stop="handleExportHtml"
        >
          <FileOutput :size="14" />
        </button>

        <!-- Theme Picker Dropdown -->
        <div class="dropdown-wrapper" ref="themeDropdownRef">
          <button
            class="file-header-btn"
            :class="{ active: themeMenuOpen }"
            :title="t('settings.items.theme')"
            @click.stop="toggleThemeMenu"
          >
            <Palette :size="14" />
          </button>
          <Teleport to="body">
            <div
              v-if="themeMenuOpen"
              ref="themeMenuEl"
              class="file-header-dropdown-menu theme-dropdown-menu"
              :style="themeMenuStyle"
            >
              <button
                class="dropdown-item"
                :class="{ active: selectedThemeSetting === 'auto' }"
                @click="selectTheme('auto')"
              >
                <span class="theme-swatch theme-swatch-auto" />
                <span>Auto (VSCode)</span>
                <span v-if="selectedThemeSetting === 'auto'" class="wrap-check">✓</span>
              </button>
              <div class="dropdown-divider" />
              <div class="theme-group-label">Light Themes</div>
              <button
                v-for="th in lightThemes"
                :key="th.id"
                class="dropdown-item"
                :class="{ active: selectedThemeSetting === th.id }"
                @click="selectTheme(th.id)"
              >
                <span
                  class="theme-swatch"
                  :style="{ background: th.preview.bg, borderColor: th.preview.accent }"
                >
                  <span class="theme-swatch-dot" :style="{ background: th.preview.accent }" />
                </span>
                <span>{{ formatThemeLabel(th.id, th.labelKey) }}</span>
                <span v-if="selectedThemeSetting === th.id" class="wrap-check">✓</span>
              </button>
              <div class="dropdown-divider" />
              <div class="theme-group-label">Dark Themes</div>
              <button
                v-for="th in darkThemes"
                :key="th.id"
                class="dropdown-item"
                :class="{ active: selectedThemeSetting === th.id }"
                @click="selectTheme(th.id)"
              >
                <span
                  class="theme-swatch"
                  :style="{ background: th.preview.bg, borderColor: th.preview.accent }"
                >
                  <span class="theme-swatch-dot" :style="{ background: th.preview.accent }" />
                </span>
                <span>{{ formatThemeLabel(th.id, th.labelKey) }}</span>
                <span v-if="selectedThemeSetting === th.id" class="wrap-check">✓</span>
              </button>
            </div>
          </Teleport>
        </div>

        <!-- More Menu -->
        <div class="dropdown-wrapper" ref="moreDropdownRef">
          <button
            class="file-header-btn"
            :class="{ active: moreMenuOpen }"
            :title="t('file.header.more')"
            @click.stop="toggleMoreMenu"
          >
            <MoreVertical :size="14" />
          </button>
          <Teleport to="body">
            <div
              v-if="moreMenuOpen"
              ref="moreMenuEl"
              class="file-header-dropdown-menu"
              :style="moreMenuStyle"
            >
              <button class="dropdown-item" @click="handleRevealInExplorer">
                <FolderOpen :size="14" />
                <span>{{ t('file.header.openDirectory') }}</span>
              </button>
              <button class="dropdown-item" @click="handleExportHtml">
                <FileOutput :size="14" />
                <span>{{ t('file.header.exportHtml') }}</span>
              </button>
              <div class="dropdown-divider" />
              <button class="dropdown-item" @click="toggleWordWrap">
                <TextWrap :size="14" />
                <span>{{ t('file.header.wordWrap') }}</span>
                <span v-if="wordWrap" class="wrap-check">✓</span>
              </button>
              <button class="dropdown-item" @click="toggleLineNumbers">
                <Hash :size="14" />
                <span>{{ t('file.header.lineNumbers') }}</span>
                <span v-if="showLineNumbers" class="wrap-check">✓</span>
              </button>
              <button class="dropdown-item" @click="toggleCodeLinkPreview">
                <Code2 :size="14" />
                <span>Code Link Preview</span>
                <span v-if="codeLinkPreviewEnabled" class="wrap-check">✓</span>
              </button>
              <div class="dropdown-divider" />
              <button class="dropdown-item" @click="handleToggleLocale">
                <Languages :size="14" />
                <span>{{ currentLocale === 'zh' ? '切换为 English' : 'Switch to 中文' }}</span>
              </button>
            </div>
          </Teleport>
        </div>
      </div>
    </div>

    <!-- Main Content + Optional Resizable TOC Dock -->
    <div class="file-viewer-body">
      <TocDock
        v-if="tocOpen && tocDockSide === 'left'"
        :file="currentFile"
        :code-view="viewMode !== 'rendered'"
        side="left"
        @close="tocOpen = false"
        @jump="handleTocJump"
      />

      <div class="file-content" ref="fileContentRef">
        <MarkdownPreview
          v-if="viewMode === 'rendered'"
          ref="mdPreviewRef"
          :file="currentFile"
          view-mode="rendered"
          :search-open="searchOpen"
          :word-wrap="wordWrap"
          :show-line-numbers="showLineNumbers"
          @close-search="searchOpen = false"
        />
        <div v-else class="raw-source-viewer" ref="rawContainerRef">
          <CodePreviewBody
            status="ready"
            error-message-text=""
            :error-code="null"
            :is-word-wrap="wordWrap"
            :show-line-numbers="showLineNumbers"
            :code-lines="sourceCodeLines"
            :matching-line-indices="[]"
            :active-match-index="-1"
            :remaining-above="0"
            :remaining-below="0"
            :loading-direction="null"
            :load-more-above="() => {}"
            :load-more-below="() => {}"
          />
        </div>
      </div>

      <TocDock
        v-if="tocOpen && tocDockSide === 'right'"
        :file="currentFile"
        :code-view="viewMode !== 'rendered'"
        side="right"
        @close="tocOpen = false"
        @jump="handleTocJump"
      />
    </div>

    <!-- Shared Lightbox for Images / Inline SVGs / Mermaid Diagrams -->
    <Lightbox />

    <!-- Toast Notification Banner -->
    <Transition name="toast-fade">
      <div
        v-if="toast.visible.value"
        class="vscode-toast"
        :class="`vscode-toast--${toast.type.value}`"
        @click="toast.dismiss()"
      >
        <span v-if="toast.icon.value" class="vscode-toast-icon">{{ toast.icon.value }}</span>
        <span class="vscode-toast-msg">{{ toast.message.value }}</span>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, provide, readonly, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Code2,
  Eye,
  FileOutput,
  FolderOpen,
  Hash,
  Languages,
  List,
  MoreVertical,
  Palette,
  Pencil,
  Search,
  TextWrap,
} from 'lucide-vue-next'
import FileIcon from '@/components/common/FileIcon.vue'
import RefreshButton from '@/components/common/RefreshButton.vue'
import MarkdownPreview from '@/components/file/MarkdownPreview.vue'
import CodePreviewBody from '@/components/file/CodePreviewBody.vue'
import TocDock from '@/components/file/TocDock.vue'
import Lightbox from '@/components/media/Lightbox.vue'
import { store } from '@/stores/app'
import {
  documentState,
  postToHost,
  revealInVscodeExplorer,
  switchToNativeTextEditor,
} from '@/bridge/vscodeBridge'
import { clearVerifiedCache } from '@/composables/useFilePathAnnotation'
import { useTocDockPreference } from '@/composables/useTocDockPreference'
import { useSettingsConfig } from '@/composables/useSettingsConfig'
import { useLocale } from '@/composables/useLocale'
import { useToast } from '@/composables/useToast'
import { THEMES, resolveThemeId, applyThemeAttributes } from '@/utils/themeMeta'
import { initMermaid, reRenderMermaid } from '@/utils/mermaid'
import { exportMarkdownToHtml } from '@/utils/exportMarkdownHtml'
import { downloadBlob } from '@/utils/download'
import { copyText } from '@/utils/clipboard'
import { dirName } from '@/utils/path'
import { highlightCode } from '@/utils/globals'
import { splitHighlightedHtml } from '@/utils/codeLinkPreview'
import { flashElement } from '@/utils/domFlash'

const { t } = useI18n()
const { currentLocale, toggleLocale } = useLocale()
const { localConfig, setLocalConfig } = useSettingsConfig()
const { tocDockSide } = useTocDockPreference()
const toast = useToast()

const viewMode = ref<'rendered' | 'raw'>('rendered')
const tocOpen = ref(false)
const searchOpen = ref(false)
const refreshing = ref(false)
const exporting = ref(false)
const pathCopied = ref(false)

const mdPreviewRef = ref<InstanceType<typeof MarkdownPreview> | null>(null)
const rawContainerRef = ref<HTMLElement | null>(null)

const currentThemeId = ref(document.documentElement.getAttribute('data-theme') || 'github-dark')
provide('theme', readonly(currentThemeId))

const selectedThemeSetting = computed(() => String(localConfig.theme ?? 'auto'))
const lightThemes = computed(() => THEMES.filter(th => !th.dark))
const darkThemes = computed(() => THEMES.filter(th => th.dark))

const wordWrap = computed(() => localConfig.wordWrap !== false)
const showLineNumbers = computed(() => localConfig.lineNumbers !== false)
const codeLinkPreviewEnabled = computed(() => localConfig.markdownCodeLinkPreview !== false)

const currentFile = computed(() => ({
  name: documentState.name || 'README.md',
  path: documentState.relativePath || documentState.path || 'README.md',
  content: documentState.content || '',
}))

const fileDirHint = computed(() => {
  const rel = documentState.relativePath || ''
  return rel ? dirName(rel) : ''
})

const sourceCodeLines = computed(() => {
  const content = currentFile.value.content || ''
  const rawLines = content.split('\n')
  const highlighted = splitHighlightedHtml(highlightCode(content, 'markdown'))
  return rawLines.map((rawText, idx) => ({
    lineNumber: idx + 1,
    rawText,
    html: highlighted[idx] ?? '',
    isTarget: false,
  }))
})

function syncStoreAndTheme() {
  store.state.projectRoot = documentState.projectRoot || ''
  store.state.homeDir = documentState.homeDir || ''
  store.state.currentFile = {
    name: currentFile.value.name,
    path: currentFile.value.path,
    content: currentFile.value.content,
  }
  store.state.currentDir = dirName(currentFile.value.path)

  document.documentElement.setAttribute('data-vscode-color-kind', documentState.vscodeColorKind)
  if (documentState.themeSetting) {
    localConfig.theme = documentState.themeSetting
  }
  applyActiveTheme()
}

function applyActiveTheme() {
  const resolved = resolveThemeId(String(localConfig.theme ?? 'auto'))
  applyThemeAttributes(resolved)
  if (currentThemeId.value !== resolved) {
    currentThemeId.value = resolved
    void initMermaid(resolved).then(() => reRenderMermaid())
  }
}

watch(
  () => [
    documentState.path,
    documentState.relativePath,
    documentState.name,
    documentState.content,
    documentState.projectRoot,
    documentState.homeDir,
    documentState.themeSetting,
    documentState.vscodeColorKind,
  ],
  () => {
    syncStoreAndTheme()
  },
  { immediate: true },
)

async function handleCopyFilePath() {
  const pathToCopy = currentFile.value.path
  if (!pathToCopy) return
  await copyText(pathToCopy)
  pathCopied.value = true
  toast.show(t('file.codePreview.pathCopied'), { icon: '✅', type: 'success', duration: 1800 })
  setTimeout(() => {
    pathCopied.value = false
  }, 1500)
}

function handleRefresh() {
  refreshing.value = true
  clearVerifiedCache()
  postToHost({ type: 'requestRefresh' })
  setTimeout(() => {
    refreshing.value = false
  }, 400)
}

function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (searchOpen.value) {
    nextTick(() => {
      mdPreviewRef.value?.focusSearchInput()
    })
  }
}

function toggleViewMode() {
  viewMode.value = viewMode.value === 'rendered' ? 'raw' : 'rendered'
}

function handleEditInVscode() {
  const scrollEntry = mdPreviewRef.value?.captureCurrentScrollState?.()
  const line = scrollEntry && 'sourceLine' in scrollEntry ? scrollEntry.sourceLine : undefined
  switchToNativeTextEditor(line)
}

function handleRevealInExplorer() {
  moreMenuOpen.value = false
  revealInVscodeExplorer(currentFile.value.path)
}

function toggleWordWrap() {
  setLocalConfig('wordWrap', !wordWrap.value)
}

function toggleLineNumbers() {
  setLocalConfig('lineNumbers', !showLineNumbers.value)
}

function toggleCodeLinkPreview() {
  setLocalConfig('markdownCodeLinkPreview', !codeLinkPreviewEnabled.value)
}

function handleToggleLocale() {
  toggleLocale()
  moreMenuOpen.value = false
}

async function handleExportHtml() {
  moreMenuOpen.value = false
  if (exporting.value || !currentFile.value.content) return
  exporting.value = true
  try {
    const res = await exportMarkdownToHtml({
      content: currentFile.value.content,
      path: currentFile.value.path,
      projectRoot: store.state.projectRoot,
      homeDir: store.state.homeDir,
      fileName: currentFile.value.name,
      locale: currentLocale.value,
    })
    const outName = (currentFile.value.name.replace(/\.(md|markdown|mdown|mkd)$/i, '') || 'document') + '.html'
    downloadBlob(res.html, outName, 'text/html;charset=utf-8')
    toast.show(t('file.header.exportHtmlSuccess'), { icon: '✅', type: 'success', duration: 2500 })
  } catch (err) {
    toast.show(String(err), { icon: '❌', type: 'error', duration: 3000 })
  } finally {
    exporting.value = false
  }
}

function handleTocJump(line: number, anchorId?: string) {
  if (viewMode.value === 'rendered' && anchorId) {
    const el = document.getElementById(anchorId)
    if (el) {
      el.scrollIntoView({ behavior: 'auto', block: 'start' })
      flashElement(el)
      return
    }
  }
  if (viewMode.value === 'raw' && line > 0) {
    const row = rawContainerRef.value?.querySelector(`[data-line-number="${line}"]`)
    if (row) {
      row.scrollIntoView({ behavior: 'auto', block: 'center' })
      flashElement(row)
    }
  }
}

// ── Dropdown Positioning ──────────────────────────────────────────────────
const themeDropdownRef = ref<HTMLElement | null>(null)
const themeMenuEl = ref<HTMLElement | null>(null)
const themeMenuOpen = ref(false)
const themeMenuStyle = ref<Record<string, string>>({})

const moreDropdownRef = ref<HTMLElement | null>(null)
const moreMenuEl = ref<HTMLElement | null>(null)
const moreMenuOpen = ref(false)
const moreMenuStyle = ref<Record<string, string>>({})

function toggleThemeMenu() {
  moreMenuOpen.value = false
  themeMenuOpen.value = !themeMenuOpen.value
  if (themeMenuOpen.value && themeDropdownRef.value) {
    const rect = themeDropdownRef.value.getBoundingClientRect()
    themeMenuStyle.value = {
      top: `${rect.bottom + 4}px`,
      right: `${Math.max(8, window.innerWidth - rect.right)}px`,
    }
  }
}

function toggleMoreMenu() {
  themeMenuOpen.value = false
  moreMenuOpen.value = !moreMenuOpen.value
  if (moreMenuOpen.value && moreDropdownRef.value) {
    const rect = moreDropdownRef.value.getBoundingClientRect()
    moreMenuStyle.value = {
      top: `${rect.bottom + 4}px`,
      right: `${Math.max(8, window.innerWidth - rect.right)}px`,
    }
  }
}

function selectTheme(themeId: string) {
  setLocalConfig('theme', themeId)
  applyActiveTheme()
  themeMenuOpen.value = false
}

function formatThemeLabel(id: string, labelKey: string): string {
  const translated = t(labelKey)
  if (translated && translated !== labelKey) return translated
  return id
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function onDocumentClick(e: MouseEvent) {
  const target = e.target as Node | null
  if (
    themeMenuOpen.value &&
    !themeDropdownRef.value?.contains(target) &&
    !themeMenuEl.value?.contains(target)
  ) {
    themeMenuOpen.value = false
  }
  if (
    moreMenuOpen.value &&
    !moreDropdownRef.value?.contains(target) &&
    !moreMenuEl.value?.contains(target)
  ) {
    moreMenuOpen.value = false
  }
}

function onKeyDown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
    if (viewMode.value === 'rendered') {
      e.preventDefault()
      searchOpen.value = true
      nextTick(() => {
        mdPreviewRef.value?.focusSearchInput()
      })
    }
  }
}

function onVscodeCommand(e: Event) {
  const cmd = (e as CustomEvent<string>).detail
  if (cmd === 'exportHtml') {
    void handleExportHtml()
  } else if (cmd === 'toggleToc') {
    tocOpen.value = !tocOpen.value
  } else if (cmd === 'toggleSearch') {
    toggleSearch()
  } else if (cmd === 'openThemeMenu') {
    toggleThemeMenu()
  }
}

function onVscodeThemeUpdated() {
  document.documentElement.setAttribute('data-vscode-color-kind', documentState.vscodeColorKind)
  if (documentState.themeSetting) {
    localConfig.theme = documentState.themeSetting
  }
  applyActiveTheme()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('clawbench-vscode-command', onVscodeCommand)
  window.addEventListener('clawbench-vscode-theme-updated', onVscodeThemeUpdated)
  postToHost({ type: 'webviewReady' })
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('clawbench-vscode-command', onVscodeCommand)
  window.removeEventListener('clawbench-vscode-theme-updated', onVscodeThemeUpdated)
})
</script>

<style scoped>
.vscode-md-app {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.file-header-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: var(--header-height, 36px);
  padding: 0 var(--space-2) 0 var(--space-3);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  font-size: var(--font-size-sm);
  flex-shrink: 0;
  min-width: 0;
  z-index: 10;
}

.file-name-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 0 1 auto;
  min-width: 80px;
  max-width: 55%;
  overflow: hidden;
}

.file-path-hint {
  flex: 0 0 auto;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  transition: color var(--duration-base);
}
.file-path-hint:hover {
  color: var(--accent-color);
}
.file-path-hint.copied {
  color: #22c55e;
}

.file-dir-subhint {
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1 1 0;
  min-width: 0;
  justify-content: flex-end;
}

.file-header-btn {
  padding: 6px;
  border: none;
  border-radius: var(--radius-xs);
  background: transparent;
  font-size: var(--font-size-xs);
  cursor: pointer;
  color: var(--text-secondary);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.file-header-btn:hover {
  background: color-mix(in srgb, var(--accent-color) 12%, transparent);
  color: var(--text-primary);
}
.file-header-btn.active {
  background: color-mix(in srgb, var(--accent-color) 14%, transparent);
  color: var(--accent-color);
}
.file-header-btn:disabled {
  opacity: var(--opacity-disabled, 0.45);
  cursor: not-allowed;
}

.dropdown-wrapper {
  position: relative;
}

.file-viewer-body {
  display: flex;
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.file-content {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.raw-source-viewer {
  flex: 1 1 0;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
}
</style>

<style>
/* Hide chat-only attach/quote actions inside the standalone VSCode Markdown preview */
.code-block-attach-btn,
.table-block-attach-btn,
.image-block-attach-btn,
.mermaid-attach-btn,
.code-preview-btn.quote-btn,
.code-preview-footer-btn.quote-btn,
.code-preview-actions > button[title*="Quote"],
.code-preview-actions > button[title*="引用"] {
  display: none !important;
}

/* Desktop table row click-to-expand affordance */
.markdown-body tbody tr[data-row-idx] {
  cursor: pointer;
}

/* Dropdown menus (teleported to body) */
.file-header-dropdown-menu {
  position: fixed;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22);
  z-index: 9999;
  min-width: 180px;
  padding: 4px 0;
  overflow-y: auto;
  max-height: min(75vh, 520px);
}

.theme-dropdown-menu {
  min-width: 220px;
}

.theme-group-label {
  padding: 4px 12px 2px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.theme-swatch {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid var(--border-color);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.theme-swatch-auto {
  background: linear-gradient(135deg, #f8f9fa 50%, #161b22 50%);
}
.theme-swatch-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.file-header-dropdown-menu .dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  width: 100%;
  border: none;
  background: none;
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
}
.file-header-dropdown-menu .dropdown-item:hover {
  background: var(--accent-color);
  color: #fff;
}
.file-header-dropdown-menu .dropdown-item.active {
  background: color-mix(in srgb, var(--accent-color) 12%, transparent);
  color: var(--accent-color);
}
.file-header-dropdown-menu .dropdown-divider {
  height: 1px;
  background: var(--border-color);
  margin: 4px 0;
}
.file-header-dropdown-menu .wrap-check {
  margin-left: auto;
  color: var(--accent-color);
  font-weight: 700;
}
.file-header-dropdown-menu .dropdown-item:hover .wrap-check {
  color: #fff;
}

/* Toast banner */
.vscode-toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: var(--radius-md, 8px);
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  font-size: var(--font-size-sm);
  z-index: 10000;
  cursor: pointer;
}
.vscode-toast--error {
  border-color: #ef4444;
}
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}
</style>
