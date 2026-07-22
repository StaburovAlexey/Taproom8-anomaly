import { onScopeDispose, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { AnalyticsManager } from '@/shared/analytics/AnalyticsManager'
import type { GraphicsQuality, Language } from '@/shared/config/settings'
import {
  gameEventBus,
  type DevNextAnomalySelection,
  type Vector2Value,
} from '@/shared/events'
import { useSettingsStore } from '@/ui/stores/settings'
import {
  yandexFullscreenAdvertising,
  type FullscreenAdvertising,
} from '@/platform/yandex'

import { FullscreenAdSchedule } from './FullscreenAdSchedule'
import { LoadingProgressAggregator } from './LoadingProgressAggregator'
import { useUiFlowStore } from './uiFlow.store'
import type { CinematicTransitionIntent } from './uiFlow.types'

export interface UiFlowControllerOptions {
  readonly advertising?: FullscreenAdvertising
}

export function useUiFlowController(options: UiFlowControllerOptions = {}) {
  const flow = useUiFlowStore()
  const settings = useSettingsStore()
  const advertising = options.advertising ?? yandexFullscreenAdvertising
  const adSchedule = new FullscreenAdSchedule()
  const { locale } = useI18n({ useScope: 'global' })
  const cleanups: Array<() => void> = []
  const loadingProgress = new LoadingProgressAggregator()
  let engineReady = false
  let audioReady = false
  let loadingFinished = false
  let readyReported = false
  let coveredTransitionRunning = false
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
      locale.value = language
      document.documentElement.lang = language
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
    gameEventBus.on('round:resolved', ({ completed, correct }) => {
      adSchedule.recordRound(flow.currentLevel, correct)
      if (!flow.beginTransition(completed ? 'show-completed' : 'advance-round')) {
        return
      }
      flow.setInteractionHint(null)
      setGameplayInput(false)
    }),
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
    gameEventBus.emit('gameplay:input-changed', { enabled })
    gameEventBus.emit('gameplay:activity-changed', { active: enabled })
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
    adSchedule.reset()
    setGameplayInput(false)
    gameEventBus.emit('game:run-requested', undefined)
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

  function requestAbandonSession(): void {
    if (!flow.beginTransition('abandon-session')) {
      return
    }
    setGameplayInput(false)
  }

  function returnHomeFromCompleted(): void {
    if (!flow.beginTransition('abandon-session')) {
      return
    }
    adSchedule.recordCompletedMenu()
    setGameplayInput(false)
  }

  function handleTransitionCovered(): void {
    if (coveredTransitionRunning || flow.transitionPhase !== 'covering') {
      return
    }
    flow.markTransitionCovered()
    const intent = flow.transitionIntent
    const placement = adSchedule.take(intent)
    if (placement === null) {
      continueCoveredTransition(intent)
      return
    }

    coveredTransitionRunning = true
    void advertising.show({
      resumeGameAfterClose: intent === 'advance-round',
    }).catch((cause: unknown) => {
      gameEventBus.emit('engine:error', {
        error: cause instanceof Error
          ? cause
          : new Error('Showing fullscreen advertising.', { cause }),
        context: `Showing fullscreen advertising at ${placement}.`,
        recoverable: true,
      })
    }).finally(() => {
      coveredTransitionRunning = false
      if (
        !disposed
        && flow.transitionPhase === 'covered'
        && flow.transitionIntent === intent
      ) {
        continueCoveredTransition(intent)
      }
    })
  }

  function continueCoveredTransition(
    intent: CinematicTransitionIntent | null,
  ): void {
    switch (intent) {
      case 'start-session':
        flow.showGameplay()
        gameEventBus.emit('session:start-requested', undefined)
        return
      case 'advance-round':
        gameEventBus.emit('round:advance-requested', undefined)
        return
      case 'abandon-session':
        gameEventBus.emit('session:abandon-requested', undefined)
        gameEventBus.emit('game:pause-requested', undefined)
        flow.showHome()
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
    cleanups.forEach((cleanup) => cleanup())
  })

  return {
    unlockAudio,
    handleMenuClick,
    handleScreenEntered,
    startSession,
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
    interactOnMobile,
    selectNextAnomaly,
    retryApplication,
  }
}
