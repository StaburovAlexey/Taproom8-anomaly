<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import MenuButton from '@/ui/components/MenuButton.vue'

defineEmits<{
  retry: []
}>()

const { t } = useI18n()
</script>

<template>
  <section class="screen error-screen" role="alert">
    <div class="error-screen__content">
      <p class="error-screen__code">WEBGL / ERROR</p>
      <h2 class="error-screen__title">{{ t('errors.engine') }}</h2>
      <MenuButton :label="t('errors.retry')" variant="primary" @press="$emit('retry')" />
    </div>
  </section>
</template>

<style scoped>
.error-screen {
  padding: 1.5rem;
}

.error-screen__content {
  display: grid;
  width: min(100%, 34rem);
  justify-items: center;
  gap: 2rem;
  text-align: center;
}

.error-screen__code {
  margin: 0;
  color: #e39a87;
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.2em;
}

.error-screen__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2rem, 7vw, 4.5rem);
  font-weight: 300;
  line-height: 1.05;
  text-transform: uppercase;
}
</style>
