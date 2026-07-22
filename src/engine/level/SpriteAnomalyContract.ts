import { publicAssetUrl } from '../../shared/assets/publicAssetUrl';

export const SPRITE_ANOMALY_ROOT_NAME = "SpriteAnomalyPoints";
export const SPRITE_ANOMALY_ID_PREFIX = "sprite_anomaly:";
export const SPRITE_ANOMALY_TEXTURE_URL = publicAssetUrl(
  "assets/sprites/anomalies/2.png",
);

export const SPRITE_ANOMALY_SCALE = Object.freeze({
  width: 0.5,
  height: 0.5,
});

export function createSpriteAnomalyId(targetObjectId: string): string {
  return `${SPRITE_ANOMALY_ID_PREFIX}${targetObjectId}`;
}

export function isSpriteAnomalyId(id: string | null): boolean {
  return id?.startsWith(SPRITE_ANOMALY_ID_PREFIX) ?? false;
}
