<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import MistakeChanceIndicator from '@/ui/boosts/MistakeChanceIndicator.vue'

const props = defineProps<{
  level: number
  totalLevels: number
  anomalyTargetObjectId: string | null
  interactionHint: string | null
  mistakeChances: number
  mistakeChanceCapacity: number
}>()

defineEmits<{
  menu: []
}>()

const { t } = useI18n()
const isDev = import.meta.env.DEV

const levelLabel = computed(
  () => `${props.level.toString().padStart(2, '0')} / ${props.totalLevels.toString().padStart(2, '0')}`,
)
const interactionLabel = computed(() =>
  props.interactionHint === null ? '' : t(props.interactionHint),
)
</script>

<template>
  <aside class="hud">
    <div class="hud__top">
      <div class="hud__status">
        <div v-if="isDev" class="hud__level">
          <strong class="hud__value">{{ levelLabel }}</strong>
          <span v-if="anomalyTargetObjectId" class="hud__anomaly">
            Объект аномалии: {{ anomalyTargetObjectId }}
          </span>
        </div>
        <MistakeChanceIndicator
          :chances="mistakeChances"
          :capacity="mistakeChanceCapacity"
        />
      </div>
      <button class="hud__menu" type="button" aria-label="Menu" @click="$emit('menu')">
        <span></span><span></span>
      </button>
    </div>

    <div class="hud__crosshair" aria-hidden="true">
      <span></span><span></span><span></span><span></span>
    </div>

    <div class="hud__bottom">
      <Transition name="hint">
        <p v-if="interactionHint" class="hud__hint">
          <span class="hud__key">E</span>
          {{ interactionLabel }}
        </p>
      </Transition>
    </div>

  </aside>
</template>

<style scoped>
.hud {
  position: absolute;
  z-index: 10;
  inset: 0;
  color: var(--color-text);
  pointer-events: none;
}

.hud__top {
  position: absolute;
  top: max(1.4rem, env(safe-area-inset-top));
  right: max(1.4rem, env(safe-area-inset-right));
  left: max(1.4rem, env(safe-area-inset-left));
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.hud__level {
  display: grid;
  gap: 0.3rem;
}

.hud__status {
  display: grid;
  gap: 0.65rem;
}

.hud__label {
  color: rgb(215 225 223 / 54%);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hud__value {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 500;
  letter-spacing: 0.14em;
}

.hud__anomaly {
  color: var(--color-signal);
  font-family: var(--font-mono);
  font-size: 0.65rem;
  letter-spacing: 0.06em;
}

.hud__menu {
  position: relative;
  z-index: 2;
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  place-content: center;
  gap: 0.42rem;
  border: 1px solid rgb(230 240 238 / 20%);
  background: rgb(5 8 9 / 34%);
  cursor: pointer;
  pointer-events: auto;
}

.hud__menu span {
  display: block;
  width: 1rem;
  height: 1px;
  background: var(--color-text);
}

.hud__crosshair {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1.4rem;
  height: 1.4rem;
  transform: translate(-50%, -50%);
}

.hud__crosshair span {
  position: absolute;
  background: rgb(238 245 243 / 72%);
}

.hud__crosshair span:nth-child(1),
.hud__crosshair span:nth-child(2) {
  top: 50%;
  width: 0.42rem;
  height: 1px;
}

.hud__crosshair span:nth-child(1) { left: 0; }
.hud__crosshair span:nth-child(2) { right: 0; }

.hud__crosshair span:nth-child(3),
.hud__crosshair span:nth-child(4) {
  left: 50%;
  width: 1px;
  height: 0.42rem;
}

.hud__crosshair span:nth-child(3) { top: 0; }
.hud__crosshair span:nth-child(4) { bottom: 0; }

.hud__bottom {
  position: absolute;
  right: 1.5rem;
  bottom: max(1.5rem, env(safe-area-inset-bottom));
  left: 1.5rem;
  display: grid;
  justify-items: center;
  gap: 0.8rem;
}

.hud__hint {
  display: flex;
  align-items: center;
  margin: 0;
  gap: 0.65rem;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hud__key {
  display: grid;
  width: 1.8rem;
  height: 1.8rem;
  place-items: center;
  border: 1px solid rgb(230 240 238 / 35%);
  color: var(--color-signal);
}

.hint-enter-active,
.hint-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.hint-enter-from,
.hint-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}

@media (pointer: coarse) {
  .hud__hint { display: none; }
  .hud__bottom { bottom: 9rem; }

  .hud__menu {
    width: 2.25rem;
    height: 2.25rem;
    gap: 0.32rem;
  }

  .hud__menu span {
    width: 0.8rem;
  }
}

@media (max-width: 900px) {
  .hud__hint { display: none; }
}
</style>
