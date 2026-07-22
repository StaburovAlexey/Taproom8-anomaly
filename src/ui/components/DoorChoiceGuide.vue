<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { publicAssetUrl } from '@/shared/assets/publicAssetUrl'

const { t } = useI18n()
const correctDoorImageUrl = publicAssetUrl('img/CorrectDoor.png')
const wrongDoorImageUrl = publicAssetUrl('img/WrongDoor.png')
</script>

<template>
  <div class="door-choice-guide">
    <figure class="door-choice-guide__item">
      <div class="door-choice-guide__image-frame">
        <img
          class="door-choice-guide__image"
          :src="correctDoorImageUrl"
          :alt="t('about.anomalyDoorAlt')"
          loading="lazy"
          decoding="async"
        />
      </div>
      <figcaption class="door-choice-guide__caption">
        {{ t('game.anomalyDoor') }}
      </figcaption>
    </figure>

    <figure class="door-choice-guide__item">
      <div class="door-choice-guide__image-frame">
        <img
          class="door-choice-guide__image"
          :src="wrongDoorImageUrl"
          :alt="t('about.noAnomalyDoorAlt')"
          loading="lazy"
          decoding="async"
        />
      </div>
      <figcaption class="door-choice-guide__caption">
        {{ t('game.clearDoor') }}
      </figcaption>
    </figure>
  </div>
</template>

<style scoped>
.door-choice-guide {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 0.8rem;
}

.door-choice-guide__item {
  display: grid;
  margin: 0;
  gap: 0.5rem;
}

.door-choice-guide__image-frame {
  overflow: hidden;
  aspect-ratio: 4 / 5;
  border: 1px solid var(--color-line);
  background: rgb(4 6 7 / 72%);
}

.door-choice-guide__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.door-choice-guide__caption {
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  line-height: 1.4;
  text-align: center;
  text-transform: uppercase;
}
</style>
