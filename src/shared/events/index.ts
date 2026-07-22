export { EventBus, type EventHandler } from './EventBus';
export {
  type DevAnomalyOption,
  type DevNextAnomalySelection,
  type DoorId,
  type DoorObjectName,
  type DoorSelectedEvent,
  type EngineErrorEvent,
  type EngineReadyEvent,
  type GameEventMap,
  type GraphicsQuality,
  type InteractionHintEvent,
  type InteractiveDoorEvent,
  type LevelSource,
  type LevelAnomalyDefinition,
  type LevelAnomalyDifficulty,
  type LevelAnomalyKind,
  type LoadingProgressEvent,
  type MovementEvent,
  type PointerLockEvent,
  type RoundDifficulty,
  type RoundResolvedEvent,
  type RoundStartedEvent,
  type Vector2Value,
  type Vector3Value,
} from './GameEvents';

import { EventBus } from './EventBus';
import type { GameEventMap } from './GameEvents';

export const gameEventBus = new EventBus<GameEventMap>();
