# Changelog

All notable changes to **MarkLens** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.3] - 2026-10-04

### Added
- **Markdown Font Size Controls**:
  - Added interactive font size adjustment (`A−` / `16px` / `A+`) in the header `⋮` dropdown menu.
  - Supports 10px – 32px step adjustment with real-time preview.
  - Headings (H1 – H6) automatically scale proportionally via CSS variables.
  - Settings are persisted in local storage across sessions.
- **UI Scale Zoom Controls**:
  - Added interface scale controls (`−` / `100%` / `+` / `↺ Reset`) in the header `⋮` dropdown menu.
  - Allows 50% – 200% global UI zoom for high-DPI displays or customized viewing preferences.
  - Added `Cmd+0` (macOS) / `Ctrl+0` (Windows/Linux) keyboard shortcut to instantly reset UI zoom to 100%.
- **Mouse Wheel Zoom & Safety Toggle**:
  - Supported `Cmd + Mouse Wheel` (macOS) / `Ctrl + Mouse Wheel` (Windows/Linux) for fluid interface zooming.
  - Added a dedicated toggle `Cmd/Ctrl + Scroll Zoom` in the dropdown menu (**disabled by default**) to prevent accidental zoom triggers during document reading.
- **Internationalization (i18n)**:
  - Added complete English and Simplified Chinese translations for Font Size, UI Scale, Reset Zoom, and Mouse Wheel Zoom settings.

---

## [0.1.2] - 2026-10-01

### Added
- **Custom Readonly Editor & Automatic Preview**:
  - Registered custom editor provider so clicking a Markdown file opens directly in MarkLens Preview by default.
  - Added tab title format `filename (Preview)` for clear distinction from text editor mode.
  - Smooth bi-directional line sync when switching between MarkLens Preview and native text editor.
- **One-Click Local Installation Scripts**:
  - Added `npm run install:local`, `npm run install:code`, and `npm run install:trae` for automatic extension installation.

---

## [0.1.1] - 2026-09-30

### Fixed
- Fixed host theme isolation issues inside VS Code webviews.
- Updated default auto theme mapping to Bluloco for better contrast and reading experience.

---

## [0.1.0] - 2026-09-30

### Added
- Initial release of MarkLens Markdown Preview:
  - Interactive file path detection with floating code preview card.
  - Code block headers with language pill, line counts, and one-click copy.
  - Interactive KaTeX math formulas and Mermaid diagram rendering.
  - Fullscreen Lightbox image preview with zoom & pan interactions.
  - Collapsible and resizable TOC outline dock.
  - Table row detail expansion modal.
  - 36 built-in color themes with auto light/dark detection.
  - Standalone single-file HTML export with embedded assets.
