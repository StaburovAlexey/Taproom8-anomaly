import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  PaymentsGateway,
  PaymentsSnapshot,
  YandexProduct,
  YandexPurchase,
} from '@/platform/yandex'

import { BOOST_PRODUCT_IDS, useBoostsStore } from './boosts.store'

function product(id: string, price = '10 YAN'): YandexProduct {
  return {
    id,
    title: id,
    description: id,
    imageURI: '',
    price,
    priceValue: '10',
    priceCurrencyCode: 'YAN',
    getPriceCurrencyImage: () => '',
  }
}

function purchase(productID: string): YandexPurchase {
  return {
    productID,
    purchaseToken: `${productID}-token`,
    developerPayload: '',
  }
}

function gateway(snapshot: PaymentsSnapshot | null): PaymentsGateway {
  return {
    load: vi.fn(async () => snapshot),
    purchase: vi.fn(async (productId) => purchase(productId)),
  }
}

describe('boosts store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('restores permanent purchases and derives a two-chance capacity', async () => {
    const store = useBoostsStore()
    const payments = gateway({
      catalog: [
        product(BOOST_PRODUCT_IDS.extraChanceSlot),
        product(BOOST_PRODUCT_IDS.speed),
      ],
      purchases: [
        purchase(BOOST_PRODUCT_IDS.extraChanceSlot),
        purchase(BOOST_PRODUCT_IDS.speed),
      ],
    })

    await store.initialize(payments)

    expect(store.paymentsStatus).toBe('ready')
    expect(store.ownsExtraChanceSlot).toBe(true)
    expect(store.ownsSpeedBoost).toBe(true)
    expect(store.mistakeChanceCapacity).toBe(2)
  })

  it('requires one rewarded callback for each chance and respects capacity', () => {
    const store = useBoostsStore()
    store.ownedProductIds = [BOOST_PRODUCT_IDS.extraChanceSlot]

    expect(store.beginRewardedAd()).toBe(true)
    store.finishRewardedAd(true)
    expect(store.preparationMistakeChances).toBe(1)
    expect(store.beginRewardedAd()).toBe(true)
    store.finishRewardedAd(true)
    expect(store.preparationMistakeChances).toBe(2)
    expect(store.beginRewardedAd()).toBe(false)

    expect(store.activateRun()).toMatchObject({
      mistakeChances: 2,
      speedMultiplier: 1,
    })
  })

  it('does not grant a chance when a rewarded ad closes early', () => {
    const store = useBoostsStore()

    expect(store.beginRewardedAd()).toBe(true)
    store.finishRewardedAd(false)

    expect(store.preparationMistakeChances).toBe(0)
    expect(store.canWatchRewardedAd).toBe(true)
  })

  it('activates purchased speed for a run', () => {
    const store = useBoostsStore()
    store.ownedProductIds = [BOOST_PRODUCT_IDS.speed]
    store.setSpeedBoostEnabled(true)

    expect(store.activateRun()).toEqual({
      mistakeChances: 0,
      speedMultiplier: 1.5,
    })
  })

  it('marks a successful purchase as owned', async () => {
    const store = useBoostsStore()
    const payments = gateway({ catalog: [], purchases: [] })

    await expect(
      store.purchaseBoost(BOOST_PRODUCT_IDS.speed, payments),
    ).resolves.toBe(true)
    expect(store.ownsSpeedBoost).toBe(true)
  })
})
