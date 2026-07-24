import { defineStore } from 'pinia'

import {
  yandexPayments,
  type PaymentsGateway,
  type YandexProduct,
} from '@/platform/yandex'
import type { RunBoostConfiguration } from '@/shared/events'

export const BOOST_PRODUCT_IDS = {
  extraChanceSlot: 'boost_extra_chance_slot',
  speed: 'boost_speed_150',
} as const

export type BoostProductId =
  typeof BOOST_PRODUCT_IDS[keyof typeof BOOST_PRODUCT_IDS]

export type PaymentsStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'unavailable'
  | 'error'

interface BoostsState {
  paymentsStatus: PaymentsStatus
  catalog: YandexProduct[]
  ownedProductIds: BoostProductId[]
  purchasingProductId: BoostProductId | null
  purchaseFailed: boolean
  rewardAdLoading: boolean
  preparationMistakeChances: number
  speedBoostEnabled: boolean
  activeMistakeChances: number
  activeMistakeChanceCapacity: number
  activeSpeedMultiplier: 1 | 1.5
}

const PRODUCT_IDS = new Set<BoostProductId>(Object.values(BOOST_PRODUCT_IDS))

function isBoostProductId(productId: string): productId is BoostProductId {
  return PRODUCT_IDS.has(productId as BoostProductId)
}

export const useBoostsStore = defineStore('boosts', {
  state: (): BoostsState => ({
    paymentsStatus: 'idle',
    catalog: [],
    ownedProductIds: [],
    purchasingProductId: null,
    purchaseFailed: false,
    rewardAdLoading: false,
    preparationMistakeChances: 0,
    speedBoostEnabled: true,
    activeMistakeChances: 0,
    activeMistakeChanceCapacity: 1,
    activeSpeedMultiplier: 1,
  }),
  getters: {
    ownsExtraChanceSlot: (state): boolean =>
      state.ownedProductIds.includes(BOOST_PRODUCT_IDS.extraChanceSlot),
    ownsSpeedBoost: (state): boolean =>
      state.ownedProductIds.includes(BOOST_PRODUCT_IDS.speed),
    mistakeChanceCapacity: (state): number =>
      state.ownedProductIds.includes(BOOST_PRODUCT_IDS.extraChanceSlot) ? 2 : 1,
    canWatchRewardedAd(): boolean {
      return !this.rewardAdLoading
        && this.preparationMistakeChances < this.mistakeChanceCapacity
    },
    preparationSpeedActive(): boolean {
      return this.ownsSpeedBoost && this.speedBoostEnabled
    },
  },
  actions: {
    async initialize(gateway: PaymentsGateway = yandexPayments): Promise<void> {
      if (this.paymentsStatus === 'loading') {
        return
      }
      this.paymentsStatus = 'loading'
      this.purchaseFailed = false
      try {
        const snapshot = await gateway.load()
        if (snapshot === null) {
          this.paymentsStatus = 'unavailable'
          return
        }
        this.catalog = [...snapshot.catalog]
        this.ownedProductIds = snapshot.purchases
          .map((purchase) => purchase.productID)
          .filter(isBoostProductId)
        this.paymentsStatus = 'ready'
      } catch {
        this.paymentsStatus = 'error'
      }
    },
    async purchaseBoost(
      productId: BoostProductId,
      gateway: PaymentsGateway = yandexPayments,
    ): Promise<boolean> {
      if (
        this.purchasingProductId !== null
        || this.ownedProductIds.includes(productId)
      ) {
        return false
      }
      this.purchasingProductId = productId
      this.purchaseFailed = false
      try {
        const purchase = await gateway.purchase(productId)
        if (purchase === null || purchase.productID !== productId) {
          this.purchaseFailed = true
          return false
        }
        if (!this.ownedProductIds.includes(productId)) {
          this.ownedProductIds.push(productId)
        }
        return true
      } catch {
        this.purchaseFailed = true
        return false
      } finally {
        this.purchasingProductId = null
      }
    },
    setSpeedBoostEnabled(enabled: boolean): void {
      this.speedBoostEnabled = this.ownsSpeedBoost && enabled
    },
    beginRewardedAd(): boolean {
      if (!this.canWatchRewardedAd) {
        return false
      }
      this.rewardAdLoading = true
      return true
    },
    finishRewardedAd(rewarded: boolean): void {
      if (!this.rewardAdLoading) {
        return
      }
      this.rewardAdLoading = false
      if (rewarded) {
        this.preparationMistakeChances = Math.min(
          this.mistakeChanceCapacity,
          this.preparationMistakeChances + 1,
        )
      }
    },
    activateRun(): RunBoostConfiguration {
      const configuration: RunBoostConfiguration = {
        mistakeChances: this.preparationMistakeChances,
        speedMultiplier: this.preparationSpeedActive ? 1.5 : 1,
      }
      this.activeMistakeChances = configuration.mistakeChances
      this.activeMistakeChanceCapacity = this.mistakeChanceCapacity
      this.activeSpeedMultiplier = configuration.speedMultiplier
      this.preparationMistakeChances = 0
      this.rewardAdLoading = false
      return configuration
    },
    setActiveMistakeChances(chances: number): void {
      this.activeMistakeChances = Math.min(
        this.activeMistakeChanceCapacity,
        Math.max(0, chances),
      )
    },
    endRun(): void {
      this.rewardAdLoading = false
      this.preparationMistakeChances = 0
      this.activeMistakeChances = 0
      this.activeMistakeChanceCapacity = this.mistakeChanceCapacity
      this.activeSpeedMultiplier = 1
    },
  },
})
