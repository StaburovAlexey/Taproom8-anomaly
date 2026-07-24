import {
  Sprite,
  SpriteMaterial,
  Vector3,
  type Object3D,
  type Texture,
} from 'three'

import type { RoundStartedEvent } from '../../shared/events'
import { AssetManager } from '../loaders/AssetManager'
import { applyPS1TextureStyle } from '../rendering/PS1Style'
import { ObjectRegistry } from './ObjectRegistry'
import {
  isSpriteAnomalyId,
  SPRITE_ANOMALY_SCALE,
  SPRITE_ANOMALY_TEXTURE_URL,
} from './SpriteAnomalyContract'

export class SpriteAnomalyPresenter {
  private readonly position = new Vector3()
  private texture: Texture | null = null
  private sprite: Sprite | null = null

  public constructor(
    private readonly scene: Object3D,
    private readonly registry: ObjectRegistry,
    private readonly assetManager: AssetManager,
  ) {}

  public async load(): Promise<void> {
    if (this.texture !== null) {
      return
    }
    this.texture = await this.assetManager.loadTexture(
      SPRITE_ANOMALY_TEXTURE_URL,
    )
    applyPS1TextureStyle(this.texture)
  }

  public apply(round: RoundStartedEvent): void {
    this.reset()
    if (
      !isSpriteAnomalyId(round.anomalyId)
      || round.anomalyTargetObjectId === null
    ) {
      return
    }
    if (this.texture === null) {
      throw new Error('Sprite anomaly texture was not loaded.')
    }

    const spawnPoint = this.registry.require(round.anomalyTargetObjectId)
    spawnPoint.getWorldPosition(this.position)
    const material = new SpriteMaterial({
      map: this.texture,
      transparent: true,
      alphaTest: 0.5,
      depthTest: true,
      depthWrite: false,
      fog: true,
    })
    const sprite = new Sprite(material)
    sprite.name = `SpriteAnomaly_${round.anomalyTargetObjectId}`
    sprite.center.set(0.5, 0.5)
    sprite.position.copy(this.position)
    sprite.scale.set(
      SPRITE_ANOMALY_SCALE.width,
      SPRITE_ANOMALY_SCALE.height,
      1,
    )
    this.scene.add(sprite)
    this.sprite = sprite
  }

  public reset(): void {
    if (this.sprite === null) {
      return
    }
    this.sprite.removeFromParent()
    this.sprite.material.dispose()
    this.sprite = null
  }

  public dispose(): void {
    this.reset()
    this.texture = null
  }
}
