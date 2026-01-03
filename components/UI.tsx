
import React, { useState, useEffect } from 'react';
import { Toast, Upgrade } from '../types';

export const PrimaryButton: React.FC<{ onClick?: () => void; children: React.ReactNode; className?: string; disabled?: boolean }> = ({ onClick, children, className = '', disabled }) => (
  <button 
    disabled={disabled}
    onClick={onClick}
    className={`relative flex items-center justify-center overflow-hidden rounded-full h-16 px-8 bg-[#f49d25] text-[#181511] font-bold text-xl shadow-[0_4px_20px_-5px_rgba(244,157,37,0.5)] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);

export const SecondaryButton: React.FC<{ onClick?: () => void; children: React.ReactNode; className?: string }> = ({ onClick, children, className = '' }) => (
  <button 
    onClick={onClick}
    className={`flex items-center justify-center rounded-full h-14 px-6 bg-[#393228] border border-white/10 text-white font-bold text-lg active:scale-95 transition-all ${className}`}
  >
    {children}
  </button>
);

export const AdBanner: React.FC<{ position?: 'top' | 'bottom'; className?: string }> = ({ position = 'bottom', className = '' }) => (
  <div className={`w-full h-12 bg-black flex items-center justify-center overflow-hidden border-t border-white/5 z-50 ${position === 'top' ? 'fixed top-0' : 'fixed bottom-0'} ${className}`}>
    <div className="text-[10px] font-black text-white/20 tracking-[0.5em] uppercase animate-pulse">Sponsored Advertisement</div>
  </div>
);

export const AdPlaceholder: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`w-full bg-black/40 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center p-8 ${className}`}>
    <div className="flex flex-col items-center gap-2">
      <span className="material-symbols-outlined text-white/20 text-4xl">ads_click</span>
      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Ad Placement</span>
    </div>
  </div>
);

export const ModalOverlay: React.FC<{ children: React.ReactNode; isOpen: boolean }> = ({ children, isOpen }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-sm animate-in zoom-in duration-200">
        {children}
      </div>
    </div>
  );
};

export const ToastFeedback: React.FC<{ toast: Toast; index: number }> = ({ toast, index }) => {
  const configs: Record<string, { bg: string; icon: string }> = {
    PERFECT: { bg: 'bg-green-500 text-white', icon: 'stars' },
    GOOD: { bg: 'bg-blue-500 text-white', icon: 'thumb_up' },
    BAD: { bg: 'bg-orange-500 text-white', icon: 'sentiment_neutral' },
    OVERFLOW: { bg: 'bg-red-600 text-white', icon: 'warning' },
    WALKOUT: { bg: 'bg-red-800 text-white', icon: 'exit_to_app' },
    FRENZY: { bg: 'bg-yellow-400 text-black', icon: 'bolt' },
    LEVEL_UP: { bg: 'bg-purple-600 text-white ring-4 ring-purple-400/50', icon: 'trending_up' },
    WRONG_BEER: { bg: 'bg-gray-700 text-red-400 ring-2 ring-red-400', icon: 'block' },
  };
  
  const config = configs[toast.type] || configs.BAD;

  return (
    <div 
        style={{ transform: `translate(-50%, ${index * 60}px)` }}
        className={`fixed top-[45%] left-1/2 flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-xl italic tracking-tighter shadow-2xl transition-transform duration-300 animate-in slide-in-from-top-4 zoom-in duration-300 pointer-events-none z-[110] ${config.bg}`}
    >
      <span className="material-symbols-outlined">{config.icon}</span>
      {toast.message}
    </div>
  );
};

export const PatienceMeter: React.FC<{ percent: number }> = ({ percent }) => {
  const color = percent > 0.6 ? '#4ade80' : percent > 0.3 ? '#facc15' : '#f87171';
  return (
    <div className="relative size-14 rounded-full p-[4px] bg-white/5 shadow-inner">
      <svg className="size-full rotate-[-90deg]">
        <circle cx="50%" cy="50%" r="45%" fill="none" stroke="currentColor" strokeWidth="5" className="text-white/10" />
        <circle cx="50%" cy="50%" r="45%" fill="none" stroke={color} strokeWidth="5" strokeDasharray="100" strokeDashoffset={100 - (percent * 100)} strokeLinecap="round" />
      </svg>
    </div>
  );
};

export const CustomerCard: React.FC<{ customer: any; isCurrent: boolean; beerName: string; lastResult?: string }> = ({ customer, isCurrent, beerName, lastResult }) => {
  const percent = customer.patienceRemainingMs / customer.patienceMaxMs;
  const isVip = customer.isVip;

  const [emoji, setEmoji] = useState<string | null>(null);

  useEffect(() => {
    if (isCurrent && lastResult) {
      const emojis: Record<string, string> = {
        PERFECT: '😍',
        GOOD: '😊',
        BAD: '😐',
        OVERFLOW: '🤮',
        WALKOUT: '😡',
        WRONG_BEER: '🤨'
      };
      setEmoji(emojis[lastResult] || '🤨');
      const timer = setTimeout(() => setEmoji(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [lastResult, isCurrent]);
  
  return (
    <div className="flex flex-col items-center relative shrink-0 transition-transform duration-300">
      {/* Reaction Emoji */}
      {emoji && (
        <div className="absolute -top-12 text-4xl animate-bounce z-50 pointer-events-none drop-shadow-lg">
          {emoji}
        </div>
      )}

      {/* Type Badge */}
      <div className={`absolute -top-4 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter border z-20 ${isVip ? 'bg-yellow-400 text-black border-yellow-200 animate-pulse' : isCurrent ? 'bg-primary text-black border-white/20' : 'bg-white/10 text-white/40 border-white/5'}`}>
        {isVip ? '👑 VIP' : customer.type}
      </div>

      {/* Avatar with Patience Meter */}
      <div className="relative">
        <PatienceMeter percent={percent} />
        <div 
          className={`absolute inset-1.5 rounded-full bg-cover bg-center border-2 bg-[#393228] shadow-lg ${isVip ? 'border-yellow-400 ring-4 ring-yellow-400/20' : isCurrent ? 'border-primary' : 'border-white/10'}`}
          style={{ backgroundImage: `url(${customer.avatarUrl})` }}
        />
      </div>

      {/* Order Bubble */}
      <div className={`mt-3 relative flex flex-col items-center px-3 py-1.5 rounded-2xl shadow-xl border-2 transition-all ${isVip ? 'bg-yellow-400 border-white scale-110' : isCurrent ? 'bg-white border-primary animate-pulse' : 'bg-[#393228] border-white/10'}`}>
        <span className={`text-[8px] font-black uppercase tracking-tight leading-none mb-1 ${isVip || isCurrent ? 'text-black/50' : 'text-white/30'}`}>ORDER</span>
        <span className={`text-sm font-black italic tracking-tighter leading-none ${isVip || isCurrent ? 'text-black' : 'text-white'}`}>
          {beerName.toUpperCase()}
        </span>
        {/* Bubble pointer */}
        <div className={`absolute -top-1.5 left-1/2 -translate-x-1/2 size-3 rotate-45 border-l-2 border-t-2 ${isVip ? 'bg-yellow-400 border-white' : isCurrent ? 'bg-white border-primary' : 'bg-[#393228] border-white/10'}`}></div>
      </div>
    </div>
  );
};

export const TapSelectorButton: React.FC<{ tap: any; isActive: boolean; onClick: () => void }> = ({ tap, isActive, onClick }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all border-2 ${isActive ? 'bg-primary/20 border-primary' : 'bg-white/5 border-transparent'}`}
    >
        <span className="material-symbols-outlined mb-1" style={{ color: isActive ? '#f49d25' : '#fff' }}>water_drop</span>
        <span className="text-[8px] font-black uppercase tracking-widest">{tap.name}</span>
    </button>
);

export const FrenzyMeter: React.FC<{ progress: number; isActive: boolean }> = ({ progress, isActive }) => (
    <div className="w-full flex flex-col gap-1">
        <div className="flex justify-between items-center px-1">
            <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isActive ? 'text-yellow-400 animate-pulse' : 'text-white/30'}`}>
                {isActive ? '⚡ FRENZY ACTIVE ⚡' : 'FRENZY METER'}
            </span>
            <span className={`text-[9px] font-black ${isActive ? 'text-yellow-400' : 'text-white/30'}`}>{progress.toFixed(0)}%</span>
        </div>
        <div className={`h-3 w-full rounded-full overflow-hidden border-2 p-[2px] ${isActive ? 'bg-yellow-400/10 border-yellow-400' : 'bg-white/5 border-white/10'}`}>
            <div 
                className={`h-full rounded-full transition-all duration-300 relative ${isActive ? 'bg-yellow-400 shadow-[0_0_15_rgba(250,204,21,0.8)]' : 'bg-primary'}`} 
                style={{ width: `${progress}%` }}
            >
                {isActive && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
            </div>
        </div>
    </div>
);
