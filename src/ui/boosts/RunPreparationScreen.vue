<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faShieldHalved } from '@fortawesome/free-solid-svg-icons'

import MenuButton from '@/ui/components/MenuButton.vue'

const props = defineProps<{
  mistakeChances: number
  mistakeChanceCapacity: number
  rewardAdLoading: boolean
  canWatchRewardedAd: boolean
  ownsSpeedBoost: boolean
  speedBoostEnabled: boolean
}>()

defineEmits<{
  start: []
  reward: []
  shop: []
  back: []
  updateSpeed: [enabled: boolean]
}>()

const { t } = useI18n()
const rewardLabel = computed(() => {
  if (props.rewardAdLoading) {
    return t('boosts.rewardLoading')
  }
  if (props.mistakeChances >= props.mistakeChanceCapacity) {
    return t('boosts.chancesFull')
  }
  return t('boosts.watchReward')
})
</script>

<template>
  <section class="screen run-preparation">
    <div class="run-preparation__panel">
      <header class="run-preparation__heading">
        <h2 class="run-preparation__title">{{ t('boosts.preparationTitle') }}</h2>
        <p class="run-preparation__subtitle">{{ t('boosts.preparationDescription') }}</p>
      </header>

      <section class="run-preparation__section">
        <div class="run-preparation__section-heading">
          <h3 class="run-preparation__label">{{ t('boosts.mistakeChances') }}</h3>
          <strong class="run-preparation__count">
            {{ mistakeChances }} / {{ mistakeChanceCapacity }}
          </strong>
        </div>
        <div class="run-preparation__slots" aria-hidden="true">
          <FontAwesomeIcon
            v-for="slot in mistakeChanceCapacity"
            :key="slot"
            class="run-preparation__slot"
            :class="{ 'run-preparation__slot--filled': slot <= mistakeChances }"
            :icon="faShieldHalved"
          />
        </div>
        <MenuButton
          :label="rewardLabel"
          :disabled="!canWatchRewardedAd"
          @press="$emit('reward')"
        />
      </section>

      <section class="run-preparation__section">
        <h3 class="run-preparation__label">{{ t('boosts.activeBoosts') }}</h3>
        <button
          class="run-preparation__toggle"
          type="button"
          :disabled="!ownsSpeedBoost"
          @click="$emit('updateSpeed', !speedBoostEnabled)"
        >
          <span>
            {{ t('boosts.speed.title') }}
            <small v-if="!ownsSpeedBoost">{{ t('boosts.purchaseRequired') }}</small>
          </span>
          <strong>{{ speedBoostEnabled && ownsSpeedBoost ? t('common.enabled') : t('common.disabled') }}</strong>
        </button>
      </section>

      <div class="run-preparation__actions">
        <MenuButton
          :label="t('boosts.startRun')"
          variant="primary"
          :disabled="rewardAdLoading"
          @press="$emit('start')"
        />
        <MenuButton
          :label="t('boosts.openShop')"
          :disabled="rewardAdLoading"
          @press="$emit('shop')"
        />
        <MenuButton
          :label="t('common.back')"
          :disabled="rewardAdLoading"
          @press="$emit('back')"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.run-preparation {
  min-height: 0;
  overflow: hidden;
  padding:
    max(1rem, env(safe-area-inset-top))
    max(1rem, env(safe-area-inset-right))
    max(1rem, env(safe-area-inset-bottom))
    max(1rem, env(safe-area-inset-left));
  background:
    linear-gradient(90deg, transparent 49.9%, rgb(255 255 255 / 1.5%) 50%, transparent 50.1%),
    rgb(8 11 13 / 72%);
}

.run-preparation__panel {
  display: grid;
  width: min(100%, 34rem);
  max-height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  gap: 1.25rem;
}

.run-preparation__panel::-webkit-scrollbar {
  display: none;
}

.run-preparation__heading {
  display: grid;
  justify-items: center;
  gap: 0.4rem;
  text-align: center;
}

.run-preparation__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2rem, 7vw, 3.5rem);
  font-weight: 300;
  text-transform: uppercase;
}

.run-preparation__subtitle {
  margin: 0;
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 0.65rem;
  line-height: 1.5;
}

.run-preparation__section {
  display: grid;
  gap: 0.75rem;
  border: 1px solid var(--color-line);
  padding: 1rem;
  background: rgb(10 15 17 / 58%);
}

.run-preparation__section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.run-preparation__label,
.run-preparation__count {
  margin: 0;
  color: var(--color-signal);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.run-preparation__slots {
  display: flex;
  justify-content: center;
  gap: 0.65rem;
}

.run-preparation__slot {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--color-faint);
  opacity: 0.45;
}

.run-preparation__slot--filled {
  color: var(--color-signal);
  opacity: 1;
}

.run-preparation__toggle {
  display: flex;
  min-height: 3.5rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid var(--color-line);
  padding: 0.75rem 1rem;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
}

.run-preparation__toggle span {
  display: grid;
  gap: 0.3rem;
  font-family: var(--font-mono);
  font-size: 0.68rem;
}

.run-preparation__toggle small {
  color: var(--color-muted);
  font-size: 0.55rem;
}

.run-preparation__toggle strong {
  color: var(--color-signal);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  text-transform: uppercase;
}

.run-preparation__toggle:disabled {
  cursor: default;
  opacity: 0.5;
}

.run-preparation__actions {
  display: grid;
  gap: 0.6rem;
}

@media (orientation: landscape) and (max-height: 600px) {
  .run-preparation {
    padding:
      max(0.5rem, env(safe-area-inset-top))
      max(0.75rem, env(safe-area-inset-right))
      max(0.5rem, env(safe-area-inset-bottom))
      max(0.75rem, env(safe-area-inset-left));
  }

  .run-preparation__panel {
    width: min(94vw, 58rem);
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.6rem;
  }

  .run-preparation__heading,
  .run-preparation__actions {
    grid-column: 1 / -1;
  }

  .run-preparation__title {
    font-size: 1.6rem;
  }

  .run-preparation__heading {
    gap: 0.15rem;
  }

  .run-preparation__subtitle {
    font-size: 0.55rem;
  }

  .run-preparation__section {
    gap: 0.45rem;
    padding: 0.6rem;
  }

  .run-preparation__toggle {
    min-height: 2.5rem;
    gap: 0.5rem;
    padding: 0.45rem 0.6rem;
  }

  .run-preparation__toggle span {
    gap: 0.15rem;
    font-size: 0.58rem;
  }

  .run-preparation__toggle small {
    font-size: 0.48rem;
  }

  .run-preparation__toggle strong {
    font-size: 0.52rem;
  }

  .run-preparation__actions {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.35rem;
  }

  .run-preparation__actions :deep(.menu-button) {
    min-height: 2.15rem;
  }

  .run-preparation__actions :deep(.menu-button__label) {
    font-size: 0.56rem;
  }
}

@media (orientation: landscape) and (max-width: 540px) {
  .run-preparation__panel {
    width: 96vw;
  }
}
</style>
