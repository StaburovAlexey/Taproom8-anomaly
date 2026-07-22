<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <figure class="cycle-progress-guide">
    <div class="cycle-progress-guide__image-frame">
      <img
        class="cycle-progress-guide__image"
        src="/img/level.png"
        :alt="t('about.progressImageAlt')"
        loading="lazy"
        decoding="async"
      />
    </div>
    <figcaption class="cycle-progress-guide__caption">
      {{ t('about.progressDescription') }}
    </figcaption>
  </figure>
</template>

<style scoped>
.cycle-progress-guide {
  display: grid;
  width: min(100%, 23rem);
  margin: 0.8rem auto 0;
  gap: 0.7rem;
}

.cycle-progress-guide__image-frame {
  overflow: hidden;
  aspect-ratio: 31 / 28;
  border: 1px solid var(--color-line);
  background: rgb(4 6 7 / 72%);
}

.cycle-progress-guide__image {
  display: block;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  object-fit: cover;
}

.cycle-progress-guide__caption {
  color: var(--color-muted);
  font-size: 0.78rem;
  line-height: 1.55;
  text-align: center;
}
</style>
