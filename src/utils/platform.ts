import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();

export const getWindowSize = () => {
  if (typeof window !== 'undefined') {
    return { 
      width: window.innerWidth, 
      height: window.innerHeight 
    };
  }
  // Default mobile size fallback
  return { width: 375, height: 667 };
};

export const isIOS = platform === 'ios';
export const isAndroid = platform === 'android';
export const isWeb = platform === 'web';



