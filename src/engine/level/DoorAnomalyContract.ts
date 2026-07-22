export interface DoorAnomalyDefinition {
  readonly id: string
  readonly targetObjectId: string
}

export interface TimedDoorAnomalyDefinition extends DoorAnomalyDefinition {
  readonly delaySeconds: number
}

export const UNLOCK_DOOR_001_ANOMALY: DoorAnomalyDefinition = Object.freeze({
  id: 'interactive_door:DOOR001:unlocked',
  targetObjectId: 'DOOR001',
})

export const AUTO_CLOSE_DOOR_005_ANOMALY: TimedDoorAnomalyDefinition = Object.freeze({
  id: 'interactive_door:DOOR005:auto_close',
  targetObjectId: 'DOOR005',
  delaySeconds: 20,
})

export const LOCKED_INTERACTIVE_DOOR_PANEL_IDS: ReadonlySet<string> = new Set([
  UNLOCK_DOOR_001_ANOMALY.targetObjectId,
])
