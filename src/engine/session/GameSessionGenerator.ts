import type { Anomaly } from '../anomaly/Anomaly';
import { GameSession } from './GameSession';
import {
  createGameRound,
  GAME_LEVELS,
  type GameRound,
} from './GameRound';
import {
  DEFAULT_LEVEL_CONFIGS,
  type DifficultyWeights,
  type LevelConfig,
} from './LevelConfig';
import {
  mathRandomSource,
  nextRandom,
  type RandomSource,
} from './Random';
import {
  ANOMALY_DIFFICULTIES,
  ROUND_DIFFICULTIES,
  RoundDifficulty,
  type AnomalyDifficulty,
} from './RoundDifficulty';
import { ShuffleBag } from './ShuffleBag';

export type AnomalyPools = Readonly<
  Record<AnomalyDifficulty, readonly Anomaly[]>
>;

export interface GameSessionGeneratorOptions {
  readonly anomalyPools: AnomalyPools;
  readonly levelConfigs?: readonly LevelConfig[];
  readonly random?: RandomSource;
}

function validateWeight(weight: number, difficulty: RoundDifficulty): void {
  if (!Number.isFinite(weight) || weight < 0) {
    throw new Error(`Weight for ${difficulty} must be a finite non-negative number.`);
  }
}

export function selectWeightedDifficulty(
  weights: DifficultyWeights,
  random: RandomSource,
): RoundDifficulty {
  let totalWeight = 0;

  for (const difficulty of ROUND_DIFFICULTIES) {
    const weight = weights[difficulty];
    validateWeight(weight, difficulty);
    totalWeight += weight;
  }

  if (totalWeight <= 0) {
    throw new Error('At least one round difficulty must have a positive weight.');
  }

  const roll = nextRandom(random) * totalWeight;
  let boundary = 0;

  for (const difficulty of ROUND_DIFFICULTIES) {
    boundary += weights[difficulty];

    if (roll < boundary) {
      return difficulty;
    }
  }

  return RoundDifficulty.Hard;
}

function validateLevelConfigs(configs: readonly LevelConfig[]): void {
  if (configs.length !== GAME_LEVELS.length) {
    throw new Error(`Exactly ${GAME_LEVELS.length} level configs are required.`);
  }

  configs.forEach((config, index) => {
    if (config.level !== GAME_LEVELS[index]) {
      throw new Error('Level configs must be ordered from level 0 through 10.');
    }

    for (const difficulty of ROUND_DIFFICULTIES) {
      validateWeight(config.weights[difficulty], difficulty);
    }
  });
}

function validatePools(
  pools: AnomalyPools,
  configs: readonly LevelConfig[],
): void {
  const anomalyIds = new Set<string>();

  for (const difficulty of ANOMALY_DIFFICULTIES) {
    const pool = pools[difficulty];
    const requiredByWeights = configs.some(
      (config) => config.weights[difficulty] > 0,
    );
    const requiredAfterClearRound =
      difficulty === RoundDifficulty.Hard &&
      configs.some(
        (config) =>
          config.level !== 0 &&
          config.weights[RoundDifficulty.None] > 0,
      );

    if (
      pool.length === 0 &&
      (requiredByWeights || requiredAfterClearRound)
    ) {
      throw new Error(`The ${difficulty} anomaly pool cannot be empty.`);
    }

    for (const anomaly of pool) {
      if (anomaly.difficulty !== difficulty) {
        throw new Error(
          `Anomaly "${anomaly.id}" is registered in the wrong difficulty pool.`,
        );
      }

      if (anomalyIds.has(anomaly.id)) {
        throw new Error(`Duplicate anomaly id "${anomaly.id}".`);
      }

      anomalyIds.add(anomaly.id);
    }
  }
}

export class GameSessionGenerator {
  private readonly pools: AnomalyPools;
  private readonly configs: readonly LevelConfig[];
  private readonly random: RandomSource;

  public constructor(options: GameSessionGeneratorOptions) {
    this.pools = options.anomalyPools;
    this.configs = options.levelConfigs ?? DEFAULT_LEVEL_CONFIGS;
    this.random = options.random ?? mathRandomSource;

    validateLevelConfigs(this.configs);
    validatePools(this.pools, this.configs);
  }

  public generate(): GameSession {
    const bags: Record<
      AnomalyDifficulty,
      ShuffleBag<Anomaly> | undefined
    > = {
      [RoundDifficulty.Easy]: this.createBag(RoundDifficulty.Easy),
      [RoundDifficulty.Medium]: this.createBag(RoundDifficulty.Medium),
      [RoundDifficulty.Hard]: this.createBag(RoundDifficulty.Hard),
    };

    let consecutiveClearRounds = 0;
    const rounds: GameRound[] = this.configs.map((config) => {
      const selectedDifficulty = selectWeightedDifficulty(
        config.weights,
        this.random,
      );
      const difficulty = consecutiveClearRounds >= 2
        ? RoundDifficulty.Hard
        : selectedDifficulty;

      if (config.level !== 0) {
        consecutiveClearRounds = difficulty === RoundDifficulty.None
          ? consecutiveClearRounds + 1
          : 0;
      }

      if (difficulty === RoundDifficulty.None) {
        return createGameRound(config.level, difficulty, null);
      }

      const anomaly = bags[difficulty]?.draw();

      if (anomaly === undefined) {
        throw new Error(`No anomaly is available for ${difficulty} difficulty.`);
      }

      return createGameRound(config.level, difficulty, anomaly);
    });

    return new GameSession(rounds);
  }

  private createBag(
    difficulty: AnomalyDifficulty,
  ): ShuffleBag<Anomaly> | undefined {
    const anomalies = this.pools[difficulty];

    return anomalies.length > 0
      ? new ShuffleBag(anomalies, this.random, (anomaly) => anomaly.id)
      : undefined;
  }
}

export function generateGameSession(
  options: GameSessionGeneratorOptions,
): GameSession {
  return new GameSessionGenerator(options).generate();
}
