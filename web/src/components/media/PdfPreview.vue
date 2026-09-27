<template>
  <div class="pdf-preview-stub">
    <span>{{ file?.name || 'PDF' }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  file?: { path?: string; name?: string }
}>()
</script>
