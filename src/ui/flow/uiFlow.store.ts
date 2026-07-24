import { defineStore } from 'pinia'
import type {
  DevAnomalyOption,
  DevNextAnomalySelection,
} from '@/shared/events'
import { FINAL_GAME_LEVEL } from '@/shared/config/gameplay'

import type {
  CinematicTransitionIntent,
  CinematicTransitionPhase,
  BoostShopReturnScreen,
  MenuScreen,
  SessionUiState,
  UiScreen,
} from './uiFlow.types'

interface UiFlowState {
  screen: UiScreen
  settingsReturnTo: MenuScreen
  boostShopReturnTo: BoostShopReturnScreen
  session: SessionUiState
  loadingProgress: number
  currentLevel: number
  totalLevels: number
  anomalyTargetObjectId: string | null
  devAnomalyOptions: DevAnomalyOption[]
  devNextAnomalySelection: DevNextAnomalySelection
  interactionHint: string | null
  protectionNoticeVisible: boolean
  protectionNoticeKey: string | null
  pointerLocked: boolean
  transitionPhase: CinematicTransitionPhase
  transitionIntent: CinematicTransitionIntent | null
}

export const useUiFlowStore = defineStore('ui-flow', {
  state: (): UiFlowState => ({
    screen: 'loading',
    settingsReturnTo: 'home',
    boostShopReturnTo: 'home',
    session: 'none',
    loadingProgress: 0,
    currentLevel: 0,
    totalLevels: FINAL_GAME_LEVEL,
    anomalyTargetObjectId: null,
    devAnomalyOptions: [],
    devNextAnomalySelection: { kind: 'random' },
    interactionHint: null,
    protectionNoticeVisible: false,
    protectionNoticeKey: null,
    pointerLocked: false,
    transitionPhase: 'idle',
    transitionIntent: null,
  }),
  getters: {
    hasActiveSession: (state): boolean => state.session === 'active',
    transitionVisible: (state): boolean =>
      state.transitionPhase === 'covering'
      || state.transitionPhase === 'covered',
    transitionRunning: (state): boolean => state.transitionPhase !== 'idle',
    gameplayInputEnabled: (state): boolean =>
      state.screen === 'gameplay' && state.transitionPhase === 'idle',
  },
  actions: {
    setLoadingProgress(progress: number): void {
      this.loadingProgress = Math.min(1, Math.max(0, progress))
    },
    showAudioGate(): void {
      this.loadingProgress = 1
      this.screen = 'audioGate'
    },
    showHome(): void {
      this.screen = 'home'
      this.session = 'none'
      this.anomalyTargetObjectId = null
      this.interactionHint = null
      this.protectionNoticeVisible = false
      this.protectionNoticeKey = null
      this.pointerLocked = false
    },
    showGameplay(): void {
      this.screen = 'gameplay'
      this.session = 'active'
    },
    showPreparation(): void {
      this.screen = 'preparation'
      this.pointerLocked = false
    },
    showBoostShop(returnTo: BoostShopReturnScreen): void {
      this.boostShopReturnTo = returnTo
      this.screen = 'boostShop'
    },
    closeBoostShop(): void {
      this.screen = this.boostShopReturnTo
    },
    showPause(): void {
      this.screen = 'pause'
      this.interactionHint = null
      this.protectionNoticeVisible = false
      this.protectionNoticeKey = null
      this.pointerLocked = false
    },
    openSettings(): void {
      this.settingsReturnTo = this.screen === 'pause' ? 'pause' : 'home'
      this.screen = 'settings'
    },
    closeSettings(): void {
      this.screen = this.settingsReturnTo
    },
    showAbout(): void {
      this.screen = 'about'
    },
    closeAbout(): void {
      this.screen = 'home'
    },
    showCompleted(): void {
      this.screen = 'completed'
      this.session = 'completed'
      this.pointerLocked = false
      this.interactionHint = null
    },
    failEngine(): void {
      this.screen = 'error'
    },
    setLevel(level: number): void {
      this.currentLevel = Math.min(this.totalLevels, Math.max(0, level))
    },
    setAnomalyTargetObjectId(targetObjectId: string | null): void {
      this.anomalyTargetObjectId = targetObjectId
    },
    setDevAnomalyOptions(options: readonly DevAnomalyOption[]): void {
      this.devAnomalyOptions = [...options]
    },
    setDevNextAnomalySelection(selection: DevNextAnomalySelection): void {
      this.devNextAnomalySelection = selection
    },
    setInteractionHint(hint: string | null): void {
      this.interactionHint = hint
    },
    setProtectionNotice(
      visible: boolean,
      messageKey: string | null = null,
    ): void {
      this.protectionNoticeVisible = visible
      this.protectionNoticeKey = visible ? messageKey : null
    },
    setPointerLocked(locked: boolean): void {
      this.pointerLocked = locked
    },
    beginTransition(intent: CinematicTransitionIntent): boolean {
      if (this.transitionPhase !== 'idle') {
        return false
      }
      this.transitionIntent = intent
      this.transitionPhase = 'covering'
      return true
    },
    markTransitionCovered(): void {
      if (this.transitionPhase === 'covering') {
        this.transitionPhase = 'covered'
      }
    },
    revealTransition(): void {
      if (this.transitionPhase === 'covered') {
        this.transitionPhase = 'revealing'
      }
    },
    finishTransition(): void {
      this.transitionPhase = 'idle'
      this.transitionIntent = null
    },
  },
})
