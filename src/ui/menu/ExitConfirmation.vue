<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import MenuButton from '@/ui/components/MenuButton.vue'

defineEmits<{
  confirm: []
  cancel: []
}>()

const { t } = useI18n()
</script>

<template>
  <section class="exit-confirmation" role="dialog" aria-modal="true">
    <div class="exit-confirmation__content">
      <h2 class="exit-confirmation__title">{{ t('menu.confirmTitle') }}</h2>
      <p class="exit-confirmation__text">{{ t('menu.confirmText') }}</p>
      <div class="exit-confirmation__actions">
        <MenuButton
          :label="t('menu.confirm')"
          variant="primary"
          @press="$emit('confirm')"
        />
        <MenuButton :label="t('menu.cancel')" @press="$emit('cancel')" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.exit-confirmation {
  display: grid;
  width: 100%;
  place-items: center;
}

.exit-confirmation__content {
  display: grid;
  width: min(88vw, 26rem);
  justify-items: center;
  text-align: center;
}

.exit-confirmation__title {
  margin: 0 0 0.75rem;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 400;
  text-transform: uppercase;
}

.exit-confirmation__text {
  margin: 0 0 1.25rem;
  color: var(--color-muted);
  font-size: 0.8rem;
}

.exit-confirmation__actions {
  display: grid;
  width: 100%;
  gap: 0.5rem;
}
</style>
