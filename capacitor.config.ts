import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId:   'com.almacen.app',
  appName: 'Almacén',
  webDir:  'dist',
  server: {
    androidScheme: 'https', // required for IndexedDB on Android
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#5b21b6', // emerald-600
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#5b21b6',
    },
  },
};

export default config;
