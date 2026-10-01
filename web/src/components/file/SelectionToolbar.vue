<template>
  <Teleport to="body">
    <Transition name="selection-toolbar-fade">
      <div
        v-if="visible"
        ref="toolbarElRef"
        class="selection-toolbar"
        :class="[`placement-${placement}`]"
        :style="toolbarStyle"
        @mousedown.stop
        @pointerdown.stop
      >
        <!-- Add to Chat (⌘U / Ctrl+U) -->
        <button
          class="toolbar-btn primary-btn"
          :title="`${gt('selectionToolbar.addToChat') || '添加到对话'} (${shortcutKey})`"
          @click="onAddToChat"
        >
          <Sparkles class="btn-icon" :size="13" />
          <span class="btn-label">{{ gt('selectionToolbar.addToChat') || '添加到对话' }}</span>
          <kbd class="btn-kbd">{{ shortcutKey }}</kbd>
        </button>

        <div class="toolbar-divider" />

        <!-- Edit Source (Enter) -->
        <button
          class="toolbar-btn"
          :title="`${gt('selectionToolbar.editSource') || '编辑源码'} (⏎)`"
          @click="onEditSource"
        >
          <SquarePen class="btn-icon" :size="13" />
          <span class="btn-label">{{ gt('selectionToolbar.editSource') || '编辑源码' }}</span>
          <kbd class="btn-kbd">⏎</kbd>
        </button>

        <div class="toolbar-divider" />

        <!-- Copy Selected Text -->
        <button
          class="toolbar-btn icon-only-btn"
          :title="gt('selectionToolbar.copy') || '复制'"
          @click="onCopy"
        >
          <Copy class="btn-icon" :size="13" />
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, toRef, type Ref } from 'vue'
import { Sparkles, SquarePen, Copy } from 'lucide-vue-next'
import { useSelectionToolbar } from '@/composables/useSelectionToolbar'
import { gt } from '@/composables/useLocale'

const props = defineProps<{
  containerRef?: HTMLElement | null
}>()

const containerElRef = toRef(props, 'containerRef') as Ref<HTMLElement | null>
const toolbarElRef = ref<HTMLElement | null>(null)

const {
  visible,
  position,
  placement,
  shortcutKey,
  handleAddToChat,
  handleEditSource,
  handleCopy,
} = useSelectionToolbar(containerElRef, toolbarElRef)

const toolbarStyle = computed(() => {
  return {
    top: `${position.value.top}px`,
    left: `${position.value.left}px`,
  }
})

function onAddToChat() {
  handleAddToChat()
}

function onEditSource() {
  handleEditSource()
}

function onCopy() {
  void handleCopy()
}
</script>

<style scoped>
.selection-toolbar {
  position: fixed;
  z-index: 9999;
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 4px;
  background: var(--vscode-editorWidget-background, rgba(30, 30, 30, 0.95));
  border: 1px solid var(--vscode-editorWidget-border, rgba(255, 255, 255, 0.12));
  border-radius: 16px;
  box-shadow: 0 4px 16px var(--vscode-widget-shadow, rgba(0, 0, 0, 0.32));
  backdrop-filter: blur(10px);
  user-select: none;
  pointer-events: auto;
  font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
}

.selection-toolbar.placement-top {
  transform: translate(-50%, -100%);
}

.selection-toolbar.placement-bottom {
  transform: translate(-50%, 0);
}

/* Animations */
.selection-toolbar-fade-enter-active,
.selection-toolbar-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.selection-toolbar-fade-enter-from,
.selection-toolbar-fade-leave-to {
  opacity: 0;
}

.selection-toolbar.placement-top.selection-toolbar-fade-enter-from,
.selection-toolbar.placement-top.selection-toolbar-fade-leave-to {
  transform: translate(-50%, -85%) scale(0.96);
}

.selection-toolbar.placement-bottom.selection-toolbar-fade-enter-from,
.selection-toolbar.placement-bottom.selection-toolbar-fade-leave-to {
  transform: translate(-50%, -15%) scale(0.96);
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 8px;
  background: transparent;
  border: none;
  border-radius: 12px;
  color: var(--vscode-foreground, #cccccc);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s ease, color 0.12s ease, transform 0.08s ease;
  outline: none;
}

.toolbar-btn:hover {
  background: var(--vscode-toolbar-hoverBackground, rgba(255, 255, 255, 0.08));
  color: var(--vscode-foreground, #ffffff);
}

.toolbar-btn:active {
  transform: scale(0.96);
}

.toolbar-btn.primary-btn {
  color: var(--vscode-foreground, #ffffff);
}

.toolbar-btn.primary-btn .btn-icon {
  color: var(--vscode-textLink-foreground, #3794ff);
}

.btn-icon {
  flex-shrink: 0;
  display: inline-block;
  vertical-align: middle;
}

.btn-label {
  line-height: 1;
}

.btn-kbd {
  font-family: inherit;
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--vscode-keybindingLabel-background, rgba(128, 128, 128, 0.18));
  border: 1px solid var(--vscode-keybindingLabel-border, rgba(128, 128, 128, 0.25));
  color: var(--vscode-descriptionForeground, #999999);
  line-height: 1.1;
  font-weight: 600;
  margin-left: 2px;
}

.toolbar-divider {
  width: 1px;
  height: 14px;
  margin: 0 2px;
  background: var(--vscode-editorWidget-border, rgba(255, 255, 255, 0.15));
  flex-shrink: 0;
}

.toolbar-btn.icon-only-btn {
  padding: 0 6px;
  border-radius: 12px;
}
</style>
