<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import DoorChoiceGuide from '@/ui/components/DoorChoiceGuide.vue'
import MenuButton from '@/ui/components/MenuButton.vue'

defineEmits<{
  back: []
}>()

const { t } = useI18n()
</script>

<template>
  <section class="screen about-screen">
    <article class="about-screen__panel">
      <h2 class="about-screen__title">{{ t('about.title') }}</h2>
      <p class="about-screen__text">{{ t('about.text') }}</p>

      <section class="about-screen__section">
        <h3 class="about-screen__subtitle">{{ t('about.objective') }}</h3>
        <ol class="about-screen__steps">
          <li>{{ t('about.observe') }}</li>
          <li>{{ t('about.compare') }}</li>
          <li>
            {{ t('about.choose') }}
            <DoorChoiceGuide />
          </li>
          <li>{{ t('about.complete') }}</li>
        </ol>
      </section>

      <section class="about-screen__section">
        <h3 class="about-screen__subtitle">{{ t('about.controls') }}</h3>
        <div class="about-screen__control-groups">
          <div class="about-screen__control-group">
            <h4 class="about-screen__device">{{ t('about.desktop') }}</h4>
            <dl class="about-screen__control-list">
              <div class="about-screen__control-row">
                <dt><kbd>WASD</kbd></dt>
                <dd>{{ t('about.move') }}</dd>
              </div>
              <div class="about-screen__control-row">
                <dt><kbd>{{ t('about.mouse') }}</kbd></dt>
                <dd>{{ t('about.look') }}</dd>
              </div>
              <div class="about-screen__control-row">
                <dt><kbd>Shift</kbd></dt>
                <dd>{{ t('about.run') }}</dd>
              </div>
              <div class="about-screen__control-row">
                <dt><kbd>E / {{ t('about.click') }}</kbd></dt>
                <dd>{{ t('about.interact') }}</dd>
              </div>
              <div class="about-screen__control-row">
                <dt><kbd>Esc</kbd></dt>
                <dd>{{ t('about.pause') }}</dd>
              </div>
            </dl>
          </div>

          <div class="about-screen__control-group">
            <h4 class="about-screen__device">{{ t('about.mobile') }}</h4>
            <dl class="about-screen__control-list">
              <div class="about-screen__control-row">
                <dt>{{ t('about.leftStick') }}</dt>
                <dd>{{ t('about.move') }}</dd>
              </div>
              <div class="about-screen__control-row">
                <dt>{{ t('about.rightStick') }}</dt>
                <dd>{{ t('about.look') }}</dd>
              </div>
              <div class="about-screen__control-row">
                <dt>{{ t('about.actionButton') }}</dt>
                <dd>{{ t('about.interact') }}</dd>
              </div>
              <div class="about-screen__control-row">
                <dt>{{ t('about.menuButton') }}</dt>
                <dd>{{ t('about.pause') }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <MenuButton :label="t('common.back')" @press="$emit('back')" />
    </article>
  </section>
</template>

<style scoped>
.about-screen {
  min-height: 0;
  overflow: hidden;
  padding: 1.5rem;
}

.about-screen__panel {
  display: grid;
  width: min(100%, 38rem);
  max-height: 100%;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  gap: 1.5rem;
}

.about-screen__panel::-webkit-scrollbar {
  display: none;
}

.about-screen__subtitle {
  margin: 0;
  color: var(--color-signal);
  font-family: var(--font-mono);
  font-size: 0.63rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.about-screen__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(3rem, 9vw, 6rem);
  font-weight: 300;
  letter-spacing: -0.05em;
  line-height: 1;
  text-transform: uppercase;
}

.about-screen__text {
  margin: 0;
  color: var(--color-muted);
  font-size: clamp(0.9rem, 2vw, 1.05rem);
  line-height: 1.8;
}

.about-screen__section {
  display: grid;
  gap: 0.7rem;
  border-block: 1px solid var(--color-line);
  padding-block: 1.25rem;
}

.about-screen__section + .about-screen__section {
  border-top: 0;
  padding-top: 0;
}

.about-screen__steps {
  display: grid;
  margin: 0;
  padding-left: 1.35rem;
  gap: 0.55rem;
  color: var(--color-muted);
  font-size: 0.82rem;
  line-height: 1.55;
}

.about-screen__control-groups {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem;
}

.about-screen__control-group,
.about-screen__control-list {
  display: grid;
  gap: 0.65rem;
  margin: 0;
}

.about-screen__device {
  margin: 0;
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 0.65rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.about-screen__control-row {
  display: grid;
  grid-template-columns: minmax(6.5rem, 0.8fr) minmax(0, 1fr);
  align-items: baseline;
  gap: 0.75rem;
}

.about-screen__control-row dt,
.about-screen__control-row dd {
  margin: 0;
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  line-height: 1.4;
}

.about-screen__control-row dt {
  color: var(--color-text);
}

.about-screen__control-row kbd {
  font: inherit;
}

@media (max-width: 36rem) {
  .about-screen__control-groups {
    grid-template-columns: 1fr;
  }
}
</style>
