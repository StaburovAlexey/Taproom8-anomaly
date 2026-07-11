export type GraphicsQuality = 'normal' | 'potato';
export type DoorId = 'anomaly' | 'no-anomaly';
export type DoorObjectName = 'CorrectDoor' | 'WrongDoor';
export type LevelSource = 'gltf' | 'procedural';

export interface Vector2Value {
  readonly x: number;
  readonly y: number;
}

export interface Vector3Value extends Vector2Value {
  readonly z: number;
}

export interface LoadingProgressEvent {
  readonly progress: number;
  readonly loaded: number;
  readonly total: number;
  readonly url?: string;
  readonly stage: 'asset' | 'level';
}

export interface EngineReadyEvent {
  readonly levelSource: LevelSource;
  readonly levelUrl: string;
  readonly usedFallback: boolean;
}

export interface EngineErrorEvent {
  readonly error: Error;
  readonly context: string;
  readonly recoverable: boolean;
}

export interface MovementEvent {
  readonly position: Vector3Value;
}

export interface DoorSelectedEvent {
  readonly answer: boolean;
  readonly doorId: DoorId;
  readonly objectName: DoorObjectName;
}

export interface InteractionHintEvent {
  readonly visible: boolean;
  readonly messageKey: string | null;
  readonly objectName: string | null;
}

export interface InteractiveDoorOpenedEvent {
  readonly objectName: string;
}

export interface PointerLockEvent {
  readonly locked: boolean;
}

export type RoundDifficulty = 'None' | 'Easy' | 'Medium' | 'Hard';

export interface RoundStartedEvent {
  readonly level: number;
  readonly difficulty: RoundDifficulty;
  readonly anomalyId: string | null;
  readonly hasAnomaly: boolean;
}

export interface RoundResolvedEvent {
  readonly correct: boolean;
  readonly selectedAnswer: boolean;
  readonly nextLevel: number;
  readonly completed: boolean;
}

export interface GameEventMap {
  'ui:unlock-audio': void;
  'ui:start-game': void;
  'ui:return-menu': void;
  'ui:graphics-changed': { readonly quality: GraphicsQuality };
  'ui:mobile-move': Vector2Value;
  'ui:mobile-look': Vector2Value;
  'ui:mobile-interact': void;
  'ui:request-pointer-lock': void;

  'loading:progress': LoadingProgressEvent;
  'engine:ready': EngineReadyEvent;
  'engine:error': EngineErrorEvent;
  'level:loaded': {
    readonly source: LevelSource;
    readonly url: string;
  };

  'player:movement-started': MovementEvent;
  'player:movement-stopped': MovementEvent;
  'player:pointer-lock': PointerLockEvent;

  'interaction:door-selected': DoorSelectedEvent;
  'interaction:door-opened': DoorSelectedEvent;
  'interaction:interactive-door-opened': InteractiveDoorOpenedEvent;
  'interaction:hint': InteractionHintEvent;

  'round:started': RoundStartedEvent;
  'round:resolved': RoundResolvedEvent;
}
