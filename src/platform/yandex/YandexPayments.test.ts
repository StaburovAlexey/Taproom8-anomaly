import { describe, expect, it, vi } from 'vitest'

import type {
  YandexPaymentsApi,
  YandexProduct,
  YandexPurchase,
} from './YandexGamesSdk'
import { YandexPayments } from './YandexPayments'

const product: YandexProduct = {
  id: 'boost_speed_150',
  title: 'Speed',
  description: 'Speed',
  imageURI: '',
  price: '10 YAN',
  priceValue: '10',
  priceCurrencyCode: 'YAN',
  getPriceCurrencyImage: () => '',
}

const purchase: YandexPurchase = {
  productID: product.id,
  purchaseToken: 'token',
  developerPayload: '',
}

function paymentsApi(): YandexPaymentsApi {
  return {
    getCatalog: vi.fn(async () => [product]),
    getPurchases: vi.fn(async () => [purchase]),
    purchase: vi.fn(async () => purchase),
  }
}

describe('YandexPayments', () => {
  it('loads the catalog and permanent purchases together', async () => {
    const payments = paymentsApi()
    const gateway = new YandexPayments({
      getPayments: vi.fn(async () => payments),
    })

    await expect(gateway.load()).resolves.toEqual({
      catalog: [product],
      purchases: [purchase],
    })
    expect(payments.getCatalog).toHaveBeenCalledTimes(1)
    expect(payments.getPurchases).toHaveBeenCalledTimes(1)
  })

  it('returns unavailable outside Yandex Games', async () => {
    const gateway = new YandexPayments({
      getPayments: vi.fn(async () => null),
    })

    await expect(gateway.load()).resolves.toBeNull()
    await expect(gateway.purchase(product.id)).resolves.toBeNull()
  })
})
