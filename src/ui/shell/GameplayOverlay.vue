<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { Vector2Value } from '@/shared/events'
import GameHud from '@/ui/components/GameHud.vue'
import GameplayNotice from '@/ui/components/GameplayNotice.vue'
import MobileControls from '@/ui/components/MobileControls.vue'

const props = defineProps<{
  level: number
  totalLevels: number
  anomalyTargetObjectId: string | null
  interactionHint: string | null
  protectionNoticeVisible: boolean
  protectionNoticeKey: string | null
  mistakeChances: number
  mistakeChanceCapacity: number
}>()

defineEmits<{
  menu: []
  move: [axis: Vector2Value]
  look: [axis: Vector2Value]
  sprint: [sprinting: boolean]
  interact: []
}>()

const { t } = useI18n()
const interactionLabel = computed(() =>
  props.interactionHint === null
    ? t('common.open')
    : t(props.interactionHint),
)
const protectionNotice = computed(() =>
  props.protectionNoticeKey === null ? '' : t(props.protectionNoticeKey),
)
</script>

<template>
  <GameHud
    :level="level"
    :total-levels="totalLevels"
    :anomaly-target-object-id="anomalyTargetObjectId"
    :interaction-hint="interactionHint"
    :mistake-chances="mistakeChances"
    :mistake-chance-capacity="mistakeChanceCapacity"
    @menu="$emit('menu')"
  />
  <GameplayNotice
    :visible="protectionNoticeVisible"
    :message="protectionNotice"
  />
  <MobileControls
    :can-interact="interactionHint !== null"
    :interact-label="interactionLabel"
    @move="$emit('move', $event)"
    @look="$emit('look', $event)"
    @sprint="$emit('sprint', $event)"
    @interact="$emit('interact')"
  />
</template>
