<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import BrandMark from '@/ui/components/BrandMark.vue'
import MenuButton from '@/ui/components/MenuButton.vue'
import type { RewardProtectionStatus } from '@/ui/flow/uiFlow.types'

const props = defineProps<{
  rewardProtectionStatus: RewardProtectionStatus
}>()

defineEmits<{
  start: []
  reward: []
  settings: []
  about: []
}>()

const { t } = useI18n()
const rewardLabel = computed(() => {
  switch (props.rewardProtectionStatus) {
    case 'loading':
      return t('menu.rewardLoading')
    case 'granted':
      return t('menu.rewardGranted')
    case 'available':
      return t('menu.rewardAd')
  }
})
const rewardLoading = computed(() =>
  props.rewardProtectionStatus === 'loading',
)
</script>

<template>
  <section class="screen home-menu">
    <BrandMark />
    <nav class="home-menu__actions" aria-label="Main menu">
      <MenuButton
        :label="t('menu.start')"
        variant="primary"
        :disabled="rewardLoading"
        @press="$emit('start')"
      />
      <MenuButton
        :label="rewardLabel"
        :disabled="rewardProtectionStatus !== 'available'"
        @press="$emit('reward')"
      />
      <MenuButton
        :label="t('menu.settings')"
        :disabled="rewardLoading"
        @press="$emit('settings')"
      />
      <MenuButton
        :label="t('menu.about')"
        :disabled="rewardLoading"
        @press="$emit('about')"
      />
    </nav>
  </section>
</template>

<style scoped>
.home-menu {
  gap: clamp(3rem, 8vh, 6rem);
  background:
    linear-gradient(180deg, rgb(8 11 13 / 84%), rgb(8 11 13 / 84%)),
    transparent;
}

.home-menu__actions {
  display: grid;
  width: min(80vw, 24rem);
  gap: 0.75rem;
}

@media (orientation: landscape) and (max-height: 600px) {
  .home-menu {
    gap: 1rem;
    padding: 1rem max(1.25rem, env(safe-area-inset-left));
  }

  .home-menu :deep(.brand__title) {
    font-size: clamp(2.4rem, 12vh, 4.5rem);
  }

  .home-menu :deep(.brand__subtitle) {
    display: none;
  }

  .home-menu__actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: min(92vw, 38rem);
    gap: 0.5rem;
  }

  .home-menu__actions :deep(.menu-button) {
    min-height: 2.8rem;
  }
}
</style>
