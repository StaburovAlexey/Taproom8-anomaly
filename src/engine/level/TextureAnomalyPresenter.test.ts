import { BufferGeometry, Mesh, MeshBasicMaterial, Texture } from 'three'
import { describe, expect, it } from 'vitest'

import { ObjectRegistry } from './ObjectRegistry'
import { TextureAnomalyPresenter } from './TextureAnomalyPresenter'
import { ANOMALY_TEXTURE_USER_DATA_KEY } from './TextureAnomalyContract'

describe('TextureAnomalyPresenter', () => {
  it('switches to the anomaly texture and restores the original material', () => {
    const normalTexture = new Texture()
    const anomalyTexture = new Texture()
    const originalMaterial = new MeshBasicMaterial({ map: normalTexture })
    const target = new Mesh(new BufferGeometry(), originalMaterial)
    target.name = 'painting'
    target.userData[ANOMALY_TEXTURE_USER_DATA_KEY] = anomalyTexture
    const registry = new ObjectRegistry()
    registry.register(target)
    const presenter = new TextureAnomalyPresenter(registry)

    presenter.apply({
      level: 1,
      difficulty: 'Medium',
      anomalyId: 'flip_texture:painting:v2',
      anomalyTargetObjectId: 'painting',
      hasAnomaly: true,
    })

    expect((target.material as MeshBasicMaterial).map).toBe(anomalyTexture)

    presenter.apply({
      level: 2,
      difficulty: 'None',
      anomalyId: null,
      anomalyTargetObjectId: null,
      hasAnomaly: false,
    })

    expect(target.material).toBe(originalMaterial)
  })
})
