import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

/**
 * Vite plugin to wrap highlight.js theme CSS with `[data-hljs-theme]` attribute
 * selectors so light (`github.css`) and dark (`github-dark.css`) styles coexist
 * without overriding each other — identical to ClawBench's vite.config.ts.
 */
function hljsThemeWrapper(): Plugin {
  return {
    name: 'hljs-theme-wrapper',
    transform(code: string, id: string) {
      if (id.includes('highlight.js') && id.endsWith('github.css') && !id.endsWith('github-dark.css')) {
        return code.replace(/(\.hljs[\w-]*)/g, '[data-hljs-theme="light"] $1')
      }
      if (id.includes('highlight.js') && id.endsWith('github-dark.css')) {
        return code.replace(/(\.hljs[\w-]*)/g, '[data-hljs-theme="dark"] $1')
      }
    },
  }
}

export default defineConfig({
  plugins: [vue(), hljsThemeWrapper()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'web/src'),
    },
  },
  build: {
    outDir: 'dist/webview',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100000,
    rollupOptions: {
      input: path.resolve(__dirname, 'web/src/main.ts'),
      output: {
        format: 'es',
        inlineDynamicImports: true,
        entryFileNames: 'webview.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'webview.css'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
})
