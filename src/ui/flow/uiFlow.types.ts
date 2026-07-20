export type UiScreen =
  | 'loading'
  | 'audioGate'
  | 'home'
  | 'gameplay'
  | 'pause'
  | 'settings'
  | 'about'
  | 'completed'
  | 'error'

export type MenuScreen = 'home' | 'pause'

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
