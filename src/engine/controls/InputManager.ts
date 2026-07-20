import {
  gameEventBus,
  type EventBus,
  type GameEventMap,
} from '../../shared/events';
import { DesktopControls } from './DesktopControls';
import { MobileControls } from './MobileControls';

export interface InputFrame {
  readonly movementX: number;
  readonly movementY: number;
  readonly lookDeltaX: number;
  readonly lookDeltaY: number;
  readonly sprint: boolean;
  readonly interact: boolean;
}

export interface InputManagerOptions {
  readonly mobileLookUnitsPerSecond?: number;
}

function clampMovement(x: number, y: number): readonly [number, number] {
  const length = Math.hypot(x, y);
  if (length <= 1) {
    return [x, y];
  }
  return [x / length, y / length];
}

export class InputManager {
  public readonly desktop: DesktopControls;
  public readonly mobile: MobileControls;

  private readonly mobileLookUnitsPerSecond: number;
  private readonly unsubscribers: (() => void)[];
  private connected = false;

  public constructor(
    element: HTMLElement,
    eventBus: EventBus<GameEventMap> = gameEventBus,
    options: InputManagerOptions = {},
  ) {
    this.desktop = new DesktopControls(element, eventBus);
    this.mobile = new MobileControls();
    this.mobileLookUnitsPerSecond = options.mobileLookUnitsPerSecond ?? 520;
    this.unsubscribers = [
      eventBus.on('ui:mobile-move', ({ x, y }) => this.mobile.setMovement(x, y)),
      eventBus.on('ui:mobile-look', ({ x, y }) => this.mobile.setLook(x, y)),
      eventBus.on('ui:mobile-interact', () => this.mobile.requestInteraction()),
    ];
  }

  public connect(): void {
    if (this.connected) {
      return;
    }
    this.connected = true;
    this.desktop.connect();
  }

  public disconnect(): void {
    if (!this.connected) {
      return;
    }
    this.connected = false;
    this.desktop.disconnect();
    this.mobile.reset();
  }

  public readFrame(deltaSeconds: number): InputFrame {
    const desktopMovement = this.desktop.getMovement();
    const mobileMovement = this.mobile.getMovement();
    const [movementX, movementY] = clampMovement(
      desktopMovement.x + mobileMovement.x,
      desktopMovement.y + mobileMovement.y,
    );
    const desktopLook = this.desktop.consumeLookDelta();
    const mobileLook = this.mobile.getLook();
    const mobileScale = this.mobileLookUnitsPerSecond * deltaSeconds;

    return {
      movementX,
      movementY,
      lookDeltaX: desktopLook.x + mobileLook.x * mobileScale,
      lookDeltaY: desktopLook.y + mobileLook.y * mobileScale,
      sprint: this.desktop.sprinting,
      interact: this.desktop.consumeInteraction() || this.mobile.consumeInteraction(),
    };
  }

  public dispose(): void {
    this.desktop.dispose();
    this.mobile.reset();
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers.length = 0;
  }
}
