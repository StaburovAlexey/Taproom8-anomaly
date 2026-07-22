import { describe, expect, it } from 'vitest';

import type { Anomaly } from '../anomaly';
import { GameSessionGenerator, type AnomalyPools } from './GameSessionGenerator';
import { GAME_LEVELS } from './GameRound';
import type { DifficultyWeights, LevelConfig } from './LevelConfig';
import { DEFAULT_LEVEL_CONFIGS } from './LevelConfig';
import { SeededRandom } from './Random';
import {
  RoundDifficulty,
  type AnomalyDifficulty,
} from './RoundDifficulty';
import { ShuffleBag } from './ShuffleBag';

function fakeAnomaly(
  id: string,
  difficulty: AnomalyDifficulty,
): Anomaly {
  return {
    id,
    difficulty,
    targetObjectId: `${id}_target`,
    isApplied: false,
    apply: () => undefined,
    reset: () => undefined,
  };
}

function weightsFor(difficulty: RoundDifficulty): DifficultyWeights {
  return {
    [RoundDifficulty.None]: difficulty === RoundDifficulty.None ? 1 : 0,
    [RoundDifficulty.Easy]: difficulty === RoundDifficulty.Easy ? 1 : 0,
    [RoundDifficulty.Medium]: difficulty === RoundDifficulty.Medium ? 1 : 0,
    [RoundDifficulty.Hard]: difficulty === RoundDifficulty.Hard ? 1 : 0,
  };
}

function configsFor(difficulty: RoundDifficulty): readonly LevelConfig[] {
  return GAME_LEVELS.map((level) => ({
    level,
    weights: weightsFor(difficulty),
  }));
}

function buildPools(easyCount = 2): AnomalyPools {
  return {
    [RoundDifficulty.Easy]: Array.from({ length: easyCount }, (_, index) =>
      fakeAnomaly(`easy_${index}`, RoundDifficulty.Easy),
    ),
    [RoundDifficulty.Medium]: [
      fakeAnomaly('medium_0', RoundDifficulty.Medium),
      fakeAnomaly('medium_1', RoundDifficulty.Medium),
    ],
    [RoundDifficulty.Hard]: [
      fakeAnomaly('hard_0', RoundDifficulty.Hard),
      fakeAnomaly('hard_1', RoundDifficulty.Hard),
    ],
  };
}

describe('ShuffleBag', () => {
  it('draws a full unique cycle and avoids a boundary repeat', () => {
    const bag = new ShuffleBag(['a', 'b', 'c'], new SeededRandom('bag'));
    const firstCycle = [bag.draw(), bag.draw(), bag.draw()];
    const firstOfNextCycle = bag.draw();

    expect(new Set(firstCycle).size).toBe(3);
    expect(firstOfNextCycle).not.toBe(firstCycle.at(-1));
  });
});

describe('GameSessionGenerator', () => {
  it('keeps level zero clear and gives every later level a 30% clear chance', () => {
    expect(DEFAULT_LEVEL_CONFIGS[0]?.weights[RoundDifficulty.None]).toBe(100);
    for (const config of DEFAULT_LEVEL_CONFIGS.slice(1)) {
      expect(config.weights[RoundDifficulty.None]).toBe(30);
      expect(Object.values(config.weights).reduce((sum, weight) => sum + weight, 0)).toBe(100);
    }
  });

  it('forces a hard anomaly only after two consecutive clear non-zero levels', () => {
    const session = new GameSessionGenerator({
      anomalyPools: buildPools(),
      levelConfigs: configsFor(RoundDifficulty.None),
      random: new SeededRandom('forced-hard-after-clear'),
    }).generate();

    expect(session.rounds.map((round) => round.difficulty)).toEqual([
      RoundDifficulty.None,
      RoundDifficulty.None,
      RoundDifficulty.None,
      RoundDifficulty.Hard,
      RoundDifficulty.None,
      RoundDifficulty.None,
      RoundDifficulty.Hard,
      RoundDifficulty.None,
      RoundDifficulty.None,
    ]);
  });

  it('allows the final level to be clear', () => {
    const configs = GAME_LEVELS.map((level) => ({
      level,
      weights: weightsFor(
        level === 0 || level === 8
          ? RoundDifficulty.None
          : RoundDifficulty.Hard,
      ),
    }));
    const session = new GameSessionGenerator({
      anomalyPools: buildPools(),
      levelConfigs: configs,
      random: new SeededRandom('clear-final-level'),
    }).generate();

    expect(session.rounds.at(-1)?.difficulty).toBe(RoundDifficulty.None);
  });

  it('generates nine deterministic weighted rounds from an injected RNG', () => {
    const first = new GameSessionGenerator({
      anomalyPools: buildPools(),
      random: new SeededRandom('session-seed'),
    }).generate();
    const second = new GameSessionGenerator({
      anomalyPools: buildPools(),
      random: new SeededRandom('session-seed'),
    }).generate();

    const signature = (session: typeof first) =>
      session.rounds.map((round) => [
        round.level,
        round.difficulty,
        round.anomaly?.id ?? null,
      ]);

    expect(first.rounds).toHaveLength(9);
    expect(first.rounds[0]).toMatchObject({
      level: 0,
      difficulty: RoundDifficulty.None,
      anomaly: null,
      hasAnomaly: false,
    });
    expect(signature(first)).toEqual(signature(second));
  });

  it('does not repeat an anomaly before its shuffle bag is exhausted', () => {
    const session = new GameSessionGenerator({
      anomalyPools: buildPools(9),
      levelConfigs: configsFor(RoundDifficulty.Easy),
      random: new SeededRandom('unique-anomalies'),
    }).generate();
    const ids = session.rounds.map((round) => round.anomaly?.id);

    expect(new Set(ids).size).toBe(9);
  });
});

describe('GameSession progress', () => {
  it('can override the current non-zero round without changing progress', () => {
    const session = new GameSessionGenerator({
      anomalyPools: buildPools(),
      levelConfigs: configsFor(RoundDifficulty.None),
      random: new SeededRandom('override-round'),
    }).generate();
    const anomaly = fakeAnomaly('forced_easy', RoundDifficulty.Easy);

    session.evaluateAnswer(false);
    session.overrideCurrentRound(anomaly);

    expect(session.currentRound).toMatchObject({
      level: 1,
      difficulty: RoundDifficulty.Easy,
      anomaly,
      hasAnomaly: true,
    });
    expect(session.evaluateAnswer(true).isCorrect).toBe(true);
    expect(session.currentLevel).toBe(2);
  });

  it('evaluates has-anomaly answers and resets a mistake to level one', () => {
    const session = new GameSessionGenerator({
      anomalyPools: buildPools(10),
      levelConfigs: configsFor(RoundDifficulty.Easy),
      random: new SeededRandom(7),
    }).generate();

    const first = session.evaluateAnswer(true);
    const second = session.evaluateAnswer(true);
    const mistake = session.evaluateAnswer(false);

    expect(first.isCorrect).toBe(true);
    expect(first.currentLevel).toBe(1);
    expect(second.currentLevel).toBe(2);
    expect(mistake).toMatchObject({
      isCorrect: false,
      expectedHasAnomaly: true,
      answeredHasAnomaly: false,
      currentLevel: 0,
      resetToFirstLevel: true,
    });
  });

  it('treats false as the correct answer for a none round', () => {
    const session = new GameSessionGenerator({
      anomalyPools: buildPools(),
      levelConfigs: configsFor(RoundDifficulty.None),
      random: new SeededRandom(1),
    }).generate();

    expect(session.currentRound?.hasAnomaly).toBe(false);
    expect(session.evaluateAnswer(false).isCorrect).toBe(true);
  });

  it('completes after nine correct answers and can restart in memory', () => {
    const session = new GameSessionGenerator({
      anomalyPools: buildPools(10),
      levelConfigs: configsFor(RoundDifficulty.Easy),
      random: new SeededRandom(42),
    }).generate();

    for (let answer = 0; answer < 9; answer += 1) {
      session.evaluateAnswer(true);
    }

    expect(session.completed).toBe(true);
    expect(session.currentLevel).toBeNull();

    session.restart();
    expect(session.completed).toBe(false);
    expect(session.currentLevel).toBe(0);
  });
});
