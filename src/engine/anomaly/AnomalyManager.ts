import type { Anomaly } from './Anomaly';

export class ActiveAnomalyError extends Error {
  public constructor(activeAnomalyId: string, requestedAnomalyId: string) {
    super(
      `Cannot activate anomaly "${requestedAnomalyId}" while anomaly "${activeAnomalyId}" is active.`,
    );
    this.name = 'ActiveAnomalyError';
  }
}

export class AnomalyManager {
  private current: Anomaly | null = null;

  public get activeAnomaly(): Anomaly | null {
    return this.current;
  }

  public get hasActiveAnomaly(): boolean {
    return this.current !== null;
  }

  public activate(anomaly: Anomaly): void {
    if (this.current === anomaly) {
      return;
    }

    if (this.current !== null) {
      throw new ActiveAnomalyError(this.current.id, anomaly.id);
    }

    anomaly.apply();
    this.current = anomaly;
  }

  public reset(): void {
    if (this.current === null) {
      return;
    }

    this.current.reset();
    this.current = null;
  }
}
