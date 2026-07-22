const TEXTURE_DIRECTORY = '/assets/models/textures/'

export interface TextureAnomalyUrls {
  readonly normalTextureUrl: string
  readonly anomalyTextureUrl: string
}

export function createTextureAnomalyUrls(
  assetBaseName: string,
): TextureAnomalyUrls {
  return {
    normalTextureUrl: `${TEXTURE_DIRECTORY}${assetBaseName}_v1.png`,
    anomalyTextureUrl: `${TEXTURE_DIRECTORY}${assetBaseName}_v2.png`,
  }
}

export const ANOMALY_TEXTURE_USER_DATA_KEY = 'anomalyTexture'
