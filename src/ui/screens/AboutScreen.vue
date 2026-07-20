<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import MenuButton from '@/ui/components/MenuButton.vue'

defineEmits<{
  back: []
}>()

const { t } = useI18n()
</script>

<template>
  <section class="screen about-screen">
    <article class="about-screen__panel">
      <p class="about-screen__eyebrow">BUILD / PROTOTYPE</p>
      <h2 class="about-screen__title">{{ t('about.title') }}</h2>
      <p class="about-screen__text">{{ t('about.text') }}</p>

      <div class="about-screen__controls">
        <h3 class="about-screen__subtitle">{{ t('about.controls') }}</h3>
        <p class="about-screen__item">{{ t('about.desktop') }}</p>
        <p class="about-screen__item">{{ t('about.mobile') }}</p>
      </div>

      <MenuButton :label="t('common.back')" @press="$emit('back')" />
    </article>
  </section>
</template>

<style scoped>
.about-screen {
  padding: 1.5rem;
}

.about-screen__panel {
  display: grid;
  width: min(100%, 38rem);
  gap: 1.5rem;
}

.about-screen__eyebrow,
.about-screen__subtitle {
  margin: 0;
  color: var(--color-signal);
  font-family: var(--font-mono);
  font-size: 0.63rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.about-screen__title {
  margin: -0.5rem 0 0;
  font-family: var(--font-display);
  font-size: clamp(3rem, 9vw, 6rem);
  font-weight: 300;
  letter-spacing: -0.05em;
  line-height: 1;
  text-transform: uppercase;
}

.about-screen__text {
  margin: 0;
  color: var(--color-muted);
  font-size: clamp(0.9rem, 2vw, 1.05rem);
  line-height: 1.8;
}

.about-screen__controls {
  display: grid;
  gap: 0.7rem;
  border-block: 1px solid var(--color-line);
  padding-block: 1.25rem;
}

.about-screen__item {
  margin: 0;
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 0.67rem;
  letter-spacing: 0.06em;
}
</style>
