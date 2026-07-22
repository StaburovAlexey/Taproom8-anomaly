<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    variant?: 'primary' | 'ghost'
    disabled?: boolean
  }>(),
  {
    variant: 'ghost',
    disabled: false,
  },
)

defineEmits<{
  press: []
}>()
</script>

<template>
  <button
    class="menu-button"
    :class="`menu-button--${variant}`"
    type="button"
    :disabled="disabled"
    @click="$emit('press')"
  >
    <span class="menu-button__label">{{ label }}</span>
    <span class="menu-button__line" aria-hidden="true"></span>
  </button>
</template>

<style scoped>
.menu-button {
  position: relative;
  display: grid;
  width: min(100%, 24rem);
  margin-inline: auto;
  min-height: 3.5rem;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--color-line);
  border-radius: 0;
  background: rgb(10 15 17 / 58%);
  color: var(--color-text);
  cursor: pointer;
  font: inherit;
  isolation: isolate;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  transition:
    border-color 180ms ease,
    color 180ms ease,
    transform 180ms ease;
}

.menu-button::before {
  position: absolute;
  z-index: -1;
  inset: 0;
  background: var(--color-signal);
  content: '';
  transform: translateX(-101%);
  transition: transform 220ms ease;
}

.menu-button:hover:not(:disabled),
.menu-button:focus-visible:not(:disabled) {
  border-color: var(--color-signal);
  color: #07100f;
  outline: none;
  transform: translateY(-1px);
}

.menu-button:disabled {
  cursor: default;
  opacity: 0.58;
}

.menu-button:hover:not(:disabled)::before,
.menu-button:focus-visible:not(:disabled)::before {
  transform: translateX(0);
}

.menu-button--primary {
  border-color: rgb(155 231 217 / 70%);
  box-shadow: 0 0 3rem rgb(116 218 201 / 8%);
}

.menu-button__label {
  position: relative;
  z-index: 1;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 600;
}

.menu-button__line {
  position: absolute;
  right: 0.75rem;
  width: 1.5rem;
  height: 1px;
  background: currentColor;
  opacity: 0.4;
}
</style>
