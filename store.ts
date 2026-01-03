
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GamePhase, GameMode, Customer, Tap, Upgrade, RunSummary, Toast, ShiftType } from './types';

interface GameState {
  highScoreClassic: number;
  highScoreTimed: number;
  totalTips: number;
  upgrades: Upgrade[];
  settings: {
    soundEnabled: boolean;
    hapticEnabled: boolean;
  };

  currentMode: GameMode;
  currentPhase: GamePhase;
  currentLevel: number;
  currentShift: ShiftType;
  score: number;
  tipsEarned: number;
  tipsThisShift: number;
  combo: number;
  maxCombo: number;
  perfects: number;
  overflows: number;
  customerQueue: Customer[];
  activeTapId: string;
  taps: Tap[];
  
  isPouring: boolean;
  currentFill: number;
  targetFill: number;
  
  frenzyMeter: number; // 0 to 100
  isFrenzyActive: boolean;
  
  walkouts: number;
  linePressure: number;
  roundTimeRemaining: number;
  lastRunSummary: RunSummary | null;
  toasts: Toast[];

  setPhase: (phase: GamePhase) => void;
  startNewGame: (mode: GameMode) => void;
  addScore: (points: number, tips: number, result: Toast['type']) => void;
  addWalkout: () => void;
  popCustomer: () => void;
  addCustomer: (c: Customer) => void;
  setPouring: (pouring: boolean) => void;
  setCurrentFill: (fill: number) => void;
  setActiveTap: (id: string) => void;
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
  purchaseUpgrade: (upgradeId: string) => void;
  updatePatience: (dt: number) => void;
  tickTimer: (dt: number) => void;
  saveRun: () => void;
  toggleSetting: (key: 'soundEnabled' | 'hapticEnabled') => void;
  activateFrenzy: () => void;
  getNextShiftThreshold: () => number;
  resetShiftTips: () => void;
  watchAdForTips: () => void;
}

const INITIAL_UPGRADES: Upgrade[] = [
  { id: 'steady_hand', name: 'Steady Hand', description: 'Reduces overfill penalties.', level: 0, maxLevel: 5, cost: 150, icon: 'front_hand' },
  { id: 'frenzy_boost', name: 'Party Lights', description: 'Frenzy lasts 2s longer.', level: 0, maxLevel: 5, cost: 250, icon: 'celebration' },
  { id: 'vip_magnet', name: 'Happy Hour', description: 'VIPs show up 20% more often.', level: 0, maxLevel: 5, cost: 400, icon: 'stars' },
  { id: 'auto_cooler', name: 'Auto Cooler', description: 'Line pressure builds slower.', level: 0, maxLevel: 5, cost: 350, icon: 'ac_unit' },
  { id: 'froth_master', name: 'Froth Master', description: 'Perfect zone is 15% wider.', level: 0, maxLevel: 5, cost: 500, icon: 'bubble_chart' },
];

export const SHIFTS: { name: ShiftType; threshold: number; desc: string }[] = [
    { name: 'OPENING', threshold: 0, desc: 'Quiet morning vibes. Take your time, everyone is chill.' },
    { name: 'HAPPY_HOUR', threshold: 1200, desc: 'The rush begins! Fast spawns and mixed patience.' },
    { name: 'DINNER', threshold: 4000, desc: 'Food is out. Customers are hungry and expect perfection.' },
    { name: 'CLOSING', threshold: 10000, desc: 'Last call! Everyone is cranky and in a hurry.' },
    { name: 'AFTER_HOURS', threshold: 25000, desc: 'Pure chaos. Only the strongest bartenders survive.' },
];

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      highScoreClassic: 0,
      highScoreTimed: 0,
      totalTips: 0,
      upgrades: INITIAL_UPGRADES,
      settings: { soundEnabled: true, hapticEnabled: true },
      currentMode: 'CLASSIC',
      currentPhase: 'IDLE',
      currentLevel: 1,
      currentShift: 'OPENING',
      score: 0,
      tipsEarned: 0,
      tipsThisShift: 0,
      combo: 0,
      maxCombo: 0,
      perfects: 0,
      overflows: 0,
      customerQueue: [],
      activeTapId: 'tap_1',
      taps: [
        { id: 'tap_1', name: 'Lager', status: 'OK', flowRate: 0.25, color: '#f49d25' },
        { id: 'tap_2', name: 'IPA', status: 'OK', flowRate: 0.35, color: '#d97706' },
        { id: 'tap_3', name: 'Stout', status: 'OK', flowRate: 0.18, color: '#31231a' },
      ],
      isPouring: false,
      currentFill: 0,
      targetFill: 0.8,
      frenzyMeter: 0,
      // Fixed: isFrenzyActive was incorrectly initialized with a type name
      isFrenzyActive: false,
      
      walkouts: 0,
      linePressure: 0,
      roundTimeRemaining: 60,
      lastRunSummary: null,
      toasts: [],

      setPhase: (phase) => set({ currentPhase: phase }),
      
      startNewGame: (mode) => set({
        currentMode: mode,
        currentPhase: 'COUNTDOWN',
        currentLevel: 1,
        currentShift: 'OPENING',
        score: 0,
        tipsEarned: 0,
        tipsThisShift: 0,
        combo: 0,
        maxCombo: 0,
        perfects: 0,
        overflows: 0,
        walkouts: 0,
        linePressure: 0,
        roundTimeRemaining: 60,
        currentFill: 0,
        customerQueue: [],
        toasts: [],
        frenzyMeter: 0,
        isFrenzyActive: false,
      }),

      setActiveTap: (id) => set({ activeTapId: id }),

      addToast: (message, type) => {
        const id = Math.random().toString();
        set((state) => ({ toasts: [{ id, message, type }, ...state.toasts].slice(0, 3) }));
        setTimeout(() => get().removeToast(id), 2000);
      },

      removeToast: (id) => set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) })),

      addScore: (points, tips, result) => set((state) => {
        const isPerfect = result === 'PERFECT';
        const isGood = result === 'GOOD';
        const isOverflow = result === 'OVERFLOW';
        const isWrong = result === 'WRONG_BEER';
        
        const currentCustomer = state.customerQueue[0];
        const isCurrentVip = currentCustomer?.isVip;
        const multiplier = (isCurrentVip ? 3 : 1) * (state.isFrenzyActive ? 2 : 1);
        
        const finalTips = isWrong ? 0 : tips * multiplier;
        const finalPoints = points * multiplier;
        
        const newScore = Math.max(0, state.score + finalPoints);
        const newCombo = (isPerfect || isGood) && !isWrong ? state.combo + 1 : 0;
        
        let newFrenzy = state.frenzyMeter + (isPerfect ? 25 : isGood ? 12 : 0);
        if (isWrong) newFrenzy = Math.max(0, state.frenzyMeter - 20);

        if (newFrenzy >= 100 && !state.isFrenzyActive) {
            get().activateFrenzy();
            newFrenzy = 0;
        }

        // Check for Level Up (Shift Change)
        let newShift = state.currentShift;
        let newLevel = state.currentLevel;
        let newPhase = state.currentPhase;
        const nextShiftIndex = SHIFTS.findIndex(s => s.name === state.currentShift) + 1;
        
        if (nextShiftIndex < SHIFTS.length && newScore >= SHIFTS[nextShiftIndex].threshold) {
            newShift = SHIFTS[nextShiftIndex].name;
            newLevel = nextShiftIndex + 1;
            newPhase = 'LEVEL_UP';
            newFrenzy = Math.min(100, newFrenzy + 40);
        }

        const toastMsg = isWrong ? "WRONG BREW!" : result;
        get().addToast(toastMsg, result);

        return {
          score: newScore,
          tipsEarned: state.tipsEarned + finalTips,
          tipsThisShift: state.tipsThisShift + finalTips,
          combo: newCombo,
          maxCombo: Math.max(state.maxCombo, newCombo),
          perfects: state.perfects + (isPerfect ? 1 : 0),
          overflows: state.overflows + (isOverflow ? 1 : 0),
          frenzyMeter: Math.min(100, Math.max(0, newFrenzy)),
          currentShift: newShift,
          currentLevel: newLevel,
          currentPhase: newPhase,
          isPouring: newPhase === 'LEVEL_UP' ? false : state.isPouring
        };
      }),

      activateFrenzy: () => {
          set({ isFrenzyActive: true });
          get().addToast("FRENZY!", "FRENZY");
          const frenzyBoost = get().upgrades.find(u => u.id === 'frenzy_boost')?.level || 0;
          setTimeout(() => set({ isFrenzyActive: false }), 8000 + (frenzyBoost * 2000));
      },

      addWalkout: () => set((state) => {
        const newWalkouts = state.walkouts + 1;
        get().addToast("WALKOUT!", "WALKOUT");
        
        if (state.currentMode === 'CLASSIC' && newWalkouts >= 3) {
            get().saveRun();
            return { walkouts: newWalkouts, currentPhase: 'GAME_OVER' };
        }
        
        const coolerLevel = state.upgrades.find(u => u.id === 'auto_cooler')?.level || 0;
        const pressureBuild = 0.15 * (1 - coolerLevel * 0.1);
        
        return { 
            walkouts: newWalkouts, 
            linePressure: Math.min(1, state.linePressure + pressureBuild), 
            combo: 0 
        };
      }),

      popCustomer: () => set((state) => ({
        customerQueue: state.customerQueue.slice(1),
        currentFill: 0,
        targetFill: state.customerQueue[1]?.targetFill || 0.8,
      })),

      addCustomer: (c) => set((state) => ({
        customerQueue: [...state.customerQueue, c],
        targetFill: state.customerQueue.length === 0 ? c.targetFill : state.targetFill
      })),

      setPouring: (pouring) => set({ isPouring: pouring }),
      setCurrentFill: (fill) => set({ currentFill: fill }),

      purchaseUpgrade: (id) => set((state) => {
        const up = state.upgrades.find(u => u.id === id);
        if (!up || state.totalTips < up.cost || up.level >= up.maxLevel) return state;
        return {
          totalTips: state.totalTips - up.cost,
          upgrades: state.upgrades.map(u => u.id === id ? { ...u, level: u.level + 1, cost: Math.floor(u.cost * 1.6) } : u)
        };
      }),

      updatePatience: (dt) => set((state) => {
          if (state.isFrenzyActive || state.currentPhase !== 'RUNNING') return state;
          const difficultyMod = 1 + (state.currentLevel - 1) * 0.12;
          return {
            customerQueue: state.customerQueue.map(c => ({
                ...c,
                patienceRemainingMs: Math.max(0, c.patienceRemainingMs - (dt * (c.isVip ? 1.4 : 1) * difficultyMod))
            }))
          };
      }),

      tickTimer: (dt) => set((state) => {
          if (state.currentMode !== 'TIMED' || state.currentPhase !== 'RUNNING') return state;
          const next = state.roundTimeRemaining - (dt / 1000);
          if (next <= 0) {
              get().saveRun();
              return { roundTimeRemaining: 0, currentPhase: 'GAME_OVER' };
          }
          return { roundTimeRemaining: next };
      }),

      toggleSetting: (key) => set((state) => ({
        settings: { ...state.settings, [key]: !state.settings[key] }
      })),

      saveRun: () => set((state) => {
          const summary: RunSummary = {
              score: state.score,
              tips: state.tipsEarned,
              perfects: state.perfects,
              overflows: state.overflows,
              maxCombo: state.maxCombo,
              mode: state.currentMode
          };
          return {
              lastRunSummary: summary,
              totalTips: state.totalTips + state.tipsEarned,
              highScoreClassic: state.currentMode === 'CLASSIC' ? Math.max(state.highScoreClassic, state.score) : state.highScoreClassic,
              highScoreTimed: state.currentMode === 'TIMED' ? Math.max(state.highScoreTimed, state.score) : state.highScoreTimed,
          };
      }),

      getNextShiftThreshold: () => {
          const state = get();
          const nextIndex = SHIFTS.findIndex(s => s.name === state.currentShift) + 1;
          if (nextIndex < SHIFTS.length) return SHIFTS[nextIndex].threshold;
          return 999999;
      },

      resetShiftTips: () => set({ tipsThisShift: 0 }),
      
      watchAdForTips: () => set((state) => ({
          totalTips: state.totalTips + 50.00
      }))
    }),
    {
      name: 'pour-panic-storage-v7',
      partialize: (state) => ({
        highScoreClassic: state.highScoreClassic,
        highScoreTimed: state.highScoreTimed,
        totalTips: state.totalTips,
        upgrades: state.upgrades,
        settings: state.settings,
      }),
    }
  )
);
