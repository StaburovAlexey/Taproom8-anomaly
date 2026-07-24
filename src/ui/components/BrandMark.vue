<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  compact?: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <header class="brand" :class="{ 'brand--compact': compact }">
    <h1 class="brand__title">
      <span>{{ t('brand.title') }}</span>
      <span class="brand__accent">{{ t('brand.accent') }}</span>
    </h1>
    <p v-if="!compact" class="brand__subtitle">{{ t('brand.subtitle') }}</p>
  </header>
</template>

<style scoped>
.brand {
  display: grid;
  justify-items: center;
  text-align: center;
}

.brand__title {
  display: flex;
  gap: 0.14em;
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(3.7rem, 10vw, 8rem);
  font-weight: 300;
  letter-spacing: -0.055em;
  line-height: 0.82;
  text-transform: uppercase;
  white-space: nowrap;
}

.brand__accent {
  color: var(--color-signal);
}

.brand__subtitle {
  max-width: 30rem;
  margin: 1.6rem 0 0;
  color: var(--color-muted);
  font-size: clamp(0.78rem, 2vw, 0.95rem);
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.brand--compact .brand__title {
  font-size: clamp(2.2rem, 6vw, 4rem);
}
</style>
