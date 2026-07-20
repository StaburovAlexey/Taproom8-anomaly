import type { Object3D } from 'three'

import type { RoundStartedEvent } from '../../shared/events'
import { ObjectRegistry } from './ObjectRegistry'

interface VisibilitySnapshot {
  readonly object: Object3D
  readonly visible: boolean
}

export class RemovalAnomalyPresenter {
  private activeSnapshot: VisibilitySnapshot | null = null

  public constructor(private readonly registry: ObjectRegistry) {}

  public apply(round: RoundStartedEvent): void {
    this.reset()
    if (
      !round.hasAnomaly
      || round.anomalyTargetObjectId === null
      || !round.anomalyId?.startsWith('flip_flop:')
    ) {
      return
    }

    const object = this.registry.get(round.anomalyTargetObjectId)
    if (object === undefined) {
      throw new Error(
        `Anomaly target "${round.anomalyTargetObjectId}" was not found.`,
      )
    }

    this.activeSnapshot = { object, visible: object.visible }
    object.visible = false
    object.updateMatrixWorld(true)
  }

  public reset(): void {
    if (this.activeSnapshot === null) {
      return
    }

    this.activeSnapshot.object.visible = this.activeSnapshot.visible
    this.activeSnapshot.object.updateMatrixWorld(true)
    this.activeSnapshot = null
  }

  public dispose(): void {
    this.reset()
  }
}
