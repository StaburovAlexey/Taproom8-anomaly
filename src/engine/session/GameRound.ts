import type { Anomaly } from '../anomaly/Anomaly';
import {
  GAME_LEVELS,
  type GameLevel,
} from '../../shared/config/gameplay';
import {
  isAnomalyDifficulty,
  RoundDifficulty,
} from './RoundDifficulty';

export const GAME_SESSION_ROUND_COUNT = GAME_LEVELS.length;

export { GAME_LEVELS, type GameLevel };

export interface GameRound {
  readonly level: GameLevel;
  readonly difficulty: RoundDifficulty;
  readonly anomaly: Anomaly | null;
  readonly hasAnomaly: boolean;
}

export function createGameRound(
  level: GameLevel,
  difficulty: RoundDifficulty,
  anomaly: Anomaly | null,
): GameRound {
  if (difficulty === RoundDifficulty.None && anomaly !== null) {
    throw new Error('A none round cannot contain an anomaly.');
  }

  if (isAnomalyDifficulty(difficulty)) {
    if (anomaly === null) {
      throw new Error(`${difficulty} round requires an anomaly.`);
    }

    if (anomaly.difficulty !== difficulty) {
      throw new Error(
        `Anomaly "${anomaly.id}" difficulty does not match its round.`,
      );
    }
  }

  return Object.freeze({
    level,
    difficulty,
    anomaly,
    hasAnomaly: anomaly !== null,
  });
}
