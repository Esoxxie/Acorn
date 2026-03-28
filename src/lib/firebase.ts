import { initializeApp } from "firebase/app";
import {
  type AuthError,
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import {
  type Firestore,
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import type { AnalyzeEntryInput, MealEstimate } from "../../shared/models";
import { appEnv, getRuntimeHost } from "./env";

const app = initializeApp(appEnv.firebaseConfig);

let firestore: Firestore;

try {
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch {
  firestore = getFirestore(app);
}

const auth = getAuth(app);
const functions = getFunctions(app, "europe-west3");
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

let emulatorsConnected = false;

if (appEnv.useEmulators && !emulatorsConnected) {
  const host = getRuntimeHost();
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(firestore, host, 8080);
  connectFunctionsEmulator(functions, host, 5001);
  connectStorageEmulator(storage, host, 9199);
  emulatorsConnected = true;
}

export { auth, firestore as db, functions, googleProvider, storage };

export const analyzeEntry = httpsCallable<AnalyzeEntryInput, MealEstimate>(functions, "analyzeEntry");

function isIosBrowser(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && "ontouchend" in document);
}

function prefersRedirect(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

  // Mobile popups are usually fine inside a normal browser tab, but installed PWAs
  // and iOS are still more reliable with a full-page redirect.
  return standalone || isIosBrowser();
}

export async function startGoogleSignIn() {
  if (prefersRedirect()) {
    await signInWithRedirect(auth, googleProvider);
    return;
  }

  await signInWithPopup(auth, googleProvider);
}

export async function startDemoSignIn() {
  await signInAnonymously(auth);
}

export function getAuthErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? (error as AuthError).code : null;

  switch (code) {
    case "auth/unauthorized-domain": {
      const host = typeof window === "undefined" ? "this host" : window.location.hostname;
      return `Google-Login ist fuer ${host} noch nicht freigeschaltet. Fuege die Domain in Firebase Authentication > Settings > Authorized domains hinzu und versuche es erneut.`;
    }
    case "auth/popup-blocked":
      return "Das Login-Popup wurde vom Browser blockiert. Erlaube Popups fuer diese Seite und versuche es erneut.";
    case "auth/popup-closed-by-user":
      return "Das Login-Popup wurde geschlossen, bevor die Anmeldung abgeschlossen war. Versuche es erneut und lasse das Fenster offen.";
    case "auth/network-request-failed":
      return "Dein Geraet konnte Firebase nicht erreichen. Stelle sicher, dass Telefon und Computer im selben Netzwerk sind, und versuche es erneut.";
    default:
      if (error instanceof Error && error.message) {
        return error.message;
      }

      return "Anmeldung fehlgeschlagen. Bitte versuche es erneut.";
  }
}
