<script setup lang="ts">
import { useI18n } from "vue-i18n";

import {
  MAX_BRIGHTNESS,
  MIN_BRIGHTNESS,
  type GraphicsQuality,
  type Language,
} from "@/shared/config/settings";
import MenuButton from "@/ui/components/MenuButton.vue";

defineProps<{
  language: Language;
  graphics: GraphicsQuality;
  brightness: number;
  fullscreen: boolean;
  fullscreenAvailable: boolean;
  volume: number;
}>();

defineEmits<{
  "update:language": [language: Language];
  "update:graphics": [graphics: GraphicsQuality];
  "update:brightness": [brightness: number];
  toggleFullscreen: [];
  "update:volume": [volume: number];
  back: [];
}>();

const { t } = useI18n();
</script>

<template>
  <section class="screen settings-screen">
    <div class="settings-screen__panel">
      <div class="settings-screen__heading">
        <h2 class="settings-screen__title">{{ t("settings.title") }}</h2>
      </div>

      <div class="settings-screen__group">
        <label class="settings-screen__label" for="brightness">{{
          t("settings.brightness")
        }}</label>
        <div class="settings-screen__range-row">
          <input
            id="brightness"
            class="settings-screen__range"
            type="range"
            :min="MIN_BRIGHTNESS"
            :max="MAX_BRIGHTNESS"
            step="0.05"
            :value="brightness"
            @input="
              $emit(
                'update:brightness',
                Number(($event.target as HTMLInputElement).value),
              )
            "
          />
          <span>{{ Math.round(brightness * 100) }}%</span>
        </div>
      </div>

      <div class="settings-screen__group">
        <label class="settings-screen__label" for="master-volume">{{
          t("settings.volume")
        }}</label>
        <div class="settings-screen__range-row">
          <input
            id="master-volume"
            class="settings-screen__range"
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="volume"
            @input="
              $emit(
                'update:volume',
                Number(($event.target as HTMLInputElement).value),
              )
            "
          />
          <span>{{ Math.round(volume * 100) }}%</span>
        </div>
      </div>

      <div class="settings-screen__group">
        <span class="settings-screen__label">{{ t("settings.language") }}</span>
        <div class="settings-screen__options">
          <button
            class="settings-screen__option"
            :class="{ 'settings-screen__option--active': language === 'ru' }"
            type="button"
            @click="$emit('update:language', 'ru')"
          >
            {{ t("settings.russian") }}
          </button>
          <button
            class="settings-screen__option"
            :class="{ 'settings-screen__option--active': language === 'en' }"
            type="button"
            @click="$emit('update:language', 'en')"
          >
            {{ t("settings.english") }}
          </button>
        </div>
      </div>

      <div class="settings-screen__group">
        <span class="settings-screen__label">{{
          t("settings.fullscreen")
        }}</span>
        <div class="settings-screen__options settings-screen__options--single">
          <button
            class="settings-screen__option"
            :class="{ 'settings-screen__option--active': fullscreen }"
            type="button"
            :disabled="!fullscreenAvailable"
            @click="$emit('toggleFullscreen')"
          >
            {{ fullscreen ? t("common.enabled") : t("common.disabled") }}
          </button>
        </div>
      </div>

      <div class="settings-screen__group">
        <span class="settings-screen__label">{{ t("settings.graphics") }}</span>
        <div class="settings-screen__options settings-screen__options--stacked">
          <button
            class="settings-screen__option"
            :class="{
              'settings-screen__option--active': graphics === 'normal',
            }"
            type="button"
            @click="$emit('update:graphics', 'normal')"
          >
            {{ t("settings.normal") }}
          </button>
          <button
            class="settings-screen__option"
            :class="{
              'settings-screen__option--active': graphics === 'potato',
            }"
            type="button"
            @click="$emit('update:graphics', 'potato')"
          >
            {{ t("settings.potato") }}
          </button>
        </div>
      </div>

      <MenuButton :label="t('common.back')" @press="$emit('back')" />
    </div>
  </section>
</template>

<style scoped>
.settings-screen {
  min-height: 0;
  overflow: hidden;
  padding: max(3rem, env(safe-area-inset-top)) 1.25rem;
  background:
    linear-gradient(90deg, transparent 49.9%, rgb(255 255 255 / 1.5%) 50%, transparent 50.1%),
    rgb(8 11 13 / 72%);
}

.settings-screen__panel {
  display: grid;
  max-width: 100%;
  max-height: 100%;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  gap: 2rem;
}

.settings-screen__panel::-webkit-scrollbar {
  display: none;
}

.settings-screen__heading {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  border-bottom: 1px solid var(--color-line);
  padding-bottom: 1rem;
}

.settings-screen__index,
.settings-screen__label {
  color: var(--color-signal);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.17em;
  text-transform: uppercase;
}

.settings-screen__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2.2rem, 7vw, 4rem);
  font-weight: 300;
  letter-spacing: -0.04em;
  text-transform: uppercase;
}

.settings-screen__group {
  display: grid;
  gap: 0.9rem;
}

.settings-screen__options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.settings-screen__options--single {
  grid-template-columns: 1fr;
}

.settings-screen__option {
  min-height: 3rem;
  border: 1px solid var(--color-line);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.settings-screen__option:hover,
.settings-screen__option:focus-visible,
.settings-screen__option--active {
  border-color: var(--color-signal);
  color: var(--color-text);
  outline: none;
}

.settings-screen__option:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.settings-screen__option--active {
  background: rgb(135 222 207 / 9%);
}

.settings-screen__range-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 0.66rem;
}

.settings-screen__range {
  flex: 1;
  accent-color: var(--color-signal);
}

@media (orientation: landscape) and (max-height: 600px) {
  .settings-screen {
    padding:
      max(0.5rem, env(safe-area-inset-top))
      max(0.75rem, env(safe-area-inset-right))
      max(0.5rem, env(safe-area-inset-bottom))
      max(0.75rem, env(safe-area-inset-left));
  }

  .settings-screen__panel {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem;
  }

  .settings-screen__heading,
  .settings-screen__panel > :deep(.menu-button) {
    grid-column: 1 / -1;
  }

  .settings-screen__heading {
    padding-bottom: 0.45rem;
  }

  .settings-screen__title {
    font-size: 1.55rem;
  }

  .settings-screen__group {
    gap: 0.35rem;
  }

  .settings-screen__label {
    font-size: 0.54rem;
  }

  .settings-screen__option {
    min-height: 2.1rem;
    padding: 0.3rem 0.4rem;
    font-size: 0.52rem;
    letter-spacing: 0.06em;
  }

  .settings-screen__options--stacked {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .settings-screen__range-row {
    gap: 0.5rem;
    font-size: 0.54rem;
  }

  .settings-screen__panel > :deep(.menu-button) {
    min-height: 2.15rem;
  }

  .settings-screen__panel > :deep(.menu-button__label) {
    font-size: 0.56rem;
  }
}

@media (max-width: 32rem) and (orientation: portrait) {
  .settings-screen__options--stacked {
    grid-template-columns: 1fr;
  }
}
</style>
