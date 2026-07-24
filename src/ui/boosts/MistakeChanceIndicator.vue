<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faShieldHalved } from '@fortawesome/free-solid-svg-icons'

defineProps<{
  chances: number
  capacity: number
}>()

const { t } = useI18n()
</script>

<template>
  <div class="chance-indicator">
    <span class="chance-indicator__shields" aria-hidden="true">
      <FontAwesomeIcon
        v-for="slot in capacity"
        :key="slot"
        class="chance-indicator__shield"
        :class="{ 'chance-indicator__shield--bright': slot <= chances }"
        :icon="faShieldHalved"
      />
    </span>
    <span>{{ t('boosts.chancesHud') }}</span>
  </div>
</template>

<style scoped>
.chance-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  
  white-space: nowrap;
  text-transform: uppercase;
}

.chance-indicator__shields {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.chance-indicator__shield {
  width: 0.9rem;
  height: 0.9rem;
  color: var(--color-faint);
  opacity: 0.3;
}

.chance-indicator__shield--bright {
  color: var(--color-signal);
  opacity: 1;
}

@media (pointer: coarse), (max-width: 700px) {
  .chance-indicator {
    font-size: 0.52rem;
  }

  .chance-indicator__shield {
    width: 0.8rem;
    height: 0.8rem;
  }
}
</style>
