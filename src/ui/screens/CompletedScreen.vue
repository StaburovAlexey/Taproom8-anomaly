<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import MenuButton from '@/ui/components/MenuButton.vue'

defineEmits<{
  restart: []
  menu: []
}>()

const { t } = useI18n()
</script>

<template>
  <section class="screen completed-screen">
    <div class="completed-screen__content">
      <p class="completed-screen__eyebrow">{{ t('completed.eyebrow') }}</p>
      <h2 class="completed-screen__title">{{ t('completed.title') }}</h2>
      <p class="completed-screen__text">{{ t('completed.text') }}</p>
      <div class="completed-screen__actions">
        <MenuButton :label="t('completed.again')" variant="primary" @press="$emit('restart')" />
        <MenuButton :label="t('completed.menu')" @press="$emit('menu')" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.completed-screen {
  background: radial-gradient(circle at 50% 45%, rgb(124 221 204 / 12%), transparent 42%);
}

.completed-screen__content {
  display: grid;
  width: min(84vw, 42rem);
  justify-items: center;
  text-align: center;
}

.completed-screen__eyebrow {
  margin: 0 0 1.5rem;
  color: var(--color-signal);
  font-family: var(--font-mono);
  font-size: 0.63rem;
  letter-spacing: 0.25em;
}

.completed-screen__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(3rem, 9vw, 6.8rem);
  font-weight: 300;
  letter-spacing: -0.055em;
  line-height: 0.95;
  text-transform: uppercase;
}

.completed-screen__text {
  margin: 1.5rem 0 3rem;
  color: var(--color-muted);
}

.completed-screen__actions {
  display: grid;
  width: min(100%, 24rem);
  gap: 0.75rem;
}
</style>
