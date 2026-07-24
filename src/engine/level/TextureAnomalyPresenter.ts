import { Material, Mesh, type Texture } from 'three'

import type { RoundStartedEvent } from '../../shared/events'
import { ObjectRegistry } from './ObjectRegistry'
import { ANOMALY_TEXTURE_USER_DATA_KEY } from './TextureAnomalyContract'

interface MaterialWithMap extends Material {
  map: Texture | null
}

interface MaterialSnapshot {
  readonly mesh: Mesh
  readonly original: Material | Material[]
  readonly anomaly: Material | Material[]
}

function hasMap(material: Material): material is MaterialWithMap {
  return 'map' in material
}

function createAnomalyMaterial(
  material: Material,
  texture: Texture,
): Material {
  const result = material.clone()
  if (hasMap(result)) {
    result.map = texture
  }
  result.needsUpdate = true
  return result
}

function disposeMaterial(material: Material | Material[]): void {
  const materials = Array.isArray(material) ? material : [material]
  materials.forEach((item) => item.dispose())
}

export class TextureAnomalyPresenter {
  private snapshots: MaterialSnapshot[] = []

  public constructor(private readonly registry: ObjectRegistry) {}

  public apply(round: RoundStartedEvent): void {
    this.reset()
    if (
      !round.hasAnomaly
      || round.anomalyTargetObjectId === null
      || !round.anomalyId?.startsWith('flip_texture:')
    ) {
      return
    }

    const target = this.registry.get(round.anomalyTargetObjectId)
    if (target === undefined) {
      throw new Error(
        `Texture anomaly target "${round.anomalyTargetObjectId}" was not found.`,
      )
    }

    target.traverse((object) => {
      if (!(object instanceof Mesh)) {
        return
      }
      const texture = object.userData[
        ANOMALY_TEXTURE_USER_DATA_KEY
      ] as Texture | undefined
      if (texture === undefined) {
        throw new Error(
          `Anomaly texture for "${round.anomalyTargetObjectId}" was not loaded.`,
        )
      }
      const original = object.material
      const anomaly = Array.isArray(original)
        ? original.map((material) => createAnomalyMaterial(material, texture))
        : createAnomalyMaterial(original, texture)
      this.snapshots.push({ mesh: object, original, anomaly })
      object.material = anomaly
    })
  }

  public reset(): void {
    for (const snapshot of this.snapshots) {
      snapshot.mesh.material = snapshot.original
      disposeMaterial(snapshot.anomaly)
    }
    this.snapshots = []
  }

  public dispose(): void {
    this.reset()
  }
}
