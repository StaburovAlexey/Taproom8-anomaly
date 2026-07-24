export type UiScreen =
  | 'loading'
  | 'audioGate'
  | 'home'
  | 'preparation'
  | 'boostShop'
  | 'gameplay'
  | 'pause'
  | 'settings'
  | 'about'
  | 'completed'
  | 'error'

export type MenuScreen = 'home' | 'pause'
export type BoostShopReturnScreen = 'home' | 'preparation'

export type SessionUiState = 'none' | 'active' | 'completed'

export type CinematicTransitionPhase =
  | 'idle'
  | 'covering'
  | 'covered'
  | 'revealing'

export type CinematicTransitionIntent =
  | 'start-session'
  | 'advance-round'
  | 'abandon-session'
  | 'show-completed'
