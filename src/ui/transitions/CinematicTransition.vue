<script setup lang="ts">
defineProps<{
  visible: boolean
}>()

defineEmits<{
  covered: []
  revealed: []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition
      name="cinematic"
      @after-enter="$emit('covered')"
      @after-leave="$emit('revealed')"
    >
      <div v-if="visible" class="cinematic-transition" aria-hidden="true"></div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cinematic-transition {
  position: fixed;
  z-index: 1000;
  inset: 0;
  background: #020304;
  pointer-events: auto;
}

.cinematic-enter-active {
  transition: opacity 760ms cubic-bezier(0.65, 0, 0.35, 1);
}

.cinematic-leave-active {
  transition: opacity 760ms cubic-bezier(0.65, 0, 0.35, 1) 180ms;
}

.cinematic-enter-from,
.cinematic-leave-to {
  opacity: 0;
}
</style>
