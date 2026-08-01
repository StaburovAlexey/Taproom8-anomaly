import { onScopeDispose, watch } from 'vue'

import { AnalyticsManager } from '@/shared/analytics/AnalyticsManager'
import type { GraphicsQuality, Language } from '@/shared/config/settings'
import {
  gameEventBus,
  type DevNextAnomalySelection,
  type Vector2Value,
} from '@/shared/events'
import { setI18nLanguage } from '@/shared/i18n'
import { useSettingsStore } from '@/ui/stores/settings'
import {
  yandexFullscreenAdvertising,
  yandexRewardedAdvertising,
  type FullscreenAdvertising,
  type RewardedAdvertising,
} from '@/platform/yandex'

import { LoadingProgressAggregator } from './LoadingProgressAggregator'
import { useUiFlowStore } from './uiFlow.store'
import { useBoostsStore, type BoostProductId } from '@/ui/boosts/boosts.store'
import type { CinematicTransitionIntent } from './uiFlow.types'
import {
  showHomeInterstitial,
  type HomeInterstitialPlacement,
} from './showHomeInterstitial'

const PROTECTION_NOTICE_DURATION_MS = 3_000

export interface UiFlowControllerOptions {
  readonly advertising?: FullscreenAdvertising
  readonly rewardedAdvertising?: RewardedAdvertising
}

export function useUiFlowController(options: UiFlowControllerOptions = {}) {
  const flow = useUiFlowStore()
  const boosts = useBoostsStore()
  const settings = useSettingsStore()
  const advertising = options.advertising ?? yandexFullscreenAdvertising
  const rewardedAdvertising = options.rewardedAdvertising
    ?? yandexRewardedAdvertising
  const cleanups: Array<() => void> = []
  const loadingProgress = new LoadingProgressAggregator()
  let engineReady = false
  let audioReady = false
  let loadingFinished = false
  let readyReported = false
  let homeInterstitialRunning = false
  let pendingNoticeKey: string | null = null
  let protectionNoticeTimer: number | null = null
  let disposed = false

  function finishLoadingWhenReady(): void {
    if (!engineReady || !audioReady || loadingFinished) {
      return
    }
    loadingFinished = true
    flow.showAudioGate()
  }

  function handleScreenEntered(): void {
    if (flow.screen !== 'audioGate' || readyReported) {
      return
    }
    readyReported = true
    gameEventBus.emit('platform:ready', undefined)
  }

  watch(
    () => settings.language,
    (language) => {
      setI18nLanguage(language)
    },
    { immediate: true },
  )

  cleanups.push(
    gameEventBus.on('loading:progress', ({ progress, stage }) => {
      if (stage === 'model' || stage === 'texture' || stage === 'audio') {
        flow.setLoadingProgress(loadingProgress.update(stage, progress))
      }
    }),
    gameEventBus.on('engine:ready', () => {
      engineReady = true
      loadingProgress.complete('model')
      flow.setLoadingProgress(loadingProgress.complete('texture'))
      finishLoadingWhenReady()
    }),
    gameEventBus.on('audio:preload-completed', () => {
      audioReady = true
      flow.setLoadingProgress(loadingProgress.complete('audio'))
      finishLoadingWhenReady()
    }),
    gameEventBus.on('engine:error', ({ recoverable }) => {
      if (!recoverable) {
        flow.failEngine()
      }
    }),
    gameEventBus.on('interaction:hint', ({ visible, messageKey }) => {
      flow.setInteractionHint(visible ? (messageKey ?? 'game.interact') : null)
    }),
    gameEventBus.on('player:pointer-lock', ({ locked }) => {
      flow.setPointerLocked(locked)
      if (
        locked
        && flow.screen === 'gameplay'
        && !flow.transitionRunning
      ) {
        setGameplayInput(true)
        return
      }
      if (
        !locked
        && flow.screen === 'gameplay'
        && flow.hasActiveSession
        && !flow.transitionRunning
      ) {
        openPause()
      }
    }),
    gameEventBus.on('round:started', ({ level, anomalyTargetObjectId }) => {
      flow.setLevel(level)
      flow.setAnomalyTargetObjectId(anomalyTargetObjectId)
      if (
        flow.transitionPhase === 'covered'
        && (
          flow.transitionIntent === 'start-session'
          || flow.transitionIntent === 'advance-round'
        )
      ) {
        flow.revealTransition()
      }
    }),
    gameEventBus.on(
      'round:resolved',
      ({
        completed,
        mistakeProtected,
        remainingMistakeChances,
      }) => {
        boosts.setActiveMistakeChances(remainingMistakeChances)
        pendingNoticeKey = mistakeProtected
          ? 'game.mistakeProtected'
          : null
        if (!flow.beginTransition(completed ? 'show-completed' : 'advance-round')) {
          return
        }
        flow.setInteractionHint(null)
        setGameplayInput(false)
      },
    ),
  )
  if (import.meta.env.DEV) {
    cleanups.push(
      gameEventBus.on('dev:anomaly-options-changed', ({ options }) => {
        flow.setDevAnomalyOptions(options)
      }),
      gameEventBus.on('dev:next-anomaly-consumed', () => {
        flow.setDevNextAnomalySelection({ kind: 'random' })
      }),
    )
  }

  function setGameplayInput(enabled: boolean): void {
    if (!enabled) {
      hideProtectionNotice()
    }
    gameEventBus.emit('gameplay:input-changed', { enabled })
    gameEventBus.emit('gameplay:activity-changed', { active: enabled })
    if (enabled) {
      showPendingProtectionNotice()
    }
  }

  function hideProtectionNotice(): void {
    if (protectionNoticeTimer !== null) {
      window.clearTimeout(protectionNoticeTimer)
      protectionNoticeTimer = null
    }
    flow.setProtectionNotice(false)
  }

  function showPendingProtectionNotice(): void {
    if (pendingNoticeKey === null || flow.screen !== 'gameplay') {
      return
    }
    const messageKey = pendingNoticeKey
    pendingNoticeKey = null
    hideProtectionNotice()
    flow.setProtectionNotice(true, messageKey)
    protectionNoticeTimer = window.setTimeout(() => {
      protectionNoticeTimer = null
      flow.setProtectionNotice(false)
    }, PROTECTION_NOTICE_DURATION_MS)
  }

  function unlockAudio(): void {
    gameEventBus.emit('ui:unlock-audio', undefined)
    flow.showHome()
    AnalyticsManager.event('audio_unlocked')
  }

  function handleMenuClick(event: MouseEvent): void {
    if (flow.screen === 'gameplay') {
      return
    }
    const target = event.target
    if (!(target instanceof Element)) {
      return
    }
    const button = target.closest('button')
    if (button === null || button.disabled) {
      return
    }
    gameEventBus.emit('ui:button-pressed', undefined)
  }

  function startSession(): void {
    if (!flow.beginTransition('start-session')) {
      return
    }
    pendingNoticeKey = null
    setGameplayInput(false)
    gameEventBus.emit('game:run-requested', undefined)
  }

  async function showRewardedProtectionAd(): Promise<void> {
    if (flow.screen !== 'preparation' || !boosts.beginRewardedAd()) {
      return
    }
    let rewardGranted = false
    try {
      const result = await rewardedAdvertising.show({
        onRewarded: () => {
          rewardGranted = true
          if (!disposed) {
            boosts.finishRewardedAd(true)
          }
        },
      })
      if (disposed) {
        return
      }
      if (!rewardGranted) {
        boosts.finishRewardedAd(false)
      }
      if (result.status === 'error') {
        gameEventBus.emit('engine:error', {
          error: result.error,
          context: 'Showing rewarded advertising for mistake protection.',
          recoverable: true,
        })
      }
    } catch (cause: unknown) {
      if (disposed) {
        return
      }
      boosts.finishRewardedAd(false)
      gameEventBus.emit('engine:error', {
        error: cause instanceof Error
          ? cause
          : new Error('Showing rewarded advertising.', { cause }),
        context: 'Showing rewarded advertising for mistake protection.',
        recoverable: true,
      })
    }
  }

  function resumeGameplay(): void {
    setGameplayInput(false)
    flow.showGameplay()
    gameEventBus.emit('game:run-requested', undefined)
    if (!window.matchMedia('(pointer: fine)').matches) {
      setGameplayInput(true)
    }
  }

  function openPause(): void {
    if (flow.screen !== 'gameplay' || !flow.hasActiveSession) {
      return
    }
    setGameplayInput(false)
    flow.showPause()
    gameEventBus.emit('game:pause-requested', undefined)
  }

  async function returnHomeWithInterstitial(
    placement: HomeInterstitialPlacement,
  ): Promise<void> {
    if (homeInterstitialRunning || flow.transitionRunning) {
      return
    }
    homeInterstitialRunning = true
    pendingNoticeKey = null
    const interstitialRequest = showHomeInterstitial(advertising, placement)
    setGameplayInput(false)
    try {
      await interstitialRequest
    } finally {
      homeInterstitialRunning = false
    }
    if (disposed) {
      return
    }
    flow.beginTransition('abandon-session')
  }

  function requestAbandonSession(): void {
    void returnHomeWithInterstitial('pause-menu')
  }

  function returnHomeFromCompleted(): void {
    void returnHomeWithInterstitial('completed-menu')
  }

  function handleTransitionCovered(): void {
    if (flow.transitionPhase !== 'covering') {
      return
    }
    flow.markTransitionCovered()
    continueCoveredTransition(flow.transitionIntent)
  }

  function continueCoveredTransition(
    intent: CinematicTransitionIntent | null,
  ): void {
    switch (intent) {
      case 'start-session':
        flow.showGameplay()
        gameEventBus.emit('session:start-requested', boosts.activateRun())
        return
      case 'advance-round':
        gameEventBus.emit('round:advance-requested', undefined)
        return
      case 'abandon-session':
        gameEventBus.emit('session:abandon-requested', undefined)
        gameEventBus.emit('game:pause-requested', undefined)
        flow.showHome()
        boosts.endRun()
        flow.revealTransition()
        return
      case 'show-completed':
        gameEventBus.emit('game:pause-requested', undefined)
        flow.showCompleted()
        flow.revealTransition()
        return
      case null:
        flow.revealTransition()
    }
  }

  function handleTransitionRevealed(): void {
    flow.finishTransition()
    if (flow.screen === 'gameplay') {
      if (
        window.matchMedia('(pointer: fine)').matches
        && !flow.pointerLocked
      ) {
        openPause()
        return
      }
      setGameplayInput(true)
    }
  }

  function updateLanguage(language: Language): void {
    settings.setLanguage(language)
  }

  function openPreparation(): void {
    if (flow.screen === 'completed') {
      boosts.endRun()
    }
    flow.showPreparation()
  }

  function openBoostShop(): void {
    if (flow.screen !== 'home' && flow.screen !== 'preparation') {
      return
    }
    flow.showBoostShop(flow.screen)
  }

  function purchaseBoost(productId: BoostProductId): void {
    void boosts.purchaseBoost(productId)
  }

  function retryPayments(): void {
    void boosts.initialize()
  }

  function updateSpeedBoost(enabled: boolean): void {
    boosts.setSpeedBoostEnabled(enabled)
  }

  function updateGraphics(graphics: GraphicsQuality): void {
    settings.setGraphics(graphics)
    gameEventBus.emit('ui:graphics-changed', { quality: graphics })
  }

  function updateBrightness(brightness: number): void {
    settings.setBrightness(brightness)
    gameEventBus.emit('ui:brightness-changed', { brightness: settings.brightness })
  }

  function updateVolume(master: number): void {
    settings.setVolume({ master })
    gameEventBus.emit('ui:volume-changed', { master })
  }

  function updateMobileMovement(axis: Vector2Value): void {
    gameEventBus.emit('ui:mobile-move', axis)
  }

  function updateMobileLook(axis: Vector2Value): void {
    gameEventBus.emit('ui:mobile-look', axis)
  }

  function updateMobileSprint(sprinting: boolean): void {
    gameEventBus.emit('ui:mobile-sprint', sprinting)
  }

  function interactOnMobile(): void {
    gameEventBus.emit('ui:mobile-interact', undefined)
  }

  function selectNextAnomaly(selection: DevNextAnomalySelection): void {
    if (!import.meta.env.DEV) {
      return
    }
    flow.setDevNextAnomalySelection(selection)
    gameEventBus.emit('dev:next-anomaly-selected', selection)
  }

  function retryApplication(): void {
    window.location.reload()
  }

  onScopeDispose(() => {
    disposed = true
    pendingNoticeKey = null
    hideProtectionNotice()
    cleanups.forEach((cleanup) => cleanup())
  })

  return {
    unlockAudio,
    handleMenuClick,
    handleScreenEntered,
    startSession,
    openPreparation,
    openBoostShop,
    purchaseBoost,
    retryPayments,
    updateSpeedBoost,
    showRewardedProtectionAd,
    resumeGameplay,
    openPause,
    requestAbandonSession,
    returnHomeFromCompleted,
    handleTransitionCovered,
    handleTransitionRevealed,
    updateLanguage,
    updateGraphics,
    updateBrightness,
    updateVolume,
    updateMobileMovement,
    updateMobileLook,
    updateMobileSprint,
    interactOnMobile,
    selectNextAnomaly,
    retryApplication,
  }
}
