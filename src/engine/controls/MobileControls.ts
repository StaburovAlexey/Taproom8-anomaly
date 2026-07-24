import type { Vector2Value } from '../../shared/events';

function normalizeAxis(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(-1, Math.min(1, value));
}

export class MobileControls {
  private movementX = 0;
  private movementY = 0;
  private lookX = 0;
  private lookY = 0;
  private sprinting = false;
  private interactionRequested = false;

  public setMovement(x: number, y: number): void {
    this.movementX = normalizeAxis(x);
    this.movementY = normalizeAxis(y);
  }

  public setLook(x: number, y: number): void {
    this.lookX = normalizeAxis(x);
    this.lookY = normalizeAxis(y);
  }

  public setSprinting(sprinting: boolean): void {
    this.sprinting = sprinting;
  }

  public requestInteraction(): void {
    this.interactionRequested = true;
  }

  public getMovement(): Vector2Value {
    return { x: this.movementX, y: this.movementY };
  }

  public getLook(): Vector2Value {
    return { x: this.lookX, y: this.lookY };
  }

  public get isSprinting(): boolean {
    return this.sprinting;
  }

  public consumeInteraction(): boolean {
    const requested = this.interactionRequested;
    this.interactionRequested = false;
    return requested;
  }

  public reset(): void {
    this.setMovement(0, 0);
    this.setLook(0, 0);
    this.setSprinting(false);
    this.interactionRequested = false;
  }
}
