const fallbackProjectId = "demo-acorn";
const forceLocalDemo = import.meta.env.VITE_FORCE_LOCAL_DEMO === "true";

export const appEnv = {
  useEmulators:
    import.meta.env.VITE_USE_EMULATORS === undefined
      ? !import.meta.env.PROD
      : import.meta.env.VITE_USE_EMULATORS === "true",
  firebaseConfig: {
    apiKey: forceLocalDemo ? "demo-key" : import.meta.env.VITE_FIREBASE_API_KEY || "demo-key",
    authDomain:
      forceLocalDemo
        ? `${fallbackProjectId}.firebaseapp.com`
        : import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${fallbackProjectId}.firebaseapp.com`,
    projectId: forceLocalDemo ? fallbackProjectId : import.meta.env.VITE_FIREBASE_PROJECT_ID || fallbackProjectId,
    storageBucket:
      forceLocalDemo
        ? `${fallbackProjectId}.appspot.com`
        : import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${fallbackProjectId}.appspot.com`,
    messagingSenderId: forceLocalDemo ? "1234567890" : import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
    appId: forceLocalDemo ? "1:1234567890:web:acorn-demo" : import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:acorn-demo",
  },
  usingDemoConfig:
    forceLocalDemo || !import.meta.env.VITE_FIREBASE_PROJECT_ID || !import.meta.env.VITE_FIREBASE_API_KEY,
};

export function getRuntimeHost(): string {
  if (typeof window === "undefined") {
    return "127.0.0.1";
  }

  return window.location.hostname || "127.0.0.1";
}
