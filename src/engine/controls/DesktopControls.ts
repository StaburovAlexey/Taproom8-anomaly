import {
  gameEventBus,
  type EventBus,
  type GameEventMap,
  type Vector2Value,
} from '../../shared/events';

const MOVEMENT_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);
const SPRINT_KEYS = new Set(['ShiftLeft', 'ShiftRight']);

export class DesktopControls {
  private readonly element: HTMLElement;
  private readonly eventBus: EventBus<GameEventMap>;
  private readonly pressedKeys = new Set<string>();
  private connected = false;
  private lookX = 0;
  private lookY = 0;
  private interactionRequested = false;

  public constructor(
    element: HTMLElement,
    eventBus: EventBus<GameEventMap> = gameEventBus,
  ) {
    this.element = element;
    this.eventBus = eventBus;
  }

  public get pointerLocked(): boolean {
    return document.pointerLockElement === this.element;
  }

  public connect(): void {
    if (this.connected) {
      return;
    }
    this.connected = true;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    this.element.addEventListener('click', this.handleClick);
  }

  public disconnect(): void {
    if (!this.connected) {
      return;
    }
    const wasPointerLocked = this.pointerLocked;
    if (wasPointerLocked) {
      document.exitPointerLock();
    }
    this.connected = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    this.element.removeEventListener('click', this.handleClick);
    this.reset();
    if (wasPointerLocked) {
      this.eventBus.emit('player:pointer-lock', { locked: false });
    }
  }

  public getMovement(): Vector2Value {
    if (!this.pointerLocked) {
      return { x: 0, y: 0 };
    }

    const x = Number(this.pressedKeys.has('KeyD')) - Number(this.pressedKeys.has('KeyA'));
    const y = Number(this.pressedKeys.has('KeyW')) - Number(this.pressedKeys.has('KeyS'));
    return { x, y };
  }

  public get sprinting(): boolean {
    return this.pointerLocked && (
      this.pressedKeys.has('ShiftLeft')
      || this.pressedKeys.has('ShiftRight')
    );
  }

  public consumeLookDelta(): Vector2Value {
    const delta = { x: this.lookX, y: this.lookY };
    this.lookX = 0;
    this.lookY = 0;
    return delta;
  }

  public consumeInteraction(): boolean {
    if (!this.pointerLocked) {
      this.interactionRequested = false;
      return false;
    }

    const requested = this.interactionRequested;
    this.interactionRequested = false;
    return requested;
  }

  public async requestPointerLock(): Promise<void> {
    if (this.pointerLocked) {
      return;
    }

    try {
      await this.element.requestPointerLock();
    } catch (error: unknown) {
      this.eventBus.emit('engine:error', {
        error: error instanceof Error ? error : new Error(String(error)),
        context: 'Requesting pointer lock.',
        recoverable: true,
      });
    }
  }

  public releasePointerLock(): void {
    if (this.pointerLocked) {
      document.exitPointerLock();
    }
  }

  public dispose(): void {
    this.disconnect();
  }

  private reset(): void {
    this.pressedKeys.clear();
    this.lookX = 0;
    this.lookY = 0;
    this.interactionRequested = false;
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (MOVEMENT_KEYS.has(event.code) || SPRINT_KEYS.has(event.code)) {
      this.pressedKeys.add(event.code);
      event.preventDefault();
      return;
    }

    if (event.code === 'KeyE' && !event.repeat && this.pointerLocked) {
      this.interactionRequested = true;
      event.preventDefault();
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (MOVEMENT_KEYS.has(event.code) || SPRINT_KEYS.has(event.code)) {
      this.pressedKeys.delete(event.code);
      event.preventDefault();
    }
  };

  private readonly handleBlur = (): void => {
    this.pressedKeys.clear();
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (!this.pointerLocked) {
      return;
    }
    this.lookX += event.movementX;
    this.lookY += event.movementY;
  };

  private readonly handlePointerLockChange = (): void => {
    this.eventBus.emit('player:pointer-lock', { locked: this.pointerLocked });
    if (!this.pointerLocked) {
      this.pressedKeys.clear();
      this.lookX = 0;
      this.lookY = 0;
      this.interactionRequested = false;
    }
  };

  private readonly handleClick = (): void => {
    if (this.pointerLocked) {
      this.interactionRequested = true;
      return;
    }
    void this.requestPointerLock();
  };
}
