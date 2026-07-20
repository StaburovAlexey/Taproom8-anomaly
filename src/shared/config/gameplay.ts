export const GAME_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const
export const FINAL_GAME_LEVEL = GAME_LEVELS.at(-1) ?? 0

export type GameLevel = (typeof GAME_LEVELS)[number]
