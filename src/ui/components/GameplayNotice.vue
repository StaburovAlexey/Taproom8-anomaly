<script setup lang="ts">
defineProps<{
  visible: boolean
  message: string
}>()
</script>

<template>
  <Transition name="gameplay-notice">
    <div
      v-if="visible"
      class="gameplay-notice"
      role="status"
      aria-live="polite"
    >
      {{ message }}
    </div>
  </Transition>
</template>

<style scoped>
.gameplay-notice {
  position: absolute;
  z-index: 18;
  top: max(5rem, calc(env(safe-area-inset-top) + 3.5rem));
  left: 50%;
  width: min(calc(100% - 2rem), 34rem);
  padding: 0.9rem 1.2rem;
  border: 1px solid rgb(214 161 93 / 58%);
  background: rgb(8 11 13 / 88%);
  box-shadow: 0 0 2.5rem rgb(214 161 93 / 12%);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: clamp(0.68rem, 1.8vw, 0.82rem);
  letter-spacing: 0.06em;
  line-height: 1.5;
  text-align: center;
  transform: translateX(-50%);
  pointer-events: none;
}

.gameplay-notice-enter-active,
.gameplay-notice-leave-active {
  transition: opacity 240ms ease, transform 240ms ease;
}

.gameplay-notice-enter-from,
.gameplay-notice-leave-to {
  opacity: 0;
  transform: translate(-50%, -0.65rem);
}
</style>
