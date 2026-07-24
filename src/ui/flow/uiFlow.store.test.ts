import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useUiFlowStore } from './uiFlow.store'

describe('uiFlow store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('moves through a cinematic transition without timing state', () => {
    const flow = useUiFlowStore()

    expect(flow.totalLevels).toBe(8)
    flow.showHome()
    expect(flow.beginTransition('start-session')).toBe(true)
    expect(flow.transitionVisible).toBe(true)

    flow.markTransitionCovered()
    flow.showGameplay()
    flow.revealTransition()

    expect(flow.transitionVisible).toBe(false)
    expect(flow.gameplayInputEnabled).toBe(false)

    flow.finishTransition()
    expect(flow.gameplayInputEnabled).toBe(true)
    expect(flow.transitionIntent).toBeNull()
  })

  it('returns from settings to the menu that opened them', () => {
    const flow = useUiFlowStore()

    flow.showHome()
    flow.openSettings()
    flow.closeSettings()
    expect(flow.screen).toBe('home')

    flow.showGameplay()
    flow.showPause()
    flow.openSettings()
    flow.closeSettings()
    expect(flow.screen).toBe('pause')
  })

  it('prevents overlapping cinematic transitions', () => {
    const flow = useUiFlowStore()

    expect(flow.beginTransition('advance-round')).toBe(true)
    expect(flow.beginTransition('abandon-session')).toBe(false)
    expect(flow.transitionIntent).toBe('advance-round')
  })

  it('stores and clears the current anomaly target', () => {
    const flow = useUiFlowStore()

    flow.setAnomalyTargetObjectId('painting007')
    expect(flow.anomalyTargetObjectId).toBe('painting007')

    flow.showHome()
    expect(flow.anomalyTargetObjectId).toBeNull()
  })

  it('stores the dev anomaly catalog and next selection', () => {
    const flow = useUiFlowStore()
    const option = {
      id: 'sprite_anomaly:SpritePoint01',
      difficulty: 'Medium' as const,
      targetObjectId: 'SpritePoint01',
    }

    flow.setDevAnomalyOptions([option])
    flow.setDevNextAnomalySelection({
      kind: 'anomaly',
      anomalyId: option.id,
    })

    expect(flow.devAnomalyOptions).toEqual([option])
    expect(flow.devNextAnomalySelection).toEqual({
      kind: 'anomaly',
      anomalyId: option.id,
    })
  })

  it('returns from the boost shop to its source screen', () => {
    const flow = useUiFlowStore()

    flow.showHome()
    flow.showBoostShop('home')
    flow.closeBoostShop()
    expect(flow.screen).toBe('home')

    flow.showPreparation()
    flow.showBoostShop('preparation')
    flow.closeBoostShop()
    expect(flow.screen).toBe('preparation')
  })

  it('clears the protection notice outside gameplay', () => {
    const flow = useUiFlowStore()

    flow.showGameplay()
    flow.setProtectionNotice(true, 'game.mistakeProtected')
    expect(flow.protectionNoticeVisible).toBe(true)
    expect(flow.protectionNoticeKey).toBe('game.mistakeProtected')

    flow.showPause()
    expect(flow.protectionNoticeVisible).toBe(false)
    flow.setProtectionNotice(true, 'game.mistakeProtected')
    flow.showHome()
    expect(flow.protectionNoticeVisible).toBe(false)
    expect(flow.protectionNoticeKey).toBeNull()
  })
})
