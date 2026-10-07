import type { CapacitorConfig } from '@capacitor/cli';

// UNSEEN native Android shell.
//
// The React PWA is bundled into the APK unchanged — every screen, engine and
// animation ships as-is. The only thing that differs from the browser build is
// the API host: the WebView serves the UI from its own origin, so the bundle is
// built with VITE_API_BASE pointing at the backend (see src/ai/base.ts), and
// the backend allows that origin via CORS_ORIGINS.
const config: CapacitorConfig = {
  appId: 'com.unseen.app',
  appName: 'UNSEEN',
  webDir: 'dist',
  backgroundColor: '#0B1623',
  server: {
    // DEV / DEMO ONLY: lets the https://localhost WebView reach a plain-http
    // LAN backend (VITE_API_BASE=http://<lan-ip>:8000). Remove both this and
    // android.allowMixedContent for a production build whose API is HTTPS.
    cleartext: true,
  },
  android: {
    allowMixedContent: true, // dev/demo only — see server.cleartext
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,          // the app hides it once settings have loaded
      backgroundColor: '#0B1623',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
