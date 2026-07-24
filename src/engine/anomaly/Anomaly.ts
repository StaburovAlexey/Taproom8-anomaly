import {
  isAnomalyDifficulty,
  type AnomalyDifficulty,
  type RoundDifficulty,
} from '../session/RoundDifficulty';

export interface ObjectRegistryLike<TObject extends object> {
  get(id: string): TObject | undefined;
}

export interface Anomaly {
  readonly id: string;
  readonly difficulty: AnomalyDifficulty;
  readonly targetObjectId: string;
  readonly isApplied: boolean;

  apply(): void;
  reset(): void;
}

export interface AnomalyOptions<TTarget extends object> {
  readonly id: string;
  readonly difficulty: AnomalyDifficulty;
  readonly targetObjectId: string;
  readonly registry: ObjectRegistryLike<TTarget>;
}

export class AnomalyTargetNotFoundError extends Error {
  public constructor(anomalyId: string, targetObjectId: string) {
    super(
      `Anomaly "${anomalyId}" could not find target object "${targetObjectId}".`,
    );
    this.name = 'AnomalyTargetNotFoundError';
  }
}

export abstract class BaseAnomaly<TTarget extends object> implements Anomaly {
  public readonly id: string;
  public readonly difficulty: AnomalyDifficulty;
  public readonly targetObjectId: string;

  private appliedTarget: TTarget | undefined;

  protected constructor(private readonly options: AnomalyOptions<TTarget>) {
    const id = options.id.trim();
    const targetObjectId = options.targetObjectId.trim();

    if (id.length === 0) {
      throw new Error('An anomaly id must not be empty.');
    }

    if (targetObjectId.length === 0) {
      throw new Error('An anomaly targetObjectId must not be empty.');
    }

    if (!isAnomalyDifficulty(options.difficulty as RoundDifficulty)) {
      throw new Error('An anomaly difficulty must be easy, medium, or hard.');
    }

    this.id = id;
    this.difficulty = options.difficulty;
    this.targetObjectId = targetObjectId;
  }

  public get isApplied(): boolean {
    return this.appliedTarget !== undefined;
  }

  public apply(): void {
    if (this.appliedTarget !== undefined) {
      return;
    }

    const target = this.options.registry.get(this.targetObjectId);

    if (target === undefined) {
      throw new AnomalyTargetNotFoundError(this.id, this.targetObjectId);
    }

    this.applyTo(target);
    this.appliedTarget = target;
  }

  public reset(): void {
    const target = this.appliedTarget;

    if (target === undefined) {
      return;
    }

    this.resetTarget(target);
    this.appliedTarget = undefined;
  }

  protected abstract applyTo(target: TTarget): void;
  protected abstract resetTarget(target: TTarget): void;
}
