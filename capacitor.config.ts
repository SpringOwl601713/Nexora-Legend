import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexora.legend',
  appName: 'Nexora Légend',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: true
  }
};

export default config;
