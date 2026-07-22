import { Mesh, type Object3D } from 'three'

import type {
  LevelAnomalyDefinition,
  LevelAnomalyDifficulty,
  LevelAnomalyKind,
} from '../../shared/events'
import { SPRITE_ANOMALY_ROOT_NAME } from './SpriteAnomalyContract'

export const FLIP_FLOP_ROOT_NAME = 'FlipFlopObj'
export const FLIP_TEXTURE_ROOT_NAME = 'FlipTextureObj'

interface AnomalyGroupContract {
  readonly rootName: string
  readonly kind: LevelAnomalyKind
  readonly requiresMesh: boolean
}

export interface AnomalyDiscoveryIssue {
  readonly objectName: string
  readonly message: string
}

export interface AnomalyDiscoveryResult {
  readonly definitions: readonly LevelAnomalyDefinition[]
  readonly issues: readonly AnomalyDiscoveryIssue[]
}

const GROUPS: readonly AnomalyGroupContract[] = [
  {
    rootName: FLIP_FLOP_ROOT_NAME,
    kind: 'remove',
    requiresMesh: true,
  },
  {
    rootName: FLIP_TEXTURE_ROOT_NAME,
    kind: 'texture-swap',
    requiresMesh: true,
  },
  {
    rootName: SPRITE_ANOMALY_ROOT_NAME,
    kind: 'sprite',
    requiresMesh: false,
  },
]

const DIFFICULTY_BY_SUFFIX: Readonly<
  Record<string, LevelAnomalyDifficulty>
> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

function containsMesh(root: Object3D): boolean {
  let result = false
  root.traverse((object) => {
    if (object instanceof Mesh) {
      result = true
    }
  })
  return result
}

function parseDefinition(
  object: Object3D,
  group: AnomalyGroupContract,
): LevelAnomalyDefinition | string {
  const match = /_(easy|medium|hard)$/i.exec(object.name)
  if (match === null) {
    return `Object "${object.name}" in "${group.rootName}" must end with _easy, _medium, or _hard.`
  }

  const suffix = match[1]?.toLowerCase() ?? ''
  const difficulty = DIFFICULTY_BY_SUFFIX[suffix]
  const assetBaseName = object.name.slice(0, match.index).trim()
  if (difficulty === undefined || assetBaseName.length === 0) {
    return `Object "${object.name}" has an invalid anomaly name.`
  }

  const hasMesh = containsMesh(object)
  if (group.requiresMesh && !hasMesh) {
    return `Anomaly object "${object.name}" does not contain a mesh.`
  }
  if (!group.requiresMesh && hasMesh) {
    return `Sprite point "${object.name}" must be an Empty without meshes.`
  }

  return Object.freeze({
    kind: group.kind,
    difficulty,
    targetObjectId: object.name,
    assetBaseName,
  })
}

export function discoverLevelAnomalies(root: Object3D): AnomalyDiscoveryResult {
  const definitions: LevelAnomalyDefinition[] = []
  const issues: AnomalyDiscoveryIssue[] = []
  const registeredTargets = new Set<string>()

  for (const group of GROUPS) {
    const groupRoot = root.getObjectByName(group.rootName)
    if (groupRoot === undefined) {
      issues.push({
        objectName: group.rootName,
        message: `Anomaly group "${group.rootName}" was not found.`,
      })
      continue
    }

    let validChildren = 0
    for (const child of groupRoot.children) {
      const definition = parseDefinition(child, group)
      if (typeof definition === 'string') {
        issues.push({ objectName: child.name, message: definition })
        continue
      }
      if (registeredTargets.has(definition.targetObjectId)) {
        issues.push({
          objectName: child.name,
          message: `Anomaly target "${definition.targetObjectId}" is registered more than once.`,
        })
        continue
      }
      registeredTargets.add(definition.targetObjectId)
      definitions.push(definition)
      validChildren += 1
    }

    if (validChildren === 0) {
      issues.push({
        objectName: group.rootName,
        message: `Anomaly group "${group.rootName}" has no valid direct children.`,
      })
    }
  }

  return Object.freeze({
    definitions: Object.freeze(definitions),
    issues: Object.freeze(issues),
  })
}
