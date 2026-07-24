import { Object3D, Sprite, Texture } from 'three'
import { describe, expect, it } from 'vitest'

import type { AssetManager } from '../loaders/AssetManager'
import { createSpriteAnomalyId } from './SpriteAnomalyContract'
import { SpriteAnomalyPresenter } from './SpriteAnomalyPresenter'
import { ObjectRegistry } from './ObjectRegistry'

describe('SpriteAnomalyPresenter', () => {
  it('creates a billboard at a spawn point and removes it on the next round', async () => {
    const scene = new Object3D()
    const spawnPoint = new Object3D()
    spawnPoint.name = 'SpritePoint01'
    spawnPoint.position.set(2, 1, -3)
    scene.add(spawnPoint)
    scene.updateMatrixWorld(true)
    const registry = new ObjectRegistry()
    registry.registerTree(scene)
    const texture = new Texture()
    const assetManager = {
      loadTexture: async () => texture,
    } as unknown as AssetManager
    const presenter = new SpriteAnomalyPresenter(
      scene,
      registry,
      assetManager,
    )
    await presenter.load()

    presenter.apply({
      level: 4,
      difficulty: 'Medium',
      anomalyId: createSpriteAnomalyId(spawnPoint.name),
      anomalyTargetObjectId: spawnPoint.name,
      hasAnomaly: true,
    })

    const sprite = scene.children.find((object) => object instanceof Sprite)
    expect(sprite).toBeInstanceOf(Sprite)
    expect(sprite?.position).toMatchObject({ x: 2, y: 1, z: -3 })

    presenter.apply({
      level: 5,
      difficulty: 'None',
      anomalyId: null,
      anomalyTargetObjectId: null,
      hasAnomaly: false,
    })

    expect(scene.children.some((object) => object instanceof Sprite)).toBe(false)
  })
})
