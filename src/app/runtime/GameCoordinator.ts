import { AnomalyManager } from '@/engine/anomaly'
import {
  GameSession,
  GameSessionGenerator,
  RoundDifficulty,
  type AnomalyDifficulty,
  type AnomalyPools,
} from '@/engine/session'
import type { Anomaly } from '@/engine/anomaly'
import { AnalyticsManager } from '@/shared/analytics/AnalyticsManager'
import {
  gameEventBus,
  type DevAnomalyOption,
  type DevNextAnomalySelection,
  type EventBus,
  type GameEventMap,
  type LevelAnomalyDefinition,
  type RoundDifficulty as EventRoundDifficulty,
} from '@/shared/events'

import { createAnomalyPools } from './createAnomalyPools'

function toEventDifficulty(difficulty: RoundDifficulty): EventRoundDifficulty {
  switch (difficulty) {
    case RoundDifficulty.None:
      return 'None'
    case RoundDifficulty.Easy:
      return 'Easy'
    case RoundDifficulty.Medium:
      return 'Medium'
    case RoundDifficulty.Hard:
      return 'Hard'
  }
}

function toDevDifficulty(
  difficulty: AnomalyDifficulty,
): DevAnomalyOption['difficulty'] {
  switch (difficulty) {
    case RoundDifficulty.Easy:
      return 'Easy'
    case RoundDifficulty.Medium:
      return 'Medium'
    case RoundDifficulty.Hard:
      return 'Hard'
  }
}

export class GameCoordinator {
  private readonly anomalyManager = new AnomalyManager()
  private readonly cleanups: Array<() => void> = []
  private anomalyDefinitions: readonly LevelAnomalyDefinition[] = []
  private nextAnomalySelection: DevNextAnomalySelection = { kind: 'random' }
  private session: GameSession | null = null
  private resolving = false
  private mistakeChances = 0

  public constructor(
    private readonly eventBus: EventBus<GameEventMap> = gameEventBus,
  ) {}

  public connect(): void {
    if (this.cleanups.length > 0) {
      return
    }

    this.cleanups.push(
      this.eventBus.on('session:start-requested', (configuration) => {
        this.startSession(
          configuration.mistakeChances,
        )
      }),
      this.eventBus.on('level:loaded', ({ anomalyDefinitions }) => {
        this.anomalyDefinitions = [...anomalyDefinitions]
        this.emitDevAnomalyOptions()
      }),
      this.eventBus.on('session:abandon-requested', () => this.resetSession()),
      this.eventBus.on('round:advance-requested', () => this.advanceRound()),
      this.eventBus.on('interaction:door-selected', ({ answer }) => {
        this.evaluateDoor(answer)
      }),
    )
    if (import.meta.env.DEV) {
      this.cleanups.push(
        this.eventBus.on('dev:next-anomaly-selected', (selection) => {
          this.nextAnomalySelection = selection
        }),
      )
    }
  }

  public dispose(): void {
    this.resetSession()
    this.cleanups.forEach((cleanup) => cleanup())
    this.cleanups.length = 0
  }

  private startSession(mistakeChances: number): void {
    this.anomalyManager.reset()
    this.session = this.generateSession()
    this.resolving = false
    this.mistakeChances = Math.max(0, Math.floor(mistakeChances))
    AnalyticsManager.goal('session_started')
    this.startCurrentRound()
  }

  private resetSession(): void {
    this.anomalyManager.reset()
    this.session = null
    this.resolving = false
    this.mistakeChances = 0
    this.resetDevAnomalySelection()
  }

  private startCurrentRound(): void {
    this.applyDevAnomalySelection()
    const round = this.session?.currentRound
    if (round === null || round === undefined) {
      return
    }

    this.anomalyManager.reset()
    if (round.anomaly !== null) {
      this.anomalyManager.activate(round.anomaly)
    }

    this.resolving = false
    this.eventBus.emit('round:started', {
      level: round.level,
      difficulty: toEventDifficulty(round.difficulty),
      anomalyId: round.anomaly?.id ?? null,
      anomalyTargetObjectId: round.anomaly?.targetObjectId ?? null,
      hasAnomaly: round.hasAnomaly,
    })
  }

  private evaluateDoor(answer: boolean): void {
    if (this.session === null || this.resolving || this.session.completed) {
      return
    }

    this.resolving = true
    const result = this.session.evaluateAnswer(answer, {
      protectMistake: this.mistakeChances > 0,
    })
    if (result.mistakeProtected) {
      this.mistakeChances -= 1
    }
    this.anomalyManager.reset()

    if (!result.isCorrect && !result.mistakeProtected) {
      this.session = this.generateSession()
    }

    AnalyticsManager.goal('round_completed', {
      level: result.previousLevel,
      correct: result.isCorrect,
      hasAnomaly: result.expectedHasAnomaly,
    })

    this.eventBus.emit('round:resolved', {
      correct: result.isCorrect,
      mistakeProtected: result.mistakeProtected,
      remainingMistakeChances: this.mistakeChances,
      selectedAnswer: result.answeredHasAnomaly,
      nextLevel: result.currentLevel ?? result.previousLevel,
      completed: result.completed,
    })

    if (result.completed) {
      return
    }
  }

  private advanceRound(): void {
    if (this.session === null || this.session.completed || !this.resolving) {
      return
    }
    this.startCurrentRound()
  }

  private generateSession(): GameSession {
    return new GameSessionGenerator({
      anomalyPools: this.createPools(),
    }).generate()
  }

  private createPools(): AnomalyPools {
    return createAnomalyPools({
      definitions: this.anomalyDefinitions,
    })
  }

  private emitDevAnomalyOptions(): void {
    if (!import.meta.env.DEV) {
      return
    }
    const options: DevAnomalyOption[] = Object.values(this.createPools())
      .flat()
      .map((anomaly) => ({
        id: anomaly.id,
        difficulty: toDevDifficulty(anomaly.difficulty),
        targetObjectId: anomaly.targetObjectId,
      }))
    this.eventBus.emit('dev:anomaly-options-changed', { options })
  }

  private applyDevAnomalySelection(): void {
    if (
      !import.meta.env.DEV
      || this.session === null
      || this.session.currentRound?.level === 0
      || this.nextAnomalySelection.kind === 'random'
    ) {
      return
    }

    let anomaly: Anomaly | null = null
    if (this.nextAnomalySelection.kind === 'anomaly') {
      const anomalyId = this.nextAnomalySelection.anomalyId
      anomaly = Object.values(this.createPools())
        .flat()
        .find((candidate) => candidate.id === anomalyId) ?? null
      if (anomaly === null) {
        return
      }
    }

    this.session.overrideCurrentRound(anomaly)
    this.resetDevAnomalySelection()
  }

  private resetDevAnomalySelection(): void {
    this.nextAnomalySelection = { kind: 'random' }
    if (import.meta.env.DEV) {
      this.eventBus.emit('dev:next-anomaly-consumed', undefined)
    }
  }
}
