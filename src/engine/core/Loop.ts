export type LoopUpdate = (deltaSeconds: number, elapsedSeconds: number) => void;

export interface LoopOptions {
  readonly maxDeltaSeconds?: number;
}

export class Loop {
  private readonly update: LoopUpdate;
  private readonly maxDeltaSeconds: number;
  private animationFrameId: number | null = null;
  private previousTimeMilliseconds = 0;
  private elapsedSeconds = 0;

  public constructor(update: LoopUpdate, options: LoopOptions = {}) {
    this.update = update;
    this.maxDeltaSeconds = options.maxDeltaSeconds ?? 0.1;
  }

  public get running(): boolean {
    return this.animationFrameId !== null;
  }

  public start(): void {
    if (this.running) {
      return;
    }

    this.previousTimeMilliseconds = performance.now();
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  public stop(): void {
    if (this.animationFrameId === null) {
      return;
    }

    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
  }

  public resetElapsedTime(): void {
    this.elapsedSeconds = 0;
    this.previousTimeMilliseconds = performance.now();
  }

  public dispose(): void {
    this.stop();
  }

  private readonly tick = (timeMilliseconds: number): void => {
    if (this.animationFrameId === null) {
      return;
    }

    const rawDeltaSeconds = Math.max(
      0,
      (timeMilliseconds - this.previousTimeMilliseconds) / 1_000,
    );
    const deltaSeconds = Math.min(rawDeltaSeconds, this.maxDeltaSeconds);
    this.previousTimeMilliseconds = timeMilliseconds;
    this.elapsedSeconds += deltaSeconds;

    this.update(deltaSeconds, this.elapsedSeconds);
    this.animationFrameId = requestAnimationFrame(this.tick);
  };
}
