import { describe, expect, it } from 'vitest'

import {
  AUTO_CLOSE_DOOR_005_ANOMALY,
  UNLOCK_DOOR_001_ANOMALY,
} from '@/engine/level/DoorAnomalyContract'
import { createSpriteAnomalyId } from '@/engine/level/SpriteAnomalyContract'
import { RoundDifficulty } from '@/engine/session'
import type { LevelAnomalyDefinition } from '@/shared/events'

import { createAnomalyPools } from './createAnomalyPools'

const DEFINITIONS: readonly LevelAnomalyDefinition[] = [
  {
    kind: 'remove',
    difficulty: 'Easy',
    targetObjectId: 'Chair_easy',
    assetBaseName: 'Chair',
  },
  {
    kind: 'texture-swap',
    difficulty: 'Medium',
    targetObjectId: 'Painting_medium',
    assetBaseName: 'Painting',
  },
  {
    kind: 'sprite',
    difficulty: 'Hard',
    targetObjectId: 'Hallway_hard',
    assetBaseName: 'Hallway',
  },
]

describe('createAnomalyPools', () => {
  it('creates model anomalies in the discovered difficulty pools', () => {
    const pools = createAnomalyPools({ definitions: DEFINITIONS })

    expect(pools[RoundDifficulty.Easy]).toContainEqual(expect.objectContaining({
      id: 'flip_flop:Chair_easy:removed',
      targetObjectId: 'Chair_easy',
    }))
    expect(pools[RoundDifficulty.Medium]).toContainEqual(expect.objectContaining({
      id: 'flip_texture:Painting_medium:v2',
      targetObjectId: 'Painting_medium',
    }))
    expect(pools[RoundDifficulty.Hard]).toContainEqual(expect.objectContaining({
      id: createSpriteAnomalyId('Hallway_hard'),
      targetObjectId: 'Hallway_hard',
    }))
  })

  it('adds the unlocked DOOR.001 anomaly only to the medium pool', () => {
    const pools = createAnomalyPools({ definitions: DEFINITIONS })
    const anomaly = pools[RoundDifficulty.Medium].find(
      (item) => item.id === UNLOCK_DOOR_001_ANOMALY.id,
    )

    expect(anomaly).toMatchObject({
      difficulty: RoundDifficulty.Medium,
      targetObjectId: UNLOCK_DOOR_001_ANOMALY.targetObjectId,
    })
    expect(pools[RoundDifficulty.Easy]).not.toContainEqual(anomaly)
    expect(pools[RoundDifficulty.Hard]).not.toContainEqual(anomaly)
  })

  it('adds the delayed DOOR.005 closing anomaly only to the hard pool', () => {
    const pools = createAnomalyPools({ definitions: DEFINITIONS })
    const anomaly = pools[RoundDifficulty.Hard].find(
      (item) => item.id === AUTO_CLOSE_DOOR_005_ANOMALY.id,
    )

    expect(anomaly).toMatchObject({
      difficulty: RoundDifficulty.Hard,
      targetObjectId: AUTO_CLOSE_DOOR_005_ANOMALY.targetObjectId,
    })
    expect(pools[RoundDifficulty.Easy]).not.toContainEqual(anomaly)
    expect(pools[RoundDifficulty.Medium]).not.toContainEqual(anomaly)
  })

  it('does not create model anomalies without discovered definitions', () => {
    const pools = createAnomalyPools()

    expect(pools[RoundDifficulty.Easy]).toHaveLength(0)
    expect(pools[RoundDifficulty.Medium]).toHaveLength(1)
    expect(pools[RoundDifficulty.Hard]).toHaveLength(1)
  })
})
