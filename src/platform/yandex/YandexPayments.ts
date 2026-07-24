import {
  yandexGamesSdk,
  type YandexGamesSdk,
  type YandexProduct,
  type YandexPurchase,
} from './YandexGamesSdk'

export interface PaymentsSnapshot {
  readonly catalog: readonly YandexProduct[]
  readonly purchases: readonly YandexPurchase[]
}

export interface PaymentsGateway {
  load(): Promise<PaymentsSnapshot | null>
  purchase(productId: string): Promise<YandexPurchase | null>
}

export class YandexPayments implements PaymentsGateway {
  public constructor(
    private readonly sdk: Pick<YandexGamesSdk, 'getPayments'> = yandexGamesSdk,
  ) {}

  public async load(): Promise<PaymentsSnapshot | null> {
    const payments = await this.sdk.getPayments()
    if (payments === null) {
      return null
    }
    const [catalog, purchases] = await Promise.all([
      payments.getCatalog(),
      payments.getPurchases(),
    ])
    return {
      catalog,
      purchases,
    }
  }

  public async purchase(productId: string): Promise<YandexPurchase | null> {
    const payments = await this.sdk.getPayments()
    if (payments === null) {
      return null
    }
    return payments.purchase({ id: productId })
  }
}

export const yandexPayments = new YandexPayments()
