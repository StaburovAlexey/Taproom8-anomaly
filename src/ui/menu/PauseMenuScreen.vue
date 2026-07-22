<script setup lang="ts">
import { shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'

import BrandMark from '@/ui/components/BrandMark.vue'
import DevAnomalySelector from '@/ui/components/DevAnomalySelector.vue'
import MenuButton from '@/ui/components/MenuButton.vue'
import ExitConfirmation from '@/ui/menu/ExitConfirmation.vue'
import type {
  DevAnomalyOption,
  DevNextAnomalySelection,
} from '@/shared/events'

defineProps<{
  devAnomalyOptions: readonly DevAnomalyOption[]
  devNextAnomalySelection: DevNextAnomalySelection
}>()

defineEmits<{
  resume: []
  settings: []
  abandon: []
  selectNextAnomaly: [selection: DevNextAnomalySelection]
}>()

const { t } = useI18n()
const confirmingExit = shallowRef(false)
const isDev = import.meta.env.DEV
</script>

<template>
  <section class="screen pause-menu">
    <ExitConfirmation
      v-if="confirmingExit"
      @confirm="$emit('abandon')"
      @cancel="confirmingExit = false"
    />
    <div v-else class="pause-menu__content">
      <BrandMark compact />
      <p class="pause-menu__objective">{{ t('game.objective') }}</p>
      <nav class="pause-menu__actions" aria-label="Pause menu">
        <MenuButton
          :label="t('menu.continue')"
          variant="primary"
          @press="$emit('resume')"
        />
        <MenuButton :label="t('menu.settings')" @press="$emit('settings')" />
        <MenuButton
          :label="t('menu.returnHome')"
          @press="confirmingExit = true"
        />
      </nav>
      <DevAnomalySelector
        v-if="isDev"
        :options="devAnomalyOptions"
        :selection="devNextAnomalySelection"
        @select="$emit('selectNextAnomaly', $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.pause-menu {
  padding: 1.5rem;
  background: rgb(8 11 13 / 76%);
}

.pause-menu__content {
  display: grid;
  justify-items: center;
  text-align: center;
}

.pause-menu__objective {
  margin: 1rem 0 2rem;
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pause-menu__actions {
  display: grid;
  width: min(100%, 24rem);
  gap: 0.75rem;
}

@media (orientation: landscape) and (max-height: 600px) {
  .pause-menu :deep(.brand__title) {
    font-size: clamp(2rem, 12vh, 3.5rem);
  }

  .pause-menu__objective {
    margin: 0.5rem 0 1rem;
    font-size: 0.55rem;
  }

  .pause-menu__actions {
    display: flex;
    width: min(92vw, 38rem);
    gap: 0.5rem;
  }

  .pause-menu__actions :deep(.menu-button) {
    min-height: 2.8rem;
  }
}
</style>
