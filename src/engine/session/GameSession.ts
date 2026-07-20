import {
  GAME_LEVELS,
  GAME_SESSION_ROUND_COUNT,
  type GameLevel,
  type GameRound,
} from './GameRound';

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
  public readonly rounds: readonly GameRound[];

  private currentIndex = 0;

  public constructor(rounds: readonly GameRound[]) {
    if (rounds.length !== GAME_SESSION_ROUND_COUNT) {
      throw new Error(
        `A game session must contain exactly ${GAME_SESSION_ROUND_COUNT} rounds.`,
      );
    }

    rounds.forEach((round, index) => {
      if (round.level !== GAME_LEVELS[index]) {
        throw new Error('Game session rounds must contain ordered levels 0–10.');
      }
    });

    this.rounds = Object.freeze([...rounds]);
  }

  public get currentRound(): GameRound | null {
    return this.rounds[this.currentIndex] ?? null;
  }

  public get currentLevel(): GameLevel | null {
    return this.currentRound?.level ?? null;
  }

  public get completed(): boolean {
    return this.currentIndex >= this.rounds.length;
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
