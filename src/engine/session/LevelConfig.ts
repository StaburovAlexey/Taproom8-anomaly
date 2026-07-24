import type { GameLevel } from './GameRound';
import { RoundDifficulty } from './RoundDifficulty';

export type DifficultyWeights = Readonly<Record<RoundDifficulty, number>>;

export interface LevelConfig {
  readonly level: GameLevel;
  readonly weights: DifficultyWeights;
}

function config(
  level: GameLevel,
  none: number,
  easy: number,
  medium: number,
  hard: number,
): LevelConfig {
  return Object.freeze({
    level,
    weights: Object.freeze({
      [RoundDifficulty.None]: none,
      [RoundDifficulty.Easy]: easy,
      [RoundDifficulty.Medium]: medium,
      [RoundDifficulty.Hard]: hard,
    }),
  });
}

export const DEFAULT_LEVEL_CONFIGS: readonly LevelConfig[] = Object.freeze([
  config(0, 100, 0, 0, 0),
  config(1, 30, 56, 14, 0),
  config(2, 30, 49, 17, 4),
  config(3, 30, 35, 28, 7),
  config(4, 30, 21, 35, 14),
  config(5, 30, 17, 35, 18),
  config(6, 30, 14, 35, 21),
  config(7, 30, 11, 31, 28),
  config(8, 30, 7, 28, 35),
]);
