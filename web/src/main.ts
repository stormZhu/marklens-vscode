// Global ClawBench stylesheets (1:1 identical visual pipeline)
import '../css/variables.css'
import '../css/base.css'
import '../css/layout.css'
import '../css/wide-screen.css'
import '../css/markdown-common.css'
import '../css/code-block.css'
import '../css/code-block-header.css'
import '../css/content.css'
import '../css/media-block.css'
import '../css/components.css'
import '../css/diff-rows.css'
import '../css/share-chrome.css'

// Third-party & syntax highlight stylesheets
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github.css'
import 'highlight.js/styles/github-dark.css'
import '@/assets/hljs-light-override.css'
import '@/assets/mermaid.css'
import '@/assets/annotation-buttons.css'
import '@/assets/code-viewer.css'
import '@/assets/code-link-preview.css'
import '@/assets/search-bar.css'
import '@/assets/modal-card.css'
import '@/assets/modal-footer-btn.css'
import '@/assets/resize-divider.css'
import '@/assets/diff-marker.css'

import { createApp } from 'vue'
import App from './App.vue'
import i18n from './i18n'
import { LongPressDirective } from './directives/longPress'
import { configureMarkedRenderer } from './utils/markedConfig'
import { installLocalMediaFallback } from './utils/localMediaFallback'
import { resolveThemeId, applyThemeAttributes } from './utils/themeMeta'
import { localConfig } from './composables/useSettingsConfig'
import { installFetchInterceptor, handleHostMessage } from './bridge/vscodeBridge'

installFetchInterceptor()
window.addEventListener('message', handleHostMessage)

configureMarkedRenderer()
installLocalMediaFallback()

const docTheme = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null
const configuredTheme = String(localConfig.theme ?? 'auto')
const initialTheme = configuredTheme !== 'auto'
  ? resolveThemeId(configuredTheme)
  : (docTheme || resolveThemeId('auto'))
applyThemeAttributes(initialTheme)

const app = createApp(App)
app.use(i18n)
app.directive('long-press', LongPressDirective)
app.mount('#app')
