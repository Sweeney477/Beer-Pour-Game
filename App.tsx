
import React, { useEffect, useCallback, useRef, useState, useMemo, memo } from 'react';
import { useGameStore, SHIFTS } from './store';
import { GamePhase, Customer, Toast } from './types';
import { PrimaryButton, SecondaryButton, ModalOverlay, CustomerCard, ToastFeedback, TapSelectorButton, FrenzyMeter, AdBanner, AdPlaceholder } from './components/UI';
import { GameRenderer } from './game/Renderer';
import { Howl } from 'howler';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { isNative } from './src/utils/platform';

const App: React.FC = () => {
  // Use selectors to prevent unnecessary re-renders
  const currentPhase = useGameStore((state) => state.currentPhase);
  const setPhase = useGameStore((state) => state.setPhase);
  const currentMode = useGameStore((state) => state.currentMode);
  const startNewGame = useGameStore((state) => state.startNewGame);
  const score = useGameStore((state) => state.score);
  const tipsEarned = useGameStore((state) => state.tipsEarned);
  const tipsThisShift = useGameStore((state) => state.tipsThisShift);
  const resetShiftTips = useGameStore((state) => state.resetShiftTips);
  const customerQueue = useGameStore((state) => state.customerQueue);
  const addCustomer = useGameStore((state) => state.addCustomer);
  const popCustomer = useGameStore((state) => state.popCustomer);
  const isPouring = useGameStore((state) => state.isPouring);
  const setPouring = useGameStore((state) => state.setPouring);
  const currentFill = useGameStore((state) => state.currentFill);
  const setCurrentFill = useGameStore((state) => state.setCurrentFill);
  const targetFill = useGameStore((state) => state.targetFill);
  const addScore = useGameStore((state) => state.addScore);
  const addWalkout = useGameStore((state) => state.addWalkout);
  const totalTips = useGameStore((state) => state.totalTips);
  const upgrades = useGameStore((state) => state.upgrades);
  const purchaseUpgrade = useGameStore((state) => state.purchaseUpgrade);
  const updatePatience = useGameStore((state) => state.updatePatience);
  const combo = useGameStore((state) => state.combo);
  const linePressure = useGameStore((state) => state.linePressure);
  const roundTimeRemaining = useGameStore((state) => state.roundTimeRemaining);
  const tickTimer = useGameStore((state) => state.tickTimer);
  const toasts = useGameStore((state) => state.toasts);
  const activeTapId = useGameStore((state) => state.activeTapId);
  const taps = useGameStore((state) => state.taps);
  const setActiveTap = useGameStore((state) => state.setActiveTap);
  const settings = useGameStore((state) => state.settings);
  const toggleSetting = useGameStore((state) => state.toggleSetting);
  const setSoundVolume = useGameStore((state) => state.setSoundVolume);
  const setHasSeenOnboarding = useGameStore((state) => state.setHasSeenOnboarding);
  const frenzyMeter = useGameStore((state) => state.frenzyMeter);
  const isFrenzyActive = useGameStore((state) => state.isFrenzyActive);
  const currentShift = useGameStore((state) => state.currentShift);
  const currentLevel = useGameStore((state) => state.currentLevel);
  const getNextShiftThreshold = useGameStore((state) => state.getNextShiftThreshold);
  const watchAdForTips = useGameStore((state) => state.watchAdForTips);

  const lastUpdate = useRef(performance.now());
  const lastSpawnTime = useRef(performance.now());
  const spawnIntervalRef = useRef<number | null>(null);
  const patienceIntervalRef = useRef<number | null>(null);
  const isPouringRef = useRef(isPouring);
  const [countdownValue, setCountdownValue] = useState(3);
  const [lastServeResult, setLastServeResult] = useState<string | undefined>(undefined);
  const [showAdInterstitial, setShowAdInterstitial] = useState(false);
  const [resumeCountdown, setResumeCountdown] = useState(0);
  const [wrongTapFlash, setWrongTapFlash] = useState<string | null>(null);
  const [overfillFlash, setOverfillFlash] = useState(false);
  const [swipeStart, setSwipeStart] = useState<{ x: number; y: number } | null>(null);

  const sounds = useMemo(() => ({
    pour: new Howl({ src: ['https://actions.google.com/sounds/v1/water/faucet_water_running.ogg'], loop: true, volume: 0.4 }),
    perfect: new Howl({ src: ['https://actions.google.com/sounds/v1/cartoon/clink_clink.ogg'], volume: 0.7 }),
    good: new Howl({ src: ['https://actions.google.com/sounds/v1/cartoon/pop.ogg'], volume: 0.5 }),
    overflow: new Howl({ src: ['https://actions.google.com/sounds/v1/impacts/crash_and_smash.ogg'], volume: 0.5 }),
    walkout: new Howl({ src: ['https://actions.google.com/sounds/v1/doors/door_slam_shut.ogg'], volume: 0.6 }),
    click: new Howl({ src: ['https://actions.google.com/sounds/v1/ui/beep_short_low.ogg'], volume: 0.2 }),
    gameOver: new Howl({ src: ['https://actions.google.com/sounds/v1/cartoon/descending_whistle.ogg'], volume: 0.5 }),
    beep: new Howl({ src: ['https://actions.google.com/sounds/v1/ui/beep_short_low.ogg'], volume: 0.3 }),
    start: new Howl({ src: ['https://actions.google.com/sounds/v1/ui/beep_short_high.ogg'], volume: 0.5 }),
    frenzy: new Howl({ src: ['https://actions.google.com/sounds/v1/science_fiction/glitch_low_energy.ogg'], volume: 0.6 }),
    levelUp: new Howl({ src: ['https://actions.google.com/sounds/v1/cartoon/fanfare.ogg'], volume: 0.6 }),
    wrong: new Howl({ src: ['https://actions.google.com/sounds/v1/alarms/beep_short.ogg'], volume: 0.6 }),
  }), []);

  // Update sound volumes when setting changes
  useEffect(() => {
    Object.values(sounds).forEach(sound => {
      sound.volume(settings.soundVolume);
    });
  }, [settings.soundVolume, sounds]);

  const triggerHaptic = useCallback(async (pattern: number | number[]) => {
    if (!settings.hapticEnabled) return;
    
    if (isNative) {
      try {
        if (typeof pattern === 'number') {
          await Haptics.impact({ style: ImpactStyle.Medium });
        } else {
          // Pattern array - trigger multiple impacts
          for (let i = 0; i < pattern.length; i++) {
            await Haptics.impact({ style: ImpactStyle.Medium });
            if (i < pattern.length - 1) {
              await new Promise(resolve => setTimeout(resolve, pattern[i]));
            }
          }
        }
      } catch (error) {
        console.warn('Haptics not available:', error);
      }
    } else {
      // Web fallback
      if (navigator.vibrate) navigator.vibrate(pattern);
    }
  }, [settings.hapticEnabled]);

  const playSound = useCallback((soundKey: keyof typeof sounds) => {
    if (settings.soundEnabled) {
      sounds[soundKey].volume(settings.soundVolume);
      sounds[soundKey].play();
    }
  }, [settings.soundEnabled, settings.soundVolume, sounds]);

  useEffect(() => {
    if (currentPhase === 'COUNTDOWN') {
      setCountdownValue(3);
      const timer = setInterval(() => {
        setCountdownValue((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            playSound('start');
            setPhase('RUNNING');
            return 0;
          }
          playSound('beep');
          return prev - 1;
        });
      }, 800);
      return () => clearInterval(timer);
    }
  }, [currentPhase, setPhase, playSound]);

  // Initialize native features
  useEffect(() => {
    if (isNative) {
      // Set status bar style
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#221a10' }).catch(() => {});
      
      // Lock to portrait orientation
      ScreenOrientation.lock({ orientation: 'portrait' }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (isFrenzyActive) {
        playSound('frenzy');
        triggerHaptic([100, 50, 100, 50, 100]);
    }
  }, [isFrenzyActive, playSound, triggerHaptic]);

  useEffect(() => {
    if (currentPhase === 'LEVEL_UP') {
        playSound('levelUp');
        triggerHaptic([200, 100, 200]);
    }
  }, [currentPhase, playSound, triggerHaptic]);

  useEffect(() => {
    if (isPouring && currentPhase === 'RUNNING' && settings.soundEnabled) {
      if (!sounds.pour.playing()) sounds.pour.play();
    } else {
      sounds.pour.stop();
    }
  }, [isPouring, currentPhase, settings.soundEnabled, sounds.pour]);

  // Optimized: Use intervals for spawn and patience updates instead of every frame
  useEffect(() => {
    if (currentPhase !== 'RUNNING') {
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
      if (patienceIntervalRef.current) clearInterval(patienceIntervalRef.current);
      return;
    }

    // Spawn customers on interval
    let spawnInterval = 5000;
    let maxQueue = 3;
    
    if (currentShift === 'OPENING') { spawnInterval = 7000; maxQueue = 3; }
    else if (currentShift === 'HAPPY_HOUR') { spawnInterval = 3200; maxQueue = 5; }
    else if (currentShift === 'DINNER') { spawnInterval = 4200; maxQueue = 4; }
    else if (currentShift === 'CLOSING') { spawnInterval = 4800; maxQueue = 4; }
    else if (currentShift === 'AFTER_HOURS') { spawnInterval = 2500; maxQueue = 6; }

    const spawnCustomer = () => {
      if (customerQueue.length < maxQueue) {
        const randomTap = taps[Math.floor(Math.random() * taps.length)];
        const vipMagnetLevel = upgrades.find(u => u.id === 'vip_magnet')?.level || 0;
        const isVip = Math.random() < (0.1 + vipMagnetLevel * 0.04);
        
        let patienceLevel: 'VERY' | 'NORMAL' | 'NOT' = 'NORMAL';
        const roll = Math.random();

        if (currentShift === 'OPENING') {
            patienceLevel = 'VERY';
        } else if (currentShift === 'HAPPY_HOUR') {
            if (roll < 0.50) patienceLevel = 'VERY';
            else if (roll < 0.75) patienceLevel = 'NORMAL';
            else patienceLevel = 'NOT';
        } else if (currentShift === 'DINNER') {
            if (roll < 0.25) patienceLevel = 'VERY';
            else if (roll < 0.75) patienceLevel = 'NORMAL';
            else patienceLevel = 'NOT';
        } else if (currentShift === 'CLOSING' || currentShift === 'AFTER_HOURS') {
            if (roll < 0.25) patienceLevel = 'NORMAL';
            else if (roll < 0.50) patienceLevel = 'VERY';
            else patienceLevel = 'NOT';
        }

        let basePatience = 15000;
        if (patienceLevel === 'VERY') basePatience = 28000 + Math.random() * 8000;
        if (patienceLevel === 'NOT') basePatience = 8000 + Math.random() * 4000;
        if (patienceLevel === 'NORMAL') basePatience = 15000 + Math.random() * 6000;

        const frothLevel = upgrades.find(u => u.id === 'froth_master')?.level || 0;
        const assistBonus = settings.assistMode ? 0.015 : 0;
        addCustomer({
          id: Math.random().toString(),
          type: patienceLevel === 'NOT' ? 'IMPATIENT' : patienceLevel === 'VERY' ? 'PATIENT' : 'REGULAR',
          beerId: randomTap.id,
          targetFill: 0.5 + Math.random() * 0.45,
          tolerancePerfect: 0.02 + frothLevel * 0.005 + assistBonus,
          toleranceGood: 0.05 + frothLevel * 0.01 + assistBonus * 2,
          patienceMaxMs: basePatience,
          patienceRemainingMs: basePatience,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
          isVip
        });
      }
    };

    // Initial spawn if queue is empty
    if (customerQueue.length === 0) {
      spawnCustomer();
    }

    spawnIntervalRef.current = window.setInterval(spawnCustomer, spawnInterval);

    // Update patience on interval (60ms = ~16fps, smooth enough)
    patienceIntervalRef.current = window.setInterval(() => {
      updatePatience(60);
      tickTimer(60);
      
      const walkoutCustomer = customerQueue.find(c => c.patienceRemainingMs <= 0);
      if (walkoutCustomer) {
        playSound('walkout');
        triggerHaptic(200);
        setLastServeResult('WALKOUT');
        addWalkout();
        popCustomer();
      }
    }, 60);

    return () => {
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
      if (patienceIntervalRef.current) clearInterval(patienceIntervalRef.current);
    };
  }, [currentPhase, customerQueue.length, currentShift, taps, upgrades, settings.assistMode, addCustomer, updatePatience, tickTimer, addWalkout, popCustomer, playSound, triggerHaptic]);

  // Keep ref in sync with isPouring state
  useEffect(() => {
    isPouringRef.current = isPouring;
  }, [isPouring]);

  // Log when pouring is toggled while game should be running
  useEffect(() => {
    if (isPouring && currentPhase === 'RUNNING') {
      const activeTap = taps.find(t => t.id === activeTapId) || taps[0];
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/5505c98f-4996-4415-8bff-252cd7c91114', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'pre-fix',
          hypothesisId: 'B',
          location: 'App.tsx:useEffect[pouring]',
          message: 'Pour toggle detected',
          data: { phase: currentPhase, activeTapId: activeTap.id, flowRate: activeTap.flowRate, currentFill },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion
    }
  }, [isPouring, currentPhase, activeTapId, taps, currentFill]);

  // Separate loop for pouring animation (needs smooth frame updates)
  useEffect(() => {
    if (currentPhase !== 'RUNNING' || !isPouring) {
      // Reset lastUpdate when not pouring to prevent large dt jumps
      lastUpdate.current = performance.now();
      return;
    }

    let frame: number;
    let running = true;
    let firstFrameLogged = false;
    
    const loop = (t: number) => {
      // Check ref for latest isPouring state
      if (currentPhase !== 'RUNNING' || !isPouringRef.current || !running) {
        running = false;
        return;
      }

      const dt = t - lastUpdate.current;
      lastUpdate.current = t;

      const activeTap = taps.find(t => t.id === activeTapId) || taps[0];
      if (!activeTap) {
        running = false;
        return;
      }
      
      const flowMod = isFrenzyActive ? 2.2 : 1.0;
      // Use functional update to always get the latest currentFill value
      setCurrentFill((prevFill) => Math.min(1.2, prevFill + activeTap.flowRate * flowMod * (dt / 1000)));
      if (Math.random() > 0.8) triggerHaptic(10);

      if (!firstFrameLogged) {
        firstFrameLogged = true;
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/5505c98f-4996-4415-8bff-252cd7c91114', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'pre-fix',
            hypothesisId: 'C',
            location: 'App.tsx:pourLoop',
            message: 'First pour frame',
            data: { dt, activeTapId: activeTap.id, flowRate: activeTap.flowRate, flowMod },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion
      }
      
      if (running) {
        frame = requestAnimationFrame(loop);
      }
    };
    
    lastUpdate.current = performance.now();
    frame = requestAnimationFrame(loop);
    
    return () => {
      running = false;
      if (frame) cancelAnimationFrame(frame);
    };
  }, [currentPhase, isPouring, activeTapId, taps, isFrenzyActive, setCurrentFill, triggerHaptic]);

  // Memoize derived values
  const nextThreshold = useMemo(() => getNextShiftThreshold(), [getNextShiftThreshold, currentShift]);
  const currentThresholdData = useMemo(() => SHIFTS.find(s => s.name === currentShift), [currentShift]);
  const currentThreshold = useMemo(() => currentThresholdData?.threshold || 0, [currentThresholdData]);
  const progressPercent = useMemo(() => {
    if (nextThreshold === 999999) return 100;
    return Math.min(100, Math.max(0, ((score - currentThreshold) / (nextThreshold - currentThreshold)) * 100));
  }, [score, currentThreshold, nextThreshold]);

  const handleServe = useCallback(() => {
    if (customerQueue.length === 0 || currentPhase !== 'RUNNING') return;
    const customer = customerQueue[0];
    const diff = Math.abs(currentFill - customer.targetFill);
    
    const beerTips: Record<string, number> = {
      'tap_1': 1.0,  // Lager
      'tap_2': 1.5,  // IPA
      'tap_3': 2.0   // Stout
    };
    const baseTip = beerTips[customer.beerId] || 1.0;
    const isCorrectBeer = activeTapId === customer.beerId;

    let result: Toast['type'] = 'BAD';

    if (currentFill > 1.05) {
      playSound('overflow');
      triggerHaptic([50, 50, 50, 50]);
      addScore(-50, 0, 'OVERFLOW');
      result = 'OVERFLOW';
      setOverfillFlash(true);
      setTimeout(() => setOverfillFlash(false), 500);
    } else if (!isCorrectBeer) {
      playSound('wrong');
      triggerHaptic([150, 50, 150]);
      // Flash the correct tap
      setWrongTapFlash(customer.beerId);
      setTimeout(() => setWrongTapFlash(null), 800);
      // Still give small points if fill was good, but ZERO tips
      const points = diff <= customer.tolerancePerfect ? 50 : (diff <= customer.toleranceGood ? 25 : 0);
      addScore(points, 0, 'WRONG_BEER');
      result = 'WRONG_BEER';
    } else if (diff <= customer.tolerancePerfect) {
      playSound('perfect');
      triggerHaptic([100, 50, 100]);
      addScore(150, baseTip, 'PERFECT');
      result = 'PERFECT';
    } else if (diff <= customer.toleranceGood) {
      playSound('good');
      triggerHaptic(50);
      addScore(75, baseTip * 0.5, 'GOOD');
      result = 'GOOD';
    } else {
      playSound('click'); 
      addScore(20, 0, 'BAD');
      result = 'BAD';
    }
    
    setLastServeResult(result);
    popCustomer();
  }, [currentFill, customerQueue, addScore, popCustomer, playSound, triggerHaptic, currentPhase, activeTapId]);

  const wrapClick = (fn: () => void) => {
    return () => {
      playSound('click');
      fn();
    };
  };

  const handleTapSelect = useCallback((tapId: string) => {
    setActiveTap(tapId);
    triggerHaptic(10); // Light haptic feedback
    playSound('click');
  }, [setActiveTap, triggerHaptic, playSound]);

  const handleSwipeStart = useCallback((e: React.TouchEvent) => {
    setSwipeStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  }, []);

  const handleSwipeEnd = useCallback((e: React.TouchEvent) => {
    if (!swipeStart) return;
    const deltaX = e.changedTouches[0].clientX - swipeStart.x;
    const deltaY = Math.abs(e.changedTouches[0].clientY - swipeStart.y);
    
    // Only trigger if horizontal swipe (not vertical) and significant enough
    if (Math.abs(deltaX) > 50 && deltaY < 50) {
      const currentIndex = taps.findIndex(t => t.id === activeTapId);
      if (deltaX > 0 && currentIndex > 0) {
        // Swipe right - previous tap
        handleTapSelect(taps[currentIndex - 1].id);
      } else if (deltaX < 0 && currentIndex < taps.length - 1) {
        // Swipe left - next tap
        handleTapSelect(taps[currentIndex + 1].id);
      }
    }
    setSwipeStart(null);
  }, [swipeStart, taps, activeTapId, handleTapSelect]);

  const startNextShift = () => {
      resetShiftTips();
      setPhase('RUNNING');
  };

  const handleWatchRewardAd = () => {
    setShowAdInterstitial(true);
    // Simulate ad finish after 2 seconds
    setTimeout(() => {
        watchAdForTips();
        setShowAdInterstitial(false);
        playSound('perfect');
    }, 2000);
  };

  if (currentPhase === 'IDLE') {
    return (
      <div className="flex flex-col h-screen p-6 bg-[#221a10]">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="size-32 rounded-full bg-primary flex items-center justify-center shadow-2xl mb-8 border-4 border-white/10">
            <span className="material-symbols-outlined text-[72px] text-black">liquor</span>
          </div>
          <h1 className="text-6xl font-black italic tracking-tighter text-white leading-none mb-2">POUR<br/><span className="text-primary">PANIC</span></h1>
          <p className="text-white/30 text-xs tracking-widest uppercase mb-12">Next-Gen Arcade Brewery</p>
          <div className="w-full max-w-xs space-y-4">
            <PrimaryButton onClick={wrapClick(() => startNewGame('CLASSIC'))} className="w-full">CLASSIC MODE</PrimaryButton>
            <SecondaryButton onClick={wrapClick(() => startNewGame('TIMED'))} className="w-full">TIMED SPRINT</SecondaryButton>
          </div>
        </div>
        
        <div className="mb-8">
            <AdPlaceholder className="h-20" />
        </div>

        <div className="grid grid-cols-4 gap-2 mb-14">
          <button onClick={wrapClick(() => setPhase('TUTORIAL'))} className="flex flex-col items-center p-2 bg-white/5 rounded-2xl border border-white/5 active:bg-white/10 transition-colors"><span className="material-symbols-outlined text-primary text-xl">school</span><span className="text-[8px] font-bold uppercase">Tutorial</span></button>
          <button onClick={wrapClick(() => setPhase('ROUND_END'))} className="flex flex-col items-center p-2 bg-white/5 rounded-2xl border border-white/5 active:bg-white/10 transition-colors"><span className="material-symbols-outlined text-primary text-xl">shopping_cart</span><span className="text-[8px] font-bold uppercase">Shop</span></button>
          <button onClick={wrapClick(() => setPhase('HOW_TO_PLAY'))} className="flex flex-col items-center p-2 bg-white/5 rounded-2xl border border-white/5 active:bg-white/10 transition-colors"><span className="material-symbols-outlined text-primary text-xl">help</span><span className="text-[8px] font-bold uppercase">Guide</span></button>
          <button onClick={wrapClick(() => setPhase('SETTINGS'))} className="flex flex-col items-center p-2 bg-white/5 rounded-2xl border border-white/5 active:bg-white/10 transition-colors"><span className="material-symbols-outlined text-primary text-xl">settings</span><span className="text-[8px] font-bold uppercase">Config</span></button>
        </div>
        <AdBanner />

        {/* First Launch Onboarding */}
        {!settings.hasSeenOnboarding && (
          <ModalOverlay isOpen={true}>
            <div className="bg-[#2d2419] rounded-[2.5rem] p-8 border border-primary/30 shadow-2xl max-w-sm">
              <div className="text-center mb-6">
                <div className="size-16 rounded-full bg-primary flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-4xl text-black">local_bar</span>
                </div>
                <h1 className="text-3xl font-black italic text-white mb-2">Welcome to POUR PANIC!</h1>
                <p className="text-white/60 text-sm">Let's get you started</p>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex gap-3 items-start p-3 bg-white/5 rounded-xl">
                  <span className="material-symbols-outlined text-primary text-2xl shrink-0">tap</span>
                  <div>
                    <h3 className="font-black text-xs uppercase mb-1">Select the Right Tap</h3>
                    <p className="text-[10px] text-white/60">Each customer orders a specific beer. Match the tap to the order!</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start p-3 bg-white/5 rounded-xl">
                  <span className="material-symbols-outlined text-primary text-2xl shrink-0">water_drop</span>
                  <div>
                    <h3 className="font-black text-xs uppercase mb-1">Hold to Pour</h3>
                    <p className="text-[10px] text-white/60">Press and hold the center button. Stop at the target line for PERFECT!</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start p-3 bg-white/5 rounded-xl">
                  <span className="material-symbols-outlined text-primary text-2xl shrink-0">check_circle</span>
                  <div>
                    <h3 className="font-black text-xs uppercase mb-1">Serve or Dump</h3>
                    <p className="text-[10px] text-white/60">Tap SERVE when ready, or DUMP if you overfilled. Watch customer patience!</p>
                  </div>
                </div>
              </div>
              
              <PrimaryButton onClick={wrapClick(() => {
                setHasSeenOnboarding(true);
              })} className="w-full">
                LET'S POUR!
              </PrimaryButton>
            </div>
          </ModalOverlay>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen overflow-hidden transition-colors duration-500 ${isFrenzyActive ? 'bg-yellow-900/20' : 'bg-[#221a10]'}`}>
      <div className="fixed top-0 left-0 w-full h-1 bg-white/5 z-50">
          <div className="h-full bg-primary/40 transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
      </div>
      
      {toasts.map((t, idx) => <ToastFeedback key={t.id} toast={t} index={idx} />)}
      
      <header className="p-4 flex items-center justify-between z-20">
        <div className="flex flex-col w-24">
          <span className="text-[8px] text-white/40 font-black uppercase tracking-widest">{currentShift.replace('_', ' ')}</span>
          <div className="text-xl font-black text-primary tabular-nums">
              {currentMode === 'TIMED' ? `:${Math.ceil(roundTimeRemaining)}s` : `$${tipsEarned.toFixed(2)}`}
          </div>
        </div>
        <div className="text-center">
          <h2 className={`text-2xl font-black tabular-nums tracking-tighter transition-transform ${isFrenzyActive ? 'text-yellow-400 scale-125' : ''}`}>{score.toLocaleString()}</h2>
          {combo > 1 && <div className="text-[10px] font-black text-primary uppercase animate-bounce">x{combo} STREAK</div>}
        </div>
        <button onClick={wrapClick(() => setPhase('PAUSED'))} className="size-10 rounded-full bg-white/10 flex items-center justify-center w-24"><span className="material-symbols-outlined">pause</span></button>
      </header>

      <div className="px-6 mb-2">
          <FrenzyMeter progress={frenzyMeter} isActive={isFrenzyActive} />
      </div>

      <div className="flex justify-center items-start gap-12 px-8 h-40 mt-4 overflow-x-auto no-scrollbar relative z-10">
        {customerQueue.map((c, i) => (
          <div key={c.id} className={`${i === 0 ? 'scale-125' : 'opacity-40 scale-100'} transition-all duration-300`}>
            <CustomerCard 
              customer={c} 
              isCurrent={i === 0} 
              beerName={taps.find(t => t.id === c.beerId)?.name || 'Beer'} 
              lastResult={i === 0 ? lastServeResult : undefined}
            />
          </div>
        ))}
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
         <GameRenderer />
      </div>

      <footer className="p-4 bg-gradient-to-t from-black/80 to-transparent space-y-4 relative z-20 pb-16">
        <div className={`flex justify-between items-center px-2 ${settings.leftHanded ? 'flex-row-reverse' : ''}`}>
           <div 
             className="flex gap-3 flex-1 justify-center"
             onTouchStart={handleSwipeStart}
             onTouchEnd={handleSwipeEnd}
           >
               {taps.map(t => {
                 const currentCustomerBeerId = customerQueue[0]?.beerId;
                 return (
                   <div key={t.id} className={wrongTapFlash === t.id ? 'animate-pulse' : ''}>
                     <TapSelectorButton 
                       tap={t} 
                       isActive={activeTapId === t.id} 
                       isWrongFlash={wrongTapFlash === t.id}
                       isCustomerRequest={currentCustomerBeerId === t.id && activeTapId !== t.id}
                       onClick={wrapClick(() => handleTapSelect(t.id))} 
                     />
                   </div>
                 );
               })}
           </div>
           <div className="flex flex-col items-end gap-1 w-20">
              <span className="text-[8px] text-white/40 font-black uppercase">PRESSURE</span>
              <div className={`h-2 w-full bg-white/10 rounded-full overflow-hidden border border-white/5 ${overfillFlash ? 'ring-4 ring-red-500 animate-pulse' : ''}`}>
                <div className={`h-full transition-all duration-300 ${linePressure > 0.7 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${linePressure * 100}%` }}></div>
              </div>
           </div>
        </div>

        <div className={`flex gap-4 h-24 items-center ${settings.leftHanded ? 'flex-row-reverse' : ''}`}>
          <button onClick={handleServe} className="flex-1 h-full bg-white/5 rounded-3xl flex flex-col items-center justify-center gap-1 border border-white/10 active:bg-white/20">
            <span className="material-symbols-outlined text-green-400 text-3xl">check_circle</span>
            <span className="text-[10px] font-black uppercase">SERVE</span>
          </button>
          <button 
            onMouseDown={() => setPouring(true)} 
            onMouseUp={() => setPouring(false)} 
            onTouchStart={() => setPouring(true)} 
            onTouchEnd={() => setPouring(false)}
            className={`size-24 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all border-4 ${isPouring ? 'bg-white text-black border-primary scale-95' : 'bg-primary text-black border-white/20'}`}
          >
            <span className="material-symbols-outlined text-[48px]">{isPouring ? 'water_drop' : 'local_bar'}</span>
          </button>
          <button onClick={wrapClick(() => setCurrentFill(0))} className="flex-1 h-full bg-red-500/5 rounded-3xl flex flex-col items-center justify-center gap-1 border border-red-500/10 active:bg-red-500/10">
            <span className="material-symbols-outlined text-red-400 text-3xl">delete</span>
            <span className="text-[10px] font-black uppercase">DUMP</span>
          </button>
        </div>
      </footer>
      {currentPhase === 'IDLE' || currentPhase === 'GAME_OVER' || currentPhase === 'ROUND_END' ? <AdBanner position="bottom" /> : null}

      {/* Countdown View */}
      {currentPhase === 'COUNTDOWN' && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm">
              <h1 className="text-[12rem] font-black italic text-primary animate-ping tabular-nums">{countdownValue}</h1>
          </div>
      )}

      {/* Level Up / Shift Start Interstitial */}
      <ModalOverlay isOpen={currentPhase === 'LEVEL_UP'}>
          <div className="bg-[#2d2419] rounded-[2.5rem] p-8 border border-purple-500/30 text-center shadow-2xl ring-4 ring-purple-500/10">
            <div className="size-20 rounded-full bg-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="material-symbols-outlined text-4xl text-white">trending_up</span>
            </div>
            
            <div className="mb-6">
                <h2 className="text-sm font-black tracking-widest text-purple-400 uppercase mb-2">Shift Progression</h2>
                <h1 className="text-4xl font-black italic text-white mb-2 leading-none">{currentShift.replace('_', ' ')}</h1>
                <p className="text-white/60 text-sm mb-6 px-4 leading-relaxed">
                    {currentThresholdData?.desc}
                </p>
            </div>

            <div className="bg-black/20 rounded-2xl p-4 border border-white/5 mb-8">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-white/40 uppercase">Shift Earnings</span>
                    <span className="text-lg font-black text-primary">${tipsThisShift.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-white/40 uppercase">Total Pocketed</span>
                    <span className="text-lg font-black text-green-400">${tipsEarned.toFixed(2)}</span>
                </div>
            </div>

            <PrimaryButton onClick={wrapClick(startNextShift)} className="w-full !bg-purple-600 !text-white !shadow-[0_4px_20px_-5px_rgba(147,51,234,0.5)]">
              BEGIN SHIFT
            </PrimaryButton>
          </div>
      </ModalOverlay>

      {/* Simulated Reward Ad Interstitial */}
      <ModalOverlay isOpen={showAdInterstitial}>
          <div className="bg-black rounded-[2.5rem] p-8 border border-white/10 shadow-2xl text-center relative overflow-hidden h-[400px] flex flex-col items-center justify-center">
             <div className="absolute top-4 left-4 flex items-center gap-2">
                 <span className="material-symbols-outlined text-white/20 text-sm">info</span>
                 <span className="text-[10px] font-bold text-white/20 uppercase">ADVERTISING</span>
             </div>
             <div className="size-16 rounded-full bg-white/5 flex items-center justify-center mb-6 animate-spin duration-1000">
                 <span className="material-symbols-outlined text-3xl text-primary">play_circle</span>
             </div>
             <h2 className="text-xl font-black italic mb-2">WATCHING AD...</h2>
             <p className="text-white/30 text-xs">Your reward is processing.</p>
             <div className="absolute bottom-0 left-0 h-1 bg-primary w-full origin-left animate-[shrink_2s_linear_forwards]" style={{ animation: 'shrink 2s linear forwards' }}></div>
          </div>
      </ModalOverlay>

      {/* Tutorial Page */}
      <ModalOverlay isOpen={currentPhase === 'TUTORIAL'}>
          <div className="bg-[#2d2419] rounded-[2.5rem] p-8 border border-white/10 shadow-2xl overflow-y-auto max-h-[80vh] no-scrollbar">
            <h1 className="text-3xl font-black italic mb-6 text-center">HOW TO BREW</h1>
            <div className="space-y-6">
                <div className="flex gap-4 items-start">
                    <div className="size-10 rounded-full bg-primary flex items-center justify-center shrink-0 font-black text-black">1</div>
                    <div>
                        <h3 className="font-black uppercase text-sm mb-1">Watch the Order</h3>
                        <p className="text-xs text-white/60">Customers order specific brews. Check the bubble above their head for the target fill line.</p>
                    </div>
                </div>
                <div className="flex gap-4 items-start">
                    <div className="size-10 rounded-full bg-primary flex items-center justify-center shrink-0 font-black text-black">2</div>
                    <div>
                        <h3 className="font-black uppercase text-sm mb-1">Pick your Tap</h3>
                        <p className="text-xs text-white/60">Select the correct tap at the bottom. Different beers flow at different rates!</p>
                    </div>
                </div>
                <div className="flex gap-4 items-start">
                    <div className="size-10 rounded-full bg-primary flex items-center justify-center shrink-0 font-black text-black">3</div>
                    <div>
                        <h3 className="font-black uppercase text-sm mb-1">Hold to Pour</h3>
                        <p className="text-xs text-white/60">Press and hold the center glass button to pour. Release exactly on the target line for a PERFECT result.</p>
                    </div>
                </div>
                <div className="flex gap-4 items-start">
                    <div className="size-10 rounded-full bg-primary flex items-center justify-center shrink-0 font-black text-black">4</div>
                    <div>
                        <h3 className="font-black uppercase text-sm mb-1">Serve or Dump</h3>
                        <p className="text-xs text-white/60">Tap SERVE once you're happy, or DUMP if you overfilled. Overfills count as mistakes!</p>
                    </div>
                </div>
            </div>
            <PrimaryButton onClick={wrapClick(() => setPhase('IDLE'))} className="w-full mt-8">GOT IT!</PrimaryButton>
          </div>
      </ModalOverlay>

      {/* How To Play Page */}
      <ModalOverlay isOpen={currentPhase === 'HOW_TO_PLAY'}>
          <div className="bg-[#2d2419] rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
            <h1 className="text-3xl font-black italic mb-6 text-center">GUIDE</h1>
            <div className="space-y-4 mb-8">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <h4 className="font-black text-xs text-primary mb-1 uppercase">Perfect Pours</h4>
                    <p className="text-[11px] text-white/60">Nail the line for max points and huge tips. Combos increase your score multiplier.</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <h4 className="font-black text-xs text-yellow-400 mb-1 uppercase">Frenzy Mode</h4>
                    <p className="text-[11px] text-white/60">Fill the meter with Good/Perfect pours. Once active, all points are doubled and taps flow faster!</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <h4 className="font-black text-xs text-red-400 mb-1 uppercase">Walkouts</h4>
                    <p className="text-[11px] text-white/60">Don't let customer patience run out! 3 walkouts in Classic Mode and you're fired.</p>
                </div>
            </div>
            <PrimaryButton onClick={wrapClick(() => setPhase('IDLE'))} className="w-full">BACK</PrimaryButton>
          </div>
      </ModalOverlay>

      {/* Settings Page */}
      <ModalOverlay isOpen={currentPhase === 'SETTINGS'}>
          <div className="bg-[#2d2419] rounded-[2.5rem] p-8 border border-white/10 shadow-2xl text-center overflow-y-auto max-h-[80vh]">
            <h1 className="text-3xl font-black italic mb-8">CONFIG</h1>
            <div className="space-y-4 mb-10">
                <button 
                    onClick={wrapClick(() => toggleSetting('soundEnabled'))}
                    className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between"
                >
                    <span className="font-black text-sm uppercase">Sound Effects</span>
                    <span className={`material-symbols-outlined ${settings.soundEnabled ? 'text-primary' : 'text-white/20'}`}>
                        {settings.soundEnabled ? 'volume_up' : 'volume_off'}
                    </span>
                </button>
                {settings.soundEnabled && (
                  <div className="w-full p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-xs uppercase text-white/60">Volume</span>
                      <span className="text-xs font-black text-primary">{Math.round(settings.soundVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.soundVolume}
                      onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                )}
                <button 
                    onClick={wrapClick(() => toggleSetting('hapticEnabled'))}
                    className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between"
                >
                    <span className="font-black text-sm uppercase">Haptic Feedback</span>
                    <span className={`material-symbols-outlined ${settings.hapticEnabled ? 'text-primary' : 'text-white/20'}`}>
                        {settings.hapticEnabled ? 'vibration' : 'do_not_disturb_on'}
                    </span>
                </button>
                <button 
                    onClick={wrapClick(() => toggleSetting('assistMode'))}
                    className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between"
                >
                    <div className="flex flex-col items-start">
                      <span className="font-black text-sm uppercase">Assist Mode</span>
                      <span className="text-[10px] text-white/40">Wider tolerance, slower patience</span>
                    </div>
                    <span className={`material-symbols-outlined ${settings.assistMode ? 'text-primary' : 'text-white/20'}`}>
                        {settings.assistMode ? 'accessibility_new' : 'accessibility'}
                    </span>
                </button>
                <button 
                    onClick={wrapClick(() => toggleSetting('leftHanded'))}
                    className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between"
                >
                    <span className="font-black text-sm uppercase">Left-Handed Layout</span>
                    <span className={`material-symbols-outlined ${settings.leftHanded ? 'text-primary' : 'text-white/20'}`}>
                        {settings.leftHanded ? 'swipe_left' : 'swipe_right'}
                    </span>
                </button>
            </div>
            <PrimaryButton onClick={wrapClick(() => setPhase('IDLE'))} className="w-full">CLOSE</PrimaryButton>
            <p className="text-[8px] text-white/20 mt-6 uppercase tracking-widest">Version 2.5.0 • Built for Pros</p>
          </div>
      </ModalOverlay>

      {/* Pause Menu */}
      <ModalOverlay isOpen={currentPhase === 'PAUSED'}>
        <div className="bg-[#2d2419] rounded-[2.5rem] p-8 border border-white/10 text-center shadow-2xl">
          <h2 className="text-4xl font-black italic text-white mb-8">PAUSED</h2>
          <div className="space-y-4">
            <PrimaryButton onClick={wrapClick(() => {
              setResumeCountdown(3);
              const countdown = setInterval(() => {
                setResumeCountdown((prev) => {
                  if (prev <= 1) {
                    clearInterval(countdown);
                    setPhase('RUNNING');
                    return 0;
                  }
                  playSound('beep');
                  return prev - 1;
                });
              }, 800);
            })} className="w-full">RESUME</PrimaryButton>
            <SecondaryButton onClick={wrapClick(() => setPhase('IDLE'))} className="w-full">QUIT</SecondaryButton>
          </div>
        </div>
      </ModalOverlay>

      {/* Resume Countdown */}
      {resumeCountdown > 0 && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <h1 className="text-[12rem] font-black italic text-primary animate-ping tabular-nums">{resumeCountdown}</h1>
        </div>
      )}

      {/* Game Over View */}
      <ModalOverlay isOpen={currentPhase === 'GAME_OVER'}>
        <div className="flex flex-col p-8 bg-[#181511] items-center justify-center text-center rounded-[3rem] border border-white/10 w-full max-w-sm">
            <h1 className="text-5xl font-black italic text-white mb-8 uppercase leading-none tracking-tighter">SHIFT OVER</h1>
            
            <AdPlaceholder className="h-16 mb-6" />

            <div className="w-full grid grid-cols-2 gap-3 mb-8">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] text-white/40 font-bold uppercase mb-1">Total Score</p>
                    <p className="text-2xl font-black text-white">{score.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] text-white/40 font-bold uppercase mb-1">Tips Collected</p>
                    <p className="text-2xl font-black text-primary">${tipsEarned.toFixed(2)}</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] text-white/40 font-bold uppercase mb-1">Level Reached</p>
                    <p className="text-2xl font-black text-green-400">{currentLevel}</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] text-white/40 font-bold uppercase mb-1">Max Combo</p>
                    <p className="text-2xl font-black text-blue-400">{combo}</p>
                </div>
            </div>
            <PrimaryButton onClick={wrapClick(() => startNewGame(currentMode))} className="w-full mb-4">TRY AGAIN</PrimaryButton>
            <SecondaryButton onClick={wrapClick(() => setPhase('IDLE'))} className="w-full">MAIN MENU</SecondaryButton>
        </div>
      </ModalOverlay>

      {/* Shop View */}
      <ModalOverlay isOpen={currentPhase === 'ROUND_END'}>
          <div className="flex flex-col bg-[#221a10] p-6 rounded-[3rem] border border-white/10 w-full max-w-sm h-[80vh]">
              <h1 className="text-3xl font-black italic mb-6">BREWERY SHOP</h1>
              <div className="bg-primary/10 p-4 rounded-3xl mb-6 border border-primary/20 flex items-center justify-between">
                  <div>
                      <p className="text-[10px] text-primary font-black uppercase">Available Tips</p>
                      <p className="text-3xl font-black text-primary">${totalTips.toFixed(2)}</p>
                  </div>
                  <button onClick={handleWatchRewardAd} className="flex flex-col items-center gap-1 bg-primary text-black px-4 py-2 rounded-2xl active:scale-95 transition-all">
                      <span className="material-symbols-outlined text-sm">video_library</span>
                      <span className="text-[8px] font-black uppercase leading-none">Free $50</span>
                  </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar pb-8">
                  {upgrades.map(u => (
                      <div key={u.id} className="bg-white/5 border border-white/5 rounded-[2rem] p-5 flex items-center gap-4">
                          <div className="size-12 rounded-xl bg-primary flex items-center justify-center text-black shrink-0"><span className="material-symbols-outlined">{u.icon}</span></div>
                          <div className="flex-1 min-w-0">
                              <h4 className="font-black text-xs uppercase tracking-wider">{u.name}</h4>
                              <p className="text-[10px] text-white/40 leading-tight">{u.description}</p>
                          </div>
                          <button 
                            disabled={totalTips < u.cost || u.level >= u.maxLevel}
                            onClick={wrapClick(() => purchaseUpgrade(u.id))}
                            className={`px-3 py-2 rounded-xl font-black text-xs ${u.level >= u.maxLevel ? 'bg-green-500/10 text-green-500' : 'bg-primary text-black'}`}
                          >
                              {u.level >= u.maxLevel ? 'MAX' : `$${u.cost}`}
                          </button>
                      </div>
                  ))}
                  
                  <AdPlaceholder className="!h-24" />
              </div>
              <PrimaryButton onClick={wrapClick(() => setPhase('IDLE'))} className="w-full mt-4">DONE</PrimaryButton>
          </div>
      </ModalOverlay>
    </div>
  );
};

export default App;
