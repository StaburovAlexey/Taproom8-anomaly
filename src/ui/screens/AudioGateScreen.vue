<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import BrandMark from '@/ui/components/BrandMark.vue'
import MenuButton from '@/ui/components/MenuButton.vue'

defineEmits<{
  play: []
}>()

const { t } = useI18n()
</script>

<template>
  <section class="screen audio-gate-screen">
    <BrandMark />
    <div class="audio-gate-screen__action">
      <MenuButton :label="t('audioGate.play')" variant="primary" @press="$emit('play')" />
    </div>
  </section>
</template>

<style scoped>
.audio-gate-screen {
  gap: clamp(4rem, 12vh, 8rem);
  background:
    radial-gradient(circle at 50% 35%, rgb(112 177 166 / 10%), transparent 30%),
    linear-gradient(180deg, rgb(8 11 13 / 82%), rgb(8 11 13 / 88%));
}

.audio-gate-screen__action {
  display: grid;
  width: min(76vw, 24rem);
  justify-items: center;
  gap: 1rem;
}

</style>
