<script setup lang="ts">
import { onBeforeUnmount, reactive } from 'vue'

export interface ControlAxis {
  x: number
  y: number
}

defineProps<{
  canInteract: boolean
  interactLabel: string
}>()

interface StickState {
  pointerId: number | null
  x: number
  y: number
}

const emit = defineEmits<{
  move: [axis: ControlAxis]
  look: [axis: ControlAxis]
  interact: []
}>()

const movement = reactive<StickState>({ pointerId: null, x: 0, y: 0 })
const look = reactive<StickState>({ pointerId: null, x: 0, y: 0 })
const radius = 42

function emitAxis(eventName: 'move' | 'look', axis: ControlAxis): void {
  if (eventName === 'move') {
    emit('move', axis)
  } else {
    emit('look', axis)
  }
}

function updateStick(
  event: PointerEvent,
  state: StickState,
  eventName: 'move' | 'look',
): void {
  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) {
    return
  }

  const rect = target.getBoundingClientRect()
  const rawX = event.clientX - (rect.left + rect.width / 2)
  const rawY = event.clientY - (rect.top + rect.height / 2)
  const distance = Math.hypot(rawX, rawY)
  const scale = distance > radius ? radius / distance : 1

  state.x = rawX * scale
  state.y = rawY * scale
  emitAxis(eventName, {
    x: state.x / radius,
    y: eventName === 'move' ? -state.y / radius : state.y / radius,
  })
}

function startStick(
  event: PointerEvent,
  state: StickState,
  eventName: 'move' | 'look',
): void {
  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) {
    return
  }

  state.pointerId = event.pointerId
  target.setPointerCapture(event.pointerId)
  updateStick(event, state, eventName)
}

function moveStick(
  event: PointerEvent,
  state: StickState,
  eventName: 'move' | 'look',
): void {
  if (state.pointerId !== event.pointerId) {
    return
  }

  updateStick(event, state, eventName)
}

function stopStick(state: StickState, eventName: 'move' | 'look'): void {
  state.pointerId = null
  state.x = 0
  state.y = 0
  emitAxis(eventName, { x: 0, y: 0 })
}

onBeforeUnmount(() => {
  stopStick(movement, 'move')
  stopStick(look, 'look')
})
</script>

<template>
  <div class="mobile-controls" aria-label="Mobile game controls">
    <div
      class="mobile-controls__zone"
      role="application"
      aria-label="Movement joystick"
      @pointerdown="startStick($event, movement, 'move')"
      @pointermove="moveStick($event, movement, 'move')"
      @pointerup="stopStick(movement, 'move')"
      @pointercancel="stopStick(movement, 'move')"
    >
      <span
        class="mobile-controls__thumb"
        :style="{ transform: `translate(${movement.x}px, ${movement.y}px)` }"
      ></span>
    </div>

    <button
      v-if="canInteract"
      class="mobile-controls__interact"
      type="button"
      @click="$emit('interact')"
    >
      {{ interactLabel }}
    </button>

    <div
      class="mobile-controls__zone"
      role="application"
      aria-label="Camera joystick"
      @pointerdown="startStick($event, look, 'look')"
      @pointermove="moveStick($event, look, 'look')"
      @pointerup="stopStick(look, 'look')"
      @pointercancel="stopStick(look, 'look')"
    >
      <span
        class="mobile-controls__thumb mobile-controls__thumb--look"
        :style="{ transform: `translate(${look.x}px, ${look.y}px)` }"
      ></span>
    </div>
  </div>
</template>

<style scoped>
.mobile-controls {
  position: absolute;
  z-index: 20;
  right: max(1.25rem, env(safe-area-inset-right));
  bottom: max(1.4rem, env(safe-area-inset-bottom));
  left: max(1.25rem, env(safe-area-inset-left));
  display: none;
  justify-content: space-between;
  pointer-events: none;
}

.mobile-controls__zone {
  position: relative;
  display: grid;
  width: 7rem;
  height: 7rem;
  place-items: center;
  border: 1px solid rgb(221 238 234 / 17%);
  border-radius: 50%;
  background: rgb(4 8 9 / 18%);
  pointer-events: auto;
  touch-action: none;
}

.mobile-controls__interact {
  align-self: end;
  min-width: 4.25rem;
  min-height: 2.8rem;
  margin-bottom: 0.3rem;
  border: 1px solid rgb(157 227 214 / 56%);
  background: rgb(6 12 13 / 68%);
  color: var(--color-signal);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.08em;
  pointer-events: auto;
  text-transform: uppercase;
}

.mobile-controls__zone::before,
.mobile-controls__zone::after {
  position: absolute;
  background: rgb(222 238 235 / 12%);
  content: '';
}

.mobile-controls__zone::before { width: 70%; height: 1px; }
.mobile-controls__zone::after { width: 1px; height: 70%; }

.mobile-controls__thumb {
  position: relative;
  z-index: 1;
  width: 2.65rem;
  height: 2.65rem;
  border: 1px solid rgb(157 227 214 / 56%);
  border-radius: 50%;
  background: rgb(103 190 175 / 15%);
  box-shadow: 0 0 1.5rem rgb(105 211 192 / 8%);
}

.mobile-controls__thumb--look {
  width: 2.25rem;
  height: 2.25rem;
  border-style: dashed;
}

@media (pointer: coarse), (max-width: 56rem) and (hover: none) {
  .mobile-controls { display: flex; }
}
</style>
