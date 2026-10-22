import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.streetrivals.racingempire',
  appName: 'Street Rivals',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    backgroundColor: '#080d13'
  }
};

export default config;
