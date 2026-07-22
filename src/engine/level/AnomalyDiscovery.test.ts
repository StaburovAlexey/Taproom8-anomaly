import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Object3D } from 'three'
import { describe, expect, it } from 'vitest'

import {
  discoverLevelAnomalies,
  FLIP_FLOP_ROOT_NAME,
  FLIP_TEXTURE_ROOT_NAME,
} from './AnomalyDiscovery'
import { SPRITE_ANOMALY_ROOT_NAME } from './SpriteAnomalyContract'

function mesh(name: string): Mesh {
  const result = new Mesh(new BoxGeometry(), new MeshBasicMaterial())
  result.name = name
  return result
}

function group(name: string): Group {
  const result = new Group()
  result.name = name
  return result
}

function createRoot(): Object3D {
  const root = group('Scene')
  const removals = group(FLIP_FLOP_ROOT_NAME)
  const textures = group(FLIP_TEXTURE_ROOT_NAME)
  const sprites = group(SPRITE_ANOMALY_ROOT_NAME)
  removals.add(mesh('Chair_easy'))
  textures.add(mesh('Painting_medium'))
  const sprite = new Object3D()
  sprite.name = 'Hallway_hard'
  sprites.add(sprite)
  root.add(removals, textures, sprites)
  return root
}

describe('discoverLevelAnomalies', () => {
  it('discovers kind, difficulty, target, and texture base name', () => {
    const result = discoverLevelAnomalies(createRoot())

    expect(result.issues).toHaveLength(0)
    expect(result.definitions).toEqual([
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
    ])
  })

  it('ignores invalid direct children and reports recoverable issues', () => {
    const root = createRoot()
    root.getObjectByName(FLIP_FLOP_ROOT_NAME)?.add(mesh('Helper'))
    root.getObjectByName(SPRITE_ANOMALY_ROOT_NAME)?.add(
      mesh('VisiblePoint_easy'),
    )

    const result = discoverLevelAnomalies(root)

    expect(result.definitions).toHaveLength(3)
    expect(result.issues.map((issue) => issue.objectName)).toEqual([
      'Helper',
      'VisiblePoint_easy',
    ])
  })

  it('only registers direct children of anomaly groups', () => {
    const root = createRoot()
    const parent = root.getObjectByName('Chair_easy')
    parent?.add(mesh('Nested_hard'))

    const result = discoverLevelAnomalies(root)

    expect(result.definitions).not.toContainEqual(expect.objectContaining({
      targetObjectId: 'Nested_hard',
    }))
  })
})
