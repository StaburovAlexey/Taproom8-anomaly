import {
  BaseAnomaly,
  type AnomalyOptions,
} from './Anomaly';

export interface VisibilityObjectLike {
  visible: boolean;
}

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export type Vector3Value = Readonly<Vector3Like>;

export interface PositionObjectLike {
  position: Vector3Like;
}

export interface RotationObjectLike {
  rotation: Vector3Like;
}

export interface MaterialObjectLike<TMaterial> {
  material: TMaterial;
}

export interface LightObjectLike<TColor> {
  intensity: number;
  color: TColor;
  visible: boolean;
}

function assertFiniteVector(value: Vector3Value, label: string): void {
  if (![value.x, value.y, value.z].every(Number.isFinite)) {
    throw new Error(`${label} must contain finite x, y, and z values.`);
  }
}

function copyVector(source: Vector3Value): Vector3Like {
  return { x: source.x, y: source.y, z: source.z };
}

function writeVector(target: Vector3Like, value: Vector3Value): void {
  target.x = value.x;
  target.y = value.y;
  target.z = value.z;
}

export class RemoveObjectAnomaly<
  TTarget extends VisibilityObjectLike = VisibilityObjectLike,
> extends BaseAnomaly<TTarget> {
  private previousVisibility = true;

  public constructor(options: AnomalyOptions<TTarget>) {
    super(options);
  }

  protected applyTo(target: TTarget): void {
    this.previousVisibility = target.visible;
    target.visible = false;
  }

  protected resetTarget(target: TTarget): void {
    target.visible = this.previousVisibility;
  }
}

export interface MoveObjectAnomalyOptions<
  TTarget extends PositionObjectLike,
> extends AnomalyOptions<TTarget> {
  readonly position: Vector3Value;
}

export class MoveObjectAnomaly<
  TTarget extends PositionObjectLike = PositionObjectLike,
> extends BaseAnomaly<TTarget> {
  private readonly anomalyPosition: Vector3Like;
  private originalPosition: Vector3Like = { x: 0, y: 0, z: 0 };

  public constructor(options: MoveObjectAnomalyOptions<TTarget>) {
    super(options);
    assertFiniteVector(options.position, 'Anomaly position');
    this.anomalyPosition = copyVector(options.position);
  }

  protected applyTo(target: TTarget): void {
    this.originalPosition = copyVector(target.position);
    writeVector(target.position, this.anomalyPosition);
  }

  protected resetTarget(target: TTarget): void {
    writeVector(target.position, this.originalPosition);
  }
}

export interface RotateObjectAnomalyOptions<
  TTarget extends RotationObjectLike,
> extends AnomalyOptions<TTarget> {
  readonly rotation: Vector3Value;
}

export class RotateObjectAnomaly<
  TTarget extends RotationObjectLike = RotationObjectLike,
> extends BaseAnomaly<TTarget> {
  private readonly anomalyRotation: Vector3Like;
  private originalRotation: Vector3Like = { x: 0, y: 0, z: 0 };

  public constructor(options: RotateObjectAnomalyOptions<TTarget>) {
    super(options);
    assertFiniteVector(options.rotation, 'Anomaly rotation');
    this.anomalyRotation = copyVector(options.rotation);
  }

  protected applyTo(target: TTarget): void {
    this.originalRotation = copyVector(target.rotation);
    writeVector(target.rotation, this.anomalyRotation);
  }

  protected resetTarget(target: TTarget): void {
    writeVector(target.rotation, this.originalRotation);
  }
}

export interface ChangeMaterialAnomalyOptions<TTarget extends object, TMaterial>
  extends AnomalyOptions<TTarget> {
  readonly material: TMaterial;
}

export class ChangeMaterialAnomaly<
  TMaterial,
  TTarget extends MaterialObjectLike<TMaterial> = MaterialObjectLike<TMaterial>,
> extends BaseAnomaly<TTarget> {
  private readonly anomalyMaterial: TMaterial;
  private originalMaterial: TMaterial | undefined;

  public constructor(
    options: ChangeMaterialAnomalyOptions<TTarget, TMaterial>,
  ) {
    super(options);
    this.anomalyMaterial = options.material;
  }

  protected applyTo(target: TTarget): void {
    this.originalMaterial = target.material;
    target.material = this.anomalyMaterial;
  }

  protected resetTarget(target: TTarget): void {
    target.material = this.originalMaterial as TMaterial;
    this.originalMaterial = undefined;
  }
}

export interface LightChange<TColor> {
  readonly intensity?: number;
  readonly color?: TColor;
  readonly visible?: boolean;
}

export interface LightChangeAnomalyOptions<
  TTarget extends object,
  TColor,
> extends AnomalyOptions<TTarget> {
  readonly change: LightChange<TColor>;
}

interface LightSnapshot<TColor> {
  readonly intensity: number;
  readonly color: TColor;
  readonly visible: boolean;
}

export class LightChangeAnomaly<
  TColor,
  TTarget extends LightObjectLike<TColor> = LightObjectLike<TColor>,
> extends BaseAnomaly<TTarget> {
  private readonly change: LightChange<TColor>;
  private readonly changesColor: boolean;
  private readonly changesVisible: boolean;
  private original: LightSnapshot<TColor> | undefined;

  public constructor(options: LightChangeAnomalyOptions<TTarget, TColor>) {
    super(options);

    this.changesColor = Object.prototype.hasOwnProperty.call(
      options.change,
      'color',
    );
    this.changesVisible = Object.prototype.hasOwnProperty.call(
      options.change,
      'visible',
    );

    if (
      options.change.intensity === undefined &&
      !this.changesColor &&
      !this.changesVisible
    ) {
      throw new Error('A light anomaly must change at least one property.');
    }

    if (
      options.change.intensity !== undefined &&
      !Number.isFinite(options.change.intensity)
    ) {
      throw new Error('A light anomaly intensity must be finite.');
    }

    if (
      this.changesVisible &&
      typeof options.change.visible !== 'boolean'
    ) {
      throw new Error('A light anomaly visibility must be a boolean.');
    }

    this.change = { ...options.change };
  }

  protected applyTo(target: TTarget): void {
    this.original = {
      intensity: target.intensity,
      color: target.color,
      visible: target.visible,
    };

    if (this.change.intensity !== undefined) {
      target.intensity = this.change.intensity;
    }

    if (this.changesColor) {
      target.color = this.change.color as TColor;
    }

    if (this.changesVisible) {
      target.visible = this.change.visible as boolean;
    }
  }

  protected resetTarget(target: TTarget): void {
    const original = this.original;

    if (original === undefined) {
      return;
    }

    target.intensity = original.intensity;
    target.color = original.color;
    target.visible = original.visible;
    this.original = undefined;
  }
}
