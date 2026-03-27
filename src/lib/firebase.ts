import { initializeApp } from "firebase/app";
import {
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

function prefersRedirect(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

  return standalone || window.matchMedia("(max-width: 820px)").matches;
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
