import {
  createGameRound,
  GAME_LEVELS,
  GAME_SESSION_ROUND_COUNT,
  type GameLevel,
  type GameRound,
} from './GameRound';
import type { Anomaly } from '../anomaly/Anomaly';
import { RoundDifficulty } from './RoundDifficulty';

export interface AnswerEvaluation {
  readonly isCorrect: boolean;
  readonly answeredHasAnomaly: boolean;
  readonly expectedHasAnomaly: boolean;
  readonly previousLevel: GameLevel;
  readonly currentLevel: GameLevel | null;
  readonly completed: boolean;
  readonly resetToFirstLevel: boolean;
}

export class GameSessionCompletedError extends Error {
  public constructor() {
    super('The game session is complete. Restart it before answering again.');
    this.name = 'GameSessionCompletedError';
  }
}

export class GameSession {
  private roundsState: readonly GameRound[];
  private currentIndex = 0;

  public constructor(rounds: readonly GameRound[]) {
    if (rounds.length !== GAME_SESSION_ROUND_COUNT) {
      throw new Error(
        `A game session must contain exactly ${GAME_SESSION_ROUND_COUNT} rounds.`,
      );
    }

    rounds.forEach((round, index) => {
      if (round.level !== GAME_LEVELS[index]) {
        throw new Error('Game session rounds must contain ordered levels 0–8.');
      }
    });

    this.roundsState = Object.freeze([...rounds]);
  }

  public get rounds(): readonly GameRound[] {
    return this.roundsState;
  }

  public get currentRound(): GameRound | null {
    return this.roundsState[this.currentIndex] ?? null;
  }

  public get currentLevel(): GameLevel | null {
    return this.currentRound?.level ?? null;
  }

  public get completed(): boolean {
    return this.currentIndex >= this.roundsState.length;
  }

  public overrideCurrentRound(anomaly: Anomaly | null): void {
    const currentRound = this.currentRound;
    if (currentRound === null) {
      throw new GameSessionCompletedError();
    }
    if (currentRound.level === 0 && anomaly !== null) {
      throw new Error('Level zero cannot contain an anomaly.');
    }

    const replacement = createGameRound(
      currentRound.level,
      anomaly?.difficulty ?? RoundDifficulty.None,
      anomaly,
    );
    this.roundsState = Object.freeze(this.roundsState.map((round, index) =>
      index === this.currentIndex ? replacement : round,
    ));
  }

  public evaluateAnswer(answeredHasAnomaly: boolean): AnswerEvaluation {
    const round = this.currentRound;

    if (round === null) {
      throw new GameSessionCompletedError();
    }

    const isCorrect = answeredHasAnomaly === round.hasAnomaly;
    const previousLevel = round.level;

    if (isCorrect) {
      this.currentIndex += 1;
    } else {
      this.currentIndex = 0;
    }

    return Object.freeze({
      isCorrect,
      answeredHasAnomaly,
      expectedHasAnomaly: round.hasAnomaly,
      previousLevel,
      currentLevel: this.currentLevel,
      completed: this.completed,
      resetToFirstLevel: !isCorrect,
    });
  }

  public restart(): void {
    this.currentIndex = 0;
  }
}
