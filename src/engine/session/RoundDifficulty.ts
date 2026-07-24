export enum RoundDifficulty {
  None = 'none',
  Easy = 'easy',
  Medium = 'medium',
  Hard = 'hard',
}

export type AnomalyDifficulty = Exclude<
  RoundDifficulty,
  RoundDifficulty.None
>;

export const ROUND_DIFFICULTIES = [
  RoundDifficulty.None,
  RoundDifficulty.Easy,
  RoundDifficulty.Medium,
  RoundDifficulty.Hard,
] as const;

export const ANOMALY_DIFFICULTIES = [
  RoundDifficulty.Easy,
  RoundDifficulty.Medium,
  RoundDifficulty.Hard,
] as const satisfies readonly AnomalyDifficulty[];

export function isAnomalyDifficulty(
  difficulty: RoundDifficulty,
): difficulty is AnomalyDifficulty {
  return (
    difficulty === RoundDifficulty.Easy ||
    difficulty === RoundDifficulty.Medium ||
    difficulty === RoundDifficulty.Hard
  );
}
