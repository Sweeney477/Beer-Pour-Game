
export type GamePhase = "IDLE" | "TUTORIAL" | "COUNTDOWN" | "RUNNING" | "PAUSED" | "ROUND_END" | "GAME_OVER" | "HOW_TO_PLAY" | "SETTINGS" | "LEVEL_UP";
export type GameMode = "CLASSIC" | "TIMED";

export type CustomerType = "REGULAR" | "IMPATIENT" | "PERFECTIONIST" | "HALF_POUR" | "PITCHER" | "FOAM_HATER" | "PATIENT";

export type ShiftType = "OPENING" | "HAPPY_HOUR" | "DINNER" | "CLOSING" | "AFTER_HOURS";

export interface Customer {
  id: string;
  type: CustomerType;
  beerId: string;
  targetFill: number;
  tolerancePerfect: number;
  toleranceGood: number;
  patienceMaxMs: number;
  patienceRemainingMs: number;
  avatarUrl: string;
  isVip?: boolean;
  requestedFoam?: number; // 0 to 1 scale
}

export type TapStatus = "OK" | "STICKY" | "BLOWN";

export interface Tap {
  id: string;
  name: string;
  status: TapStatus;
  flowRate: number;
  color: string;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  cost: number;
  icon: string;
}

export interface RunSummary {
  score: number;
  tips: number;
  perfects: number;
  overflows: number;
  maxCombo: number;
  mode: GameMode;
}

export interface Toast {
  id: string;
  message: string;
  type: 'PERFECT' | 'GOOD' | 'BAD' | 'OVERFLOW' | 'WALKOUT' | 'FRENZY' | 'LEVEL_UP' | 'WRONG_BEER';
}
