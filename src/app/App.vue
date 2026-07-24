<script setup lang="ts">
import { storeToRefs } from 'pinia'

import GameViewport from '@/ui/components/GameViewport.vue'
import { useMobileZoomLock } from '@/ui/composables/useMobileZoomLock'
import GameUiRoot from '@/ui/shell/GameUiRoot.vue'
import { useSettingsStore } from '@/ui/stores/settings'

const settingsStore = useSettingsStore()
const { brightness, graphics } = storeToRefs(settingsStore)

useMobileZoomLock()
</script>

<template>
  <main class="app-shell">
    <GameViewport :graphics="graphics" :brightness="brightness" />
    <GameUiRoot />
  </main>
</template>

<style scoped>
.app-shell {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--color-bg);
}

.app-shell::after {
  position: absolute;
  z-index: 25;
  inset: 0;
  background: repeating-linear-gradient(
    180deg,
    transparent 0,
    transparent 3px,
    rgb(0 0 0 / 2.5%) 4px
  );
  content: '';
  pointer-events: none;
}

</style>
