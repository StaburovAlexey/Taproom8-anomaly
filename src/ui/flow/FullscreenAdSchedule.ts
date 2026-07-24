import type { CinematicTransitionIntent } from './uiFlow.types'

export type FullscreenAdPlacement =
  | 'after-cycle-3'
  | 'after-cycle-6'
  | `after-attempt-${number}`
  | 'pause-menu'
  | 'completed-menu'

const ROUND_PLACEMENTS = new Map<number, FullscreenAdPlacement>([
  [3, 'after-cycle-3'],
  [6, 'after-cycle-6'],
])
const ATTEMPTS_PER_AD = 5

export class FullscreenAdSchedule {
  private readonly consumed = new Set<FullscreenAdPlacement>()
  private pending: FullscreenAdPlacement | null = null
  private attemptCount = 0

  public reset(): void {
    this.consumed.clear()
    this.pending = null
    this.attemptCount = 0
  }

  public recordRound(level: number, correct: boolean): void {
    this.attemptCount += 1
    const roundPlacement = correct
      ? ROUND_PLACEMENTS.get(level)
      : undefined
    if (
      roundPlacement !== undefined
      && !this.consumed.has(roundPlacement)
    ) {
      this.pending = roundPlacement
      return
    }
    if (this.attemptCount % ATTEMPTS_PER_AD === 0) {
      this.pending = `after-attempt-${this.attemptCount}`
    }
  }

  public recordPauseMenu(): void {
    if (!this.consumed.has('pause-menu')) {
      this.pending = 'pause-menu'
    }
  }

  public recordCompletedMenu(): void {
    if (!this.consumed.has('completed-menu')) {
      this.pending = 'completed-menu'
    }
  }

  public take(intent: CinematicTransitionIntent | null): FullscreenAdPlacement | null {
    const placement = this.pending
    if (placement === null || !this.matchesIntent(placement, intent)) {
      return null
    }
    this.pending = null
    this.consumed.add(placement)
    return placement
  }

  private matchesIntent(
    placement: FullscreenAdPlacement,
    intent: CinematicTransitionIntent | null,
  ): boolean {
    if (placement === 'pause-menu' || placement === 'completed-menu') {
      return intent === 'abandon-session'
    }
    return intent === 'advance-round' || intent === 'show-completed'
  }
}
