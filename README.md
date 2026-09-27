# MarkLens — Interactive Markdown Preview for VSCode

Interactive, code-aware Markdown preview and custom editor for VSCode — featuring automatic repository file-path detection & floating code slice preview, code/table action headers, KaTeX math, Mermaid diagrams, Lightbox zoom, resizable TOC dock, table row detail modal, 36 curated themes, and standalone HTML export.

## Features

- **Rich Markdown Rendering Pipeline**:
  - `protectMarkdown` → `marked` (source-line annotations + heading slugs) → `KaTeX` math formulas → `highlight.js` (~50 languages, dual light/dark theme coexistence) → `Mermaid` diagrams → media figure wrappers.
- **Code Block & Table Block Header Bars**:
  - Language label, one-click Copy, and Word-Wrap toggle on every code block.
  - Table header with `Copy` dropdown (**Copy as Markdown**, **Copy as HTML**, **Copy as TSV**) and Word-Wrap toggle.
- **Automatic File/Code Path Detection & Floating Preview (`CodeLinkPreview`)**:
  - Automatically detects and verifies project-relative and absolute file/directory paths in inline code, code blocks, and links (`internal/agenttool ↗`).
  - **Click path text**: Opens a floating, pinnable, draggable `CodeLinkPreview` card with syntax-highlighted line slices, rendered Markdown preview, directory listing, or media preview.
  - **Click `↗` button**: Opens the target file (and selects the exact `#L10-L20` / `:10-20` line range) directly in VSCode's editor, or reveals directories in the VSCode Explorer.
- **Table Row Click-to-Expand Modal (`TableRowModal`)**:
  - Click any table row (`tbody tr`) to inspect all columns in a structured vertical modal with previous/next row navigation and per-field copy.
- **Top Toolbar & Outline (`TocDock`)**:
  - File name & relative path (click to copy), Refresh, Resizable Outline/TOC dock (left or right), In-page Search (`Cmd/Ctrl+F`), Rendered/Source view toggle, Edit in VSCode button, Theme selector, and **Export Standalone HTML**.
- **36 Built-in Themes + Auto Follow VSCode**:
  - Defaults to `auto` (automatically switching between `github-light` and `github-dark` based on VSCode's active color theme), or choose from 36 built-in themes (`tokyo-night`, `catppuccin-mocha`, `dracula`, `one-dark-pro`, `nord`, `vitesse-dark`, `rose-pine`, etc.).

## Usage

1. **Open Preview to the Side**:
   - Press `Cmd+Shift+K` (macOS) / `Ctrl+Shift+K` (Windows/Linux) in any Markdown file, or click the **MarkLens: Open Markdown Preview to the Side** icon in the editor title bar.
2. **Open as Custom Editor**:
   - Right-click any `.md` file in the Explorer → **Open With...** → **MarkLens Markdown Preview** (or run command `MarkLens: Open Markdown Preview`).
3. **Select Theme**:
   - Click the Palette icon in the preview top bar, or run command `MarkLens: Select Markdown Preview Theme`.

## Build & Development

```bash
npm run build          # Builds dist/extension.js (esbuild) + dist/webview/* (vite)
npm test               # Runs Vitest unit tests
npm run package:vsix   # Packages marklens-0.1.0.vsix
```
