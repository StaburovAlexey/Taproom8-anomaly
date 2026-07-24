<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useFullscreen } from '@/ui/composables/useFullscreen'
import CompletedScreen from '@/ui/screens/CompletedScreen.vue'
import AboutScreen from '@/ui/screens/AboutScreen.vue'
import AudioGateScreen from '@/ui/screens/AudioGateScreen.vue'
import EngineErrorScreen from '@/ui/screens/EngineErrorScreen.vue'
import LoadingScreen from '@/ui/screens/LoadingScreen.vue'
import SettingsScreen from '@/ui/screens/SettingsScreen.vue'
import { useSettingsStore } from '@/ui/stores/settings'
import CinematicTransition from '@/ui/transitions/CinematicTransition.vue'
import HomeMenuScreen from '@/ui/menu/HomeMenuScreen.vue'
import PauseMenuScreen from '@/ui/menu/PauseMenuScreen.vue'
import GameplayOverlay from '@/ui/shell/GameplayOverlay.vue'
import BoostShopScreen from '@/ui/boosts/BoostShopScreen.vue'
import RunPreparationScreen from '@/ui/boosts/RunPreparationScreen.vue'
import { useBoostsStore } from '@/ui/boosts/boosts.store'
import { useUiFlowController } from '@/ui/flow/useUiFlowController'
import { useUiFlowStore } from '@/ui/flow/uiFlow.store'

const flow = useUiFlowStore()
const settings = useSettingsStore()
const boosts = useBoostsStore()
const controller = useUiFlowController()
const {
  screen,
  loadingProgress,
  currentLevel,
  totalLevels,
  anomalyTargetObjectId,
  devAnomalyOptions,
  devNextAnomalySelection,
  interactionHint,
  protectionNoticeVisible,
  protectionNoticeKey,
  transitionVisible,
} = storeToRefs(flow)
const {
  paymentsStatus,
  catalog,
  ownedProductIds,
  purchasingProductId,
  purchaseFailed,
  rewardAdLoading,
  preparationMistakeChances,
  speedBoostEnabled,
  activeMistakeChances,
  activeMistakeChanceCapacity,
  activeSpeedMultiplier,
  mistakeChanceCapacity,
  canWatchRewardedAd,
  ownsSpeedBoost,
} = storeToRefs(boosts)
const { brightness, language, graphics, volume } = storeToRefs(settings)
const { isFullscreen, isSupported, toggle: toggleFullscreen } = useFullscreen()
</script>

<template>
  <div class="game-ui-root" @click.capture="controller.handleMenuClick">
    <GameplayOverlay
      v-if="screen === 'gameplay'"
      :level="currentLevel"
      :total-levels="totalLevels"
      :anomaly-target-object-id="anomalyTargetObjectId"
      :interaction-hint="interactionHint"
      :protection-notice-visible="protectionNoticeVisible"
      :protection-notice-key="protectionNoticeKey"
      :mistake-chances="activeMistakeChances"
      :mistake-chance-capacity="activeMistakeChanceCapacity"
      @menu="controller.openPause"
      @move="controller.updateMobileMovement"
      @look="controller.updateMobileLook"
      @sprint="controller.updateMobileSprint"
      @interact="controller.interactOnMobile"
    />

    <Transition
      name="screen-fade"
      mode="out-in"
      @after-enter="controller.handleScreenEntered"
    >
      <LoadingScreen
        v-if="screen === 'loading'"
        key="loading"
        :progress="loadingProgress"
      />
      <AudioGateScreen
        v-else-if="screen === 'audioGate'"
        key="audio-gate"
        @play="controller.unlockAudio"
      />
      <HomeMenuScreen
        v-else-if="screen === 'home'"
        key="home"
        @start="controller.openPreparation"
        @shop="controller.openBoostShop"
        @settings="flow.openSettings()"
        @about="flow.showAbout()"
      />
      <RunPreparationScreen
        v-else-if="screen === 'preparation'"
        key="preparation"
        :mistake-chances="preparationMistakeChances"
        :mistake-chance-capacity="mistakeChanceCapacity"
        :reward-ad-loading="rewardAdLoading"
        :can-watch-rewarded-ad="canWatchRewardedAd"
        :owns-speed-boost="ownsSpeedBoost"
        :speed-boost-enabled="speedBoostEnabled"
        @start="controller.startSession"
        @reward="controller.showRewardedProtectionAd"
        @shop="controller.openBoostShop"
        @back="flow.showHome()"
        @update-speed="controller.updateSpeedBoost"
      />
      <BoostShopScreen
        v-else-if="screen === 'boostShop'"
        key="boost-shop"
        :catalog="catalog"
        :owned-product-ids="ownedProductIds"
        :payments-status="paymentsStatus"
        :purchasing-product-id="purchasingProductId"
        :purchase-failed="purchaseFailed"
        @purchase="controller.purchaseBoost"
        @retry="controller.retryPayments"
        @back="flow.closeBoostShop()"
      />
      <PauseMenuScreen
        v-else-if="screen === 'pause'"
        key="pause"
        :dev-anomaly-options="devAnomalyOptions"
        :dev-next-anomaly-selection="devNextAnomalySelection"
        :mistake-chances="activeMistakeChances"
        :mistake-chance-capacity="activeMistakeChanceCapacity"
        :speed-multiplier="activeSpeedMultiplier"
        @resume="controller.resumeGameplay"
        @settings="flow.openSettings()"
        @abandon="controller.requestAbandonSession"
        @select-next-anomaly="controller.selectNextAnomaly"
      />
      <SettingsScreen
        v-else-if="screen === 'settings'"
        key="settings"
        :language="language"
        :graphics="graphics"
        :brightness="brightness"
        :fullscreen="isFullscreen"
        :fullscreen-available="isSupported"
        :volume="volume.master"
        @update:language="controller.updateLanguage"
        @update:graphics="controller.updateGraphics"
        @update:brightness="controller.updateBrightness"
        @toggle-fullscreen="toggleFullscreen"
        @update:volume="controller.updateVolume"
        @back="flow.closeSettings()"
      />
      <AboutScreen
        v-else-if="screen === 'about'"
        key="about"
        @back="flow.closeAbout()"
      />
      <CompletedScreen
        v-else-if="screen === 'completed'"
        key="completed"
        @restart="controller.openPreparation"
        @menu="controller.returnHomeFromCompleted"
      />
      <EngineErrorScreen
        v-else-if="screen === 'error'"
        key="error"
        @retry="controller.retryApplication"
      />
    </Transition>

    <CinematicTransition
      :visible="transitionVisible"
      @covered="controller.handleTransitionCovered"
      @revealed="controller.handleTransitionRevealed"
    />
  </div>
</template>

<style scoped>
.screen-fade-enter-active,
.screen-fade-leave-active {
  transition: opacity 260ms ease;
}

.screen-fade-enter-from,
.screen-fade-leave-to {
  opacity: 0;
}
</style>
