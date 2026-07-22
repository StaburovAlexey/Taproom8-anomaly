<script setup lang="ts">
import { computed } from 'vue'

import type {
  DevAnomalyOption,
  DevNextAnomalySelection,
} from '@/shared/events'

const props = defineProps<{
  options: readonly DevAnomalyOption[]
  selection: DevNextAnomalySelection
}>()

const emit = defineEmits<{
  select: [selection: DevNextAnomalySelection]
}>()

const RANDOM_VALUE = '__random__'
const NONE_VALUE = '__none__'

const selectedValue = computed(() => {
  if (props.selection.kind === 'anomaly') {
    return props.selection.anomalyId
  }
  return props.selection.kind === 'none' ? NONE_VALUE : RANDOM_VALUE
})

const groupedOptions = computed(() => ({
  Easy: props.options.filter((option) => option.difficulty === 'Easy'),
  Medium: props.options.filter((option) => option.difficulty === 'Medium'),
  Hard: props.options.filter((option) => option.difficulty === 'Hard'),
}))

function select(event: Event): void {
  const value = (event.target as HTMLSelectElement).value
  if (value === RANDOM_VALUE) {
    emit('select', { kind: 'random' })
    return
  }
  if (value === NONE_VALUE) {
    emit('select', { kind: 'none' })
    return
  }
  emit('select', { kind: 'anomaly', anomalyId: value })
}
</script>

<template>
  <label class="dev-anomaly">
    <span class="dev-anomaly__label">Следующая аномалия</span>
    <select
      class="dev-anomaly__select"
      :value="selectedValue"
      @change="select"
    >
      <option :value="RANDOM_VALUE">Случайная</option>
      <option :value="NONE_VALUE">Без аномалии</option>
      <optgroup
        v-for="(items, difficulty) in groupedOptions"
        :key="difficulty"
        :label="difficulty"
      >
        <option
          v-for="option in items"
          :key="option.id"
          :value="option.id"
        >
          {{ option.targetObjectId }} — {{ option.id }}
        </option>
      </optgroup>
    </select>
  </label>
</template>

<style scoped>
.dev-anomaly {
  position: absolute;
  bottom: max(1.25rem, env(safe-area-inset-bottom));
  left: max(1.25rem, env(safe-area-inset-left));
  display: grid;
  width: min(28rem, calc(100vw - 2.5rem));
  gap: 0.4rem;
  text-align: left;
}

.dev-anomaly__label {
  color: var(--color-signal);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.dev-anomaly__select {
  width: 100%;
  min-height: 2.5rem;
  border: 1px solid var(--color-line);
  border-radius: 0;
  background: rgb(8 11 13 / 92%);
  color: var(--color-text);
  padding: 0.55rem 0.7rem;
  font-family: var(--font-mono);
  font-size: 0.65rem;
}

.dev-anomaly__select:focus-visible {
  border-color: var(--color-signal);
  outline: none;
}

@media (orientation: landscape) and (max-height: 600px) {
  .dev-anomaly {
    bottom: 0.75rem;
    left: 0.75rem;
    width: min(20rem, 34vw);
  }
}
</style>
