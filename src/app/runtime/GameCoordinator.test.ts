import { describe, expect, it, vi } from 'vitest'

import { GameSessionGenerator } from '@/engine/session'
import { EventBus, type GameEventMap, type RoundStartedEvent } from '@/shared/events'

import { GameCoordinator } from './GameCoordinator'
import { createSpriteAnomalyId } from '@/engine/level/SpriteAnomalyContract'

const TEST_ANOMALY_DEFINITIONS = [
  {
    kind: 'remove',
    difficulty: 'Easy',
    targetObjectId: 'armchair_easy',
    assetBaseName: 'armchair',
  },
  {
    kind: 'sprite',
    difficulty: 'Hard',
    targetObjectId: 'SpritePoint_hard',
    assetBaseName: 'SpritePoint',
  },
] as const

function emitLevelLoaded(bus: EventBus<GameEventMap>): void {
  bus.emit('level:loaded', {
    source: 'gltf',
    url: '/assets/models/level.glb',
    anomalyDefinitions: TEST_ANOMALY_DEFINITIONS,
  })
}

function emitAnswer(
  bus: EventBus<GameEventMap>,
  hasAnomaly: boolean,
): void {
  bus.emit('interaction:door-selected', {
    answer: hasAnomaly,
    doorId: hasAnomaly ? 'anomaly' : 'no-anomaly',
    objectName: hasAnomaly ? 'CorrectDoor' : 'WrongDoor',
  })
}

describe('GameCoordinator', () => {
  it('advances on a correct answer and regenerates from level zero on a mistake', () => {
    const generate = vi.spyOn(GameSessionGenerator.prototype, 'generate')
    const bus = new EventBus<GameEventMap>()
    const coordinator = new GameCoordinator(bus)
    const started: RoundStartedEvent[] = []
    const results: GameEventMap['round:resolved'][] = []
    bus.on('round:started', (round) => started.push(round))
    bus.on('round:resolved', (result) => results.push(result))
    coordinator.connect()
    emitLevelLoaded(bus)

    bus.emit('session:start-requested', { mistakeProtection: false })
    const firstRound = started.at(-1)
    expect(firstRound?.level).toBe(0)
    expect(firstRound?.hasAnomaly).toBe(false)

    emitAnswer(bus, firstRound?.hasAnomaly ?? false)
    expect(results.at(-1)).toMatchObject({ correct: true, nextLevel: 1 })
    bus.emit('round:advance-requested', undefined)

    const secondRound = started.at(-1)
    expect(secondRound?.level).toBe(1)
    emitAnswer(bus, !(secondRound?.hasAnomaly ?? false))
    expect(results.at(-1)).toMatchObject({ correct: false, nextLevel: 0 })
    bus.emit('round:advance-requested', undefined)
    expect(started.at(-1)?.level).toBe(0)
    expect(started.at(-1)?.hasAnomaly).toBe(false)
    expect(generate).toHaveBeenCalledTimes(2)

    coordinator.dispose()
    generate.mockRestore()
  })

  it('uses mistake protection once and preserves the current level', () => {
    const generate = vi.spyOn(GameSessionGenerator.prototype, 'generate')
    const bus = new EventBus<GameEventMap>()
    const coordinator = new GameCoordinator(bus)
    const started: RoundStartedEvent[] = []
    const results: GameEventMap['round:resolved'][] = []
    bus.on('round:started', (round) => started.push(round))
    bus.on('round:resolved', (result) => results.push(result))
    coordinator.connect()
    emitLevelLoaded(bus)

    bus.emit('session:start-requested', { mistakeProtection: true })
    emitAnswer(bus, false)
    bus.emit('round:advance-requested', undefined)
    const protectedLevel = started.at(-1)
    expect(protectedLevel?.level).toBe(1)

    emitAnswer(bus, !(protectedLevel?.hasAnomaly ?? false))
    expect(results.at(-1)).toMatchObject({
      correct: false,
      mistakeProtected: true,
      nextLevel: 1,
    })
    bus.emit('round:advance-requested', undefined)
    expect(started.at(-1)?.level).toBe(1)
    expect(generate).toHaveBeenCalledTimes(1)

    const repeatedLevel = started.at(-1)
    emitAnswer(bus, !(repeatedLevel?.hasAnomaly ?? false))
    expect(results.at(-1)).toMatchObject({
      correct: false,
      mistakeProtected: false,
      nextLevel: 0,
    })
    bus.emit('round:advance-requested', undefined)
    expect(started.at(-1)?.level).toBe(0)
    expect(generate).toHaveBeenCalledTimes(2)

    coordinator.dispose()
    generate.mockRestore()
  })

  it('keeps the current session when returning from the menu', () => {
    const bus = new EventBus<GameEventMap>()
    const coordinator = new GameCoordinator(bus)
    const started: RoundStartedEvent[] = []
    const results: GameEventMap['round:resolved'][] = []
    bus.on('round:started', (round) => started.push(round))
    bus.on('round:resolved', (result) => results.push(result))
    coordinator.connect()
    emitLevelLoaded(bus)

    bus.emit('session:start-requested', { mistakeProtection: false })
    const firstRound = started.at(-1)
    bus.emit('game:pause-requested', undefined)
    bus.emit('game:run-requested', undefined)

    expect(started).toHaveLength(1)
    emitAnswer(bus, firstRound?.hasAnomaly ?? false)
    expect(results.at(-1)).toMatchObject({ correct: true, nextLevel: 1 })
    bus.emit('round:advance-requested', undefined)
    expect(started.at(-1)?.level).toBe(1)

    coordinator.dispose()
  })

  it('completes after levels zero through eight', () => {
    const bus = new EventBus<GameEventMap>()
    const coordinator = new GameCoordinator(bus)
    const started: RoundStartedEvent[] = []
    let finalResult: GameEventMap['round:resolved'] | null = null
    bus.on('round:started', (round) => {
      started.push(round)
    })
    bus.on('round:resolved', (result) => {
      finalResult = result
    })
    coordinator.connect()
    emitLevelLoaded(bus)

    bus.emit('session:start-requested', { mistakeProtection: false })
    for (let level = 0; level <= 8; level += 1) {
      const currentRound = started.at(-1)
      expect(currentRound).toMatchObject({ level })
      emitAnswer(bus, currentRound?.hasAnomaly ?? false)
      if (level < 8) {
        bus.emit('round:advance-requested', undefined)
      }
    }

    expect(finalResult).toMatchObject({ correct: true, completed: true })
    coordinator.dispose()
  })

  it('uses a selected dev anomaly for the next non-zero round', () => {
    const bus = new EventBus<GameEventMap>()
    const coordinator = new GameCoordinator(bus)
    const started: RoundStartedEvent[] = []
    let consumed = 0
    bus.on('round:started', (round) => started.push(round))
    bus.on('dev:next-anomaly-consumed', () => {
      consumed += 1
    })
    coordinator.connect()
    emitLevelLoaded(bus)

    bus.emit('session:start-requested', { mistakeProtection: false })
    bus.emit('dev:next-anomaly-selected', {
      kind: 'anomaly',
      anomalyId: 'flip_flop:armchair_easy:removed',
    })
    emitAnswer(bus, false)
    bus.emit('round:advance-requested', undefined)

    expect(started.at(-1)).toMatchObject({
      level: 1,
      anomalyId: 'flip_flop:armchair_easy:removed',
      anomalyTargetObjectId: 'armchair_easy',
      hasAnomaly: true,
    })
    expect(consumed).toBe(1)
    coordinator.dispose()
  })

  it('publishes discovered sprite points and can force a clear next round', () => {
    const bus = new EventBus<GameEventMap>()
    const coordinator = new GameCoordinator(bus)
    const started: RoundStartedEvent[] = []
    const catalogs: GameEventMap['dev:anomaly-options-changed'][] = []
    bus.on('round:started', (round) => started.push(round))
    bus.on('dev:anomaly-options-changed', (catalog) => catalogs.push(catalog))
    coordinator.connect()

    bus.emit('level:loaded', {
      source: 'gltf',
      url: '/assets/models/level.glb',
      anomalyDefinitions: [
        ...TEST_ANOMALY_DEFINITIONS,
        {
          kind: 'sprite',
          difficulty: 'Medium',
          targetObjectId: 'SpritePoint01_medium',
          assetBaseName: 'SpritePoint01',
        },
      ],
    })
    expect(catalogs.at(-1)?.options).toContainEqual(expect.objectContaining({
      id: createSpriteAnomalyId('SpritePoint01_medium'),
      targetObjectId: 'SpritePoint01_medium',
      difficulty: 'Medium',
    }))

    bus.emit('session:start-requested', { mistakeProtection: false })
    emitAnswer(bus, false)
    bus.emit('dev:next-anomaly-selected', { kind: 'none' })
    bus.emit('round:advance-requested', undefined)
    expect(started.at(-1)).toMatchObject({
      level: 1,
      anomalyId: null,
      anomalyTargetObjectId: null,
      hasAnomaly: false,
    })
    coordinator.dispose()
  })
})
