import { createMetadataAnomaly, type Anomaly } from '@/engine/anomaly'
import {
  AUTO_CLOSE_DOOR_005_ANOMALY,
  UNLOCK_DOOR_001_ANOMALY,
} from '@/engine/level/DoorAnomalyContract'
import { createSpriteAnomalyId } from '@/engine/level/SpriteAnomalyContract'
import {
  RoundDifficulty,
  type AnomalyDifficulty,
  type AnomalyPools,
} from '@/engine/session'
import type {
  LevelAnomalyDefinition,
  LevelAnomalyDifficulty,
} from '@/shared/events'

interface RemovalAnomalyMetadata {
  readonly kind: 'remove'
}

interface TextureAnomalyMetadata {
  readonly kind: 'texture-swap'
}

interface DoorAnomalyMetadata {
  readonly kind: 'door-unlock' | 'door-auto-close'
}

interface SpriteAnomalyMetadata {
  readonly kind: 'sprite'
}

export interface CreateAnomalyPoolsOptions {
  readonly definitions?: readonly LevelAnomalyDefinition[]
}

function toSessionDifficulty(
  difficulty: LevelAnomalyDifficulty,
): AnomalyDifficulty {
  switch (difficulty) {
    case 'Easy':
      return RoundDifficulty.Easy
    case 'Medium':
      return RoundDifficulty.Medium
    case 'Hard':
      return RoundDifficulty.Hard
  }
}

function createRemovalAnomaly(
  definition: LevelAnomalyDefinition,
  difficulty: AnomalyDifficulty,
): Anomaly {
  return createMetadataAnomaly<RemovalAnomalyMetadata>({
    id: `flip_flop:${definition.targetObjectId}:removed`,
    difficulty,
    targetObjectId: definition.targetObjectId,
    metadata: { kind: 'remove' },
  })
}

function createTextureAnomaly(
  definition: LevelAnomalyDefinition,
  difficulty: AnomalyDifficulty,
): Anomaly {
  return createMetadataAnomaly<TextureAnomalyMetadata>({
    id: `flip_texture:${definition.targetObjectId}:v2`,
    difficulty,
    targetObjectId: definition.targetObjectId,
    metadata: { kind: 'texture-swap' },
  })
}

function createSpriteAnomaly(
  definition: LevelAnomalyDefinition,
  difficulty: AnomalyDifficulty,
): Anomaly {
  return createMetadataAnomaly<SpriteAnomalyMetadata>({
    id: createSpriteAnomalyId(definition.targetObjectId),
    difficulty,
    targetObjectId: definition.targetObjectId,
    metadata: { kind: 'sprite' },
  })
}

function createDoorUnlockAnomaly(): Anomaly {
  return createMetadataAnomaly<DoorAnomalyMetadata>({
    id: UNLOCK_DOOR_001_ANOMALY.id,
    difficulty: RoundDifficulty.Medium,
    targetObjectId: UNLOCK_DOOR_001_ANOMALY.targetObjectId,
    metadata: { kind: 'door-unlock' },
  })
}

function createDoorAutoCloseAnomaly(): Anomaly {
  return createMetadataAnomaly<DoorAnomalyMetadata>({
    id: AUTO_CLOSE_DOOR_005_ANOMALY.id,
    difficulty: RoundDifficulty.Hard,
    targetObjectId: AUTO_CLOSE_DOOR_005_ANOMALY.targetObjectId,
    metadata: { kind: 'door-auto-close' },
  })
}

function createModelAnomaly(definition: LevelAnomalyDefinition): Anomaly {
  const difficulty = toSessionDifficulty(definition.difficulty)
  switch (definition.kind) {
    case 'remove':
      return createRemovalAnomaly(definition, difficulty)
    case 'texture-swap':
      return createTextureAnomaly(definition, difficulty)
    case 'sprite':
      return createSpriteAnomaly(definition, difficulty)
  }
}

export function createAnomalyPools(
  options: CreateAnomalyPoolsOptions = {},
): AnomalyPools {
  const pools: Record<AnomalyDifficulty, Anomaly[]> = {
    [RoundDifficulty.Easy]: [],
    [RoundDifficulty.Medium]: [createDoorUnlockAnomaly()],
    [RoundDifficulty.Hard]: [createDoorAutoCloseAnomaly()],
  }

  for (const definition of options.definitions ?? []) {
    const anomaly = createModelAnomaly(definition)
    pools[anomaly.difficulty].push(anomaly)
  }

  return pools
}
