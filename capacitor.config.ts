import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.rbtgenius.app",
  appName: "RBT Genius",
  webDir: "dist",
  server: {
    url: "https://rbtgenius.com",
    cleartext: false,
  },
  plugins: {
    StatusBar: {
      style: "Default",
      backgroundColor: "#ffffff",
      overlaysWebView: false,
    },
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
