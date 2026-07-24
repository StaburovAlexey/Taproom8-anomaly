<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'

const props = defineProps<{
  title: string
  icon: IconDefinition
  price: string | null
  owned: boolean
  purchasing: boolean
  disabled: boolean
}>()

defineEmits<{
  purchase: []
}>()

const { t } = useI18n()
const statusLabel = computed(() => {
  if (props.owned) {
    return t('boosts.owned')
  }
  if (props.purchasing) {
    return t('boosts.purchasing')
  }
  if (props.price === null) {
    return t('boosts.unavailable')
  }
  return props.price
})
</script>

<template>
  <button
    class="boost-card"
    :class="{ 'boost-card--owned': owned }"
    type="button"
    :disabled="disabled || price === null || owned || purchasing"
    :aria-label="title"
    @click="$emit('purchase')"
  >
    <FontAwesomeIcon
      class="boost-card__icon"
      :icon="icon"
      aria-hidden="true"
    />
    <span class="boost-card__title">{{ title }}</span>
    <span class="boost-card__status">{{ statusLabel }}</span>
  </button>
</template>

<style scoped>
.boost-card {
  display: grid;
  width: 100%;
  min-width: 0;
  min-height: 7.5rem;
  align-content: center;
  justify-items: center;
  gap: 0.55rem;
  overflow: hidden;
  border: 1px solid var(--color-line);
  padding: 0.75rem;
  background: rgb(10 15 17 / 68%);
  color: var(--color-text);
  cursor: pointer;
  font: inherit;
  transition: border-color 180ms ease, background 180ms ease, transform 180ms ease;
}

.boost-card:hover:not(:disabled),
.boost-card:focus-visible:not(:disabled) {
  border-color: var(--color-signal);
  background: rgb(214 161 93 / 12%);
  outline: none;
  transform: translateY(-2px);
}

.boost-card--owned {
  border-color: rgb(214 161 93 / 58%);
}

.boost-card:disabled {
  cursor: default;
  opacity: 0.62;
}

.boost-card__icon {
  width: 1.8rem;
  height: 1.8rem;
  color: var(--color-signal);
}

.boost-card__title {
  max-width: 100%;
  overflow-wrap: anywhere;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  line-height: 1.25;
  letter-spacing: 0.06em;
  text-align: center;
  text-transform: uppercase;
}

.boost-card__status {
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 0.56rem;
  letter-spacing: 0.06em;
}

@media (orientation: landscape) and (max-height: 600px) {
  .boost-card {
    min-height: 5.5rem;
    gap: 0.35rem;
    padding: 0.45rem 0.2rem;
  }

  .boost-card__icon {
    width: 1.35rem;
    height: 1.35rem;
  }
}

@media (max-width: 760px) {
  .boost-card__icon {
    width: 1.35rem;
    height: 1.35rem;
  }

  .boost-card__title {
    font-size: 0.5rem;
    line-height: 1.2;
    letter-spacing: 0.03em;
  }

  .boost-card__status {
    font-size: 0.5rem;
  }
}
</style>
