import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pourpanic.app',
  appName: 'Pour Panic',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#221a10",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      ios: true,
      android: true
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#221a10'
    }
  }
};

export default config;



