export interface DoorAnomalyDefinition {
  readonly id: string
  readonly targetObjectId: string
}

export const UNLOCK_DOOR_001_ANOMALY: DoorAnomalyDefinition = Object.freeze({
  id: 'interactive_door:DOOR001:unlocked',
  targetObjectId: 'DOOR001',
})

export const LOCKED_INTERACTIVE_DOOR_PANEL_IDS: ReadonlySet<string> = new Set([
  UNLOCK_DOOR_001_ANOMALY.targetObjectId,
])
