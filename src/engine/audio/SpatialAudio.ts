export interface SpatialPosition {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface SpatialListenerTransform {
  readonly position: SpatialPosition;
  readonly forward: SpatialPosition;
  readonly up: SpatialPosition;
}

export interface SpatialSourceOptions {
  readonly position: SpatialPosition;
  readonly orientation?: SpatialPosition;
  readonly panningModel?: PanningModelType;
  readonly distanceModel?: DistanceModelType;
  readonly refDistance?: number;
  readonly maxDistance?: number;
  readonly rolloffFactor?: number;
  readonly coneInnerAngle?: number;
  readonly coneOuterAngle?: number;
  readonly coneOuterGain?: number;
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function nonNegativeOr(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, value);
}

function setAudioParam(
  parameter: AudioParam,
  value: number,
  time: number,
): void {
  parameter.cancelScheduledValues(time);
  parameter.setValueAtTime(value, time);
}

export class SpatialAudio {
  public constructor(private readonly context: AudioContext) {}

  public createPanner(options: SpatialSourceOptions): PannerNode {
    const panner = this.context.createPanner();
    panner.panningModel = options.panningModel ?? 'HRTF';
    panner.distanceModel = options.distanceModel ?? 'inverse';
    panner.refDistance = Math.max(
      0.0001,
      nonNegativeOr(options.refDistance, 1),
    );
    panner.maxDistance = Math.max(
      panner.refDistance,
      nonNegativeOr(options.maxDistance, 40),
    );
    panner.rolloffFactor = nonNegativeOr(options.rolloffFactor, 1);
    panner.coneInnerAngle = nonNegativeOr(options.coneInnerAngle, 360);
    panner.coneOuterAngle = nonNegativeOr(options.coneOuterAngle, 360);
    panner.coneOuterGain = Math.min(
      1,
      nonNegativeOr(options.coneOuterGain, 0),
    );

    this.setPosition(panner, options.position);
    if (options.orientation !== undefined) {
      this.setOrientation(panner, options.orientation);
    }
    return panner;
  }

  public setPosition(panner: PannerNode, position: SpatialPosition): void {
    const time = this.context.currentTime;
    setAudioParam(panner.positionX, finiteOr(position.x, 0), time);
    setAudioParam(panner.positionY, finiteOr(position.y, 0), time);
    setAudioParam(panner.positionZ, finiteOr(position.z, 0), time);
  }

  public setOrientation(
    panner: PannerNode,
    orientation: SpatialPosition,
  ): void {
    const time = this.context.currentTime;
    setAudioParam(panner.orientationX, finiteOr(orientation.x, 0), time);
    setAudioParam(panner.orientationY, finiteOr(orientation.y, 0), time);
    setAudioParam(panner.orientationZ, finiteOr(orientation.z, -1), time);
  }

  public setListenerTransform(transform: SpatialListenerTransform): void {
    const listener = this.context.listener;
    const time = this.context.currentTime;

    setAudioParam(
      listener.positionX,
      finiteOr(transform.position.x, 0),
      time,
    );
    setAudioParam(
      listener.positionY,
      finiteOr(transform.position.y, 0),
      time,
    );
    setAudioParam(
      listener.positionZ,
      finiteOr(transform.position.z, 0),
      time,
    );
    setAudioParam(listener.forwardX, finiteOr(transform.forward.x, 0), time);
    setAudioParam(listener.forwardY, finiteOr(transform.forward.y, 0), time);
    setAudioParam(listener.forwardZ, finiteOr(transform.forward.z, -1), time);
    setAudioParam(listener.upX, finiteOr(transform.up.x, 0), time);
    setAudioParam(listener.upY, finiteOr(transform.up.y, 1), time);
    setAudioParam(listener.upZ, finiteOr(transform.up.z, 0), time);
  }
}
