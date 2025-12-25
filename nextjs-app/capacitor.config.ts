import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.timeharbor.app',
  appName: 'TimeHarbor',
  webDir: 'public',
  server: {
    url: 'http://192.168.1.x:3000', // Replace with your local IP for dev, or production URL
    cleartext: true
  }
};

export default config;
