import {
  isAnomalyDifficulty,
  type AnomalyDifficulty,
  type RoundDifficulty,
} from '../session/RoundDifficulty';
import type { Anomaly } from './Anomaly';

export interface MetadataAnomalyOptions<TMetadata = unknown> {
  readonly id: string;
  readonly difficulty: AnomalyDifficulty;
  readonly targetObjectId: string;
  readonly metadata?: TMetadata;
  readonly onApply?: (anomaly: MetadataAnomaly<TMetadata>) => void;
  readonly onReset?: (anomaly: MetadataAnomaly<TMetadata>) => void;
}

export class MetadataAnomaly<TMetadata = unknown> implements Anomaly {
  public readonly id: string;
  public readonly difficulty: AnomalyDifficulty;
  public readonly targetObjectId: string;
  public readonly metadata: TMetadata | undefined;

  private applied = false;

  public constructor(
    private readonly options: MetadataAnomalyOptions<TMetadata>,
  ) {
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
    this.metadata = options.metadata;
  }

  public get isApplied(): boolean {
    return this.applied;
  }

  public apply(): void {
    if (this.applied) {
      return;
    }

    this.options.onApply?.(this);
    this.applied = true;
  }

  public reset(): void {
    if (!this.applied) {
      return;
    }

    this.options.onReset?.(this);
    this.applied = false;
  }
}

export function createMetadataAnomaly<TMetadata = unknown>(
  options: MetadataAnomalyOptions<TMetadata>,
): MetadataAnomaly<TMetadata> {
  return new MetadataAnomaly(options);
}
