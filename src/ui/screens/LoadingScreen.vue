<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import BrandMark from '@/ui/components/BrandMark.vue'

const props = defineProps<{
  progress: number
}>()

const { t } = useI18n()

const percentage = computed(() => Math.round(props.progress * 100))
const progressStyle = computed(() => ({ transform: `scaleX(${props.progress})` }))
</script>

<template>
  <section class="screen loading-screen" aria-live="polite">
    <div class="loading-screen__noise" aria-hidden="true"></div>
    <BrandMark compact />

    <div class="loading-screen__status">
      <div class="loading-screen__meta">
        <span>{{ t('loading.status') }}</span>
        <span>{{ percentage.toString().padStart(3, '0') }}%</span>
      </div>
      <div class="loading-screen__track" aria-hidden="true">
        <span class="loading-screen__progress" :style="progressStyle"></span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.loading-screen {
  gap: clamp(5rem, 15vh, 10rem);
}

.loading-screen__noise {
  position: absolute;
  inset: 0;
  opacity: 0.055;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.8'/%3E%3C/svg%3E");
}

.loading-screen__status {
  width: min(76vw, 30rem);
}

.loading-screen__meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 0.63rem;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.loading-screen__track {
  height: 1px;
  overflow: hidden;
  background: var(--color-line);
}

.loading-screen__progress {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--color-signal);
  box-shadow: 0 0 1.2rem var(--color-signal);
  transform-origin: left;
  transition: transform 180ms ease;
}
</style>
