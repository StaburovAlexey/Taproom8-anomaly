<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'

import { Game } from '@/engine/core/Game'
import type { GraphicsQuality } from '@/shared/config/settings'
import { gameEventBus } from '@/shared/events'

const props = defineProps<{
  graphics: GraphicsQuality
  brightness: number
}>()

const container = useTemplateRef<HTMLElement>('container')
const game = shallowRef<Game | null>(null)

onMounted(() => {
  if (container.value === null) {
    return
  }

  try {
    const instance = new Game(container.value, {
      eventBus: gameEventBus,
      graphicsQuality: props.graphics,
      brightness: props.brightness,
      fallbackToProcedural: false,
    })
    game.value = instance
    void instance.initialize().catch(() => undefined)
  } catch (error: unknown) {
    gameEventBus.emit('engine:error', {
      error: error instanceof Error ? error : new Error(String(error)),
      context: 'Creating the WebGL renderer.',
      recoverable: false,
    })
  }
})

onBeforeUnmount(() => {
  game.value?.dispose()
  game.value = null
})
</script>

<template>
  <div ref="container" class="viewport" aria-hidden="true"></div>
</template>

<style scoped>
.viewport {
  position: absolute;
  z-index: 0;
  inset: 0;
  overflow: hidden;
  background: #0b1012;
}

.viewport :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
  outline: none;
}
</style>
