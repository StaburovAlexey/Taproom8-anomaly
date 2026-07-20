type LoadingStage = 'model' | 'texture' | 'audio'

const STAGE_WEIGHTS: Readonly<Record<LoadingStage, number>> = {
  model: 0.55,
  texture: 0.25,
  audio: 0.2,
}

export class LoadingProgressAggregator {
  private readonly progress: Record<LoadingStage, number> = {
    model: 0,
    texture: 0,
    audio: 0,
  }

  public update(stage: LoadingStage, progress: number): number {
    const normalized = Math.min(1, Math.max(0, progress))
    this.progress[stage] = Math.max(this.progress[stage], normalized)
    return this.value
  }

  public complete(stage: LoadingStage): number {
    return this.update(stage, 1)
  }

  public get value(): number {
    return (
      this.progress.model * STAGE_WEIGHTS.model
      + this.progress.texture * STAGE_WEIGHTS.texture
      + this.progress.audio * STAGE_WEIGHTS.audio
    )
  }
}
