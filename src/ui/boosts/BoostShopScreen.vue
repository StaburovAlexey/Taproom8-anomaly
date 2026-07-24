<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { faPersonRunning, faShieldHalved } from '@fortawesome/free-solid-svg-icons'

import type { YandexProduct } from '@/platform/yandex'
import MenuButton from '@/ui/components/MenuButton.vue'

import {
  BOOST_PRODUCT_IDS,
  type BoostProductId,
  type PaymentsStatus,
} from './boosts.store'
import BoostCard from './BoostCard.vue'

const props = defineProps<{
  catalog: readonly YandexProduct[]
  ownedProductIds: readonly BoostProductId[]
  paymentsStatus: PaymentsStatus
  purchasingProductId: BoostProductId | null
  purchaseFailed: boolean
}>()

defineEmits<{
  purchase: [productId: BoostProductId]
  retry: []
  back: []
}>()

const { t } = useI18n()
const productDefinitions = computed(() => [
  {
    id: BOOST_PRODUCT_IDS.extraChanceSlot,
    title: t('boosts.extraChance.title'),
    icon: faShieldHalved,
  },
  {
    id: BOOST_PRODUCT_IDS.speed,
    title: t('boosts.speed.title'),
    icon: faPersonRunning,
  },
])

function priceFor(productId: BoostProductId): string | null {
  return props.catalog.find((product) => product.id === productId)?.price ?? null
}
</script>

<template>
  <section class="screen boost-shop">
    <div class="boost-shop__panel">
      <header class="boost-shop__heading">
        <h2 class="boost-shop__title">{{ t('boosts.shopTitle') }}</h2>
      </header>

      <div class="boost-shop__grid">
        <BoostCard
          v-for="product in productDefinitions"
          :key="product.id"
          :title="product.title"
          :icon="product.icon"
          :price="priceFor(product.id)"
          :owned="ownedProductIds.includes(product.id)"
          :purchasing="purchasingProductId === product.id"
          :disabled="
            paymentsStatus !== 'ready'
              || purchasingProductId !== null
          "
          @purchase="$emit('purchase', product.id)"
        />
      </div>

      <p v-if="paymentsStatus === 'loading'" class="boost-shop__status">
        {{ t('boosts.loading') }}
      </p>
      <div
        v-else-if="paymentsStatus === 'error' || paymentsStatus === 'unavailable'"
        class="boost-shop__status-block"
      >
        <p class="boost-shop__status">{{ t('boosts.paymentsUnavailable') }}</p>
        <button class="boost-shop__retry" type="button" @click="$emit('retry')">
          {{ t('boosts.retry') }}
        </button>
      </div>
      <p v-else-if="purchaseFailed" class="boost-shop__status boost-shop__status--error">
        {{ t('boosts.purchaseFailed') }}
      </p>

      <MenuButton :label="t('common.back')" @press="$emit('back')" />
    </div>
  </section>
</template>

<style scoped>
.boost-shop {
  min-height: 0;
  overflow: hidden;
  padding:
    max(1.25rem, env(safe-area-inset-top))
    max(0.75rem, env(safe-area-inset-right))
    max(1.25rem, env(safe-area-inset-bottom))
    max(0.75rem, env(safe-area-inset-left));
  background:
    linear-gradient(90deg, transparent 49.9%, rgb(255 255 255 / 1.5%) 50%, transparent 50.1%),
    rgb(8 11 13 / 72%);
}

.boost-shop__panel {
  display: grid;
  width: min(100%, 42rem);
  max-height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  gap: 1rem;
}

.boost-shop__panel::-webkit-scrollbar {
  display: none;
}

.boost-shop__heading {
  display: grid;
  justify-items: center;
  text-align: center;
}

.boost-shop__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.8rem, 7vw, 4rem);
  font-weight: 300;
  text-transform: uppercase;
}

.boost-shop__status {
  margin: 0;
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 0.65rem;
  line-height: 1.5;
  letter-spacing: 0.06em;
  text-align: center;
}

.boost-shop__grid {
  display: grid;
  width: min(100%, 28rem);
  margin-inline: auto;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.boost-shop__status-block {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
}

.boost-shop__status--error {
  color: #d98272;
}

.boost-shop__retry {
  border: 0;
  background: transparent;
  color: var(--color-signal);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  text-decoration: underline;
  text-underline-offset: 0.25rem;
}

@media (max-width: 760px) {
  .boost-shop__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .boost-shop :deep(.boost-card) {
    min-height: 6.5rem;
    padding: 0.5rem 0.25rem;
  }
}

@media (orientation: landscape) and (max-height: 600px) {
  .boost-shop {
    padding:
      max(0.5rem, env(safe-area-inset-top))
      max(0.75rem, env(safe-area-inset-right))
      max(0.5rem, env(safe-area-inset-bottom))
      max(0.75rem, env(safe-area-inset-left));
  }

  .boost-shop__panel {
    gap: 0.6rem;
  }

  .boost-shop__title {
    font-size: 1.55rem;
  }

  .boost-shop__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .boost-shop :deep(.boost-card) {
    min-height: 4.75rem;
    padding: 0.45rem 0.2rem;
  }

  .boost-shop :deep(.menu-button) {
    min-height: 2.15rem;
  }

  .boost-shop :deep(.menu-button__label) {
    font-size: 0.56rem;
  }
}
</style>
