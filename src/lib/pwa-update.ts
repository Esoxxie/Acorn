import { useSyncExternalStore } from "react";
import { registerSW } from "virtual:pwa-register";

type PwaUpdateSnapshot = {
  supported: boolean;
  checking: boolean;
  updateAvailable: boolean;
  offlineReady: boolean;
  message: string | null;
};

const listeners = new Set<() => void>();

const snapshot: PwaUpdateSnapshot = {
  supported: false,
  checking: false,
  updateAvailable: false,
  offlineReady: false,
  message: null,
};

let registrationRef: ServiceWorkerRegistration | null = null;
let updateHandler: ((reloadPage?: boolean) => Promise<void>) | null = null;
let initialized = false;

function emitChange() {
  listeners.forEach((listener) => listener());
}

function setSnapshot(patch: Partial<PwaUpdateSnapshot>) {
  Object.assign(snapshot, patch);
  emitChange();
}

export function initializePwaUpdates() {
  if (initialized || typeof window === "undefined") {
    return;
  }

  initialized = true;

  if (!("serviceWorker" in navigator)) {
    return;
  }

  snapshot.supported = true;
  updateHandler = registerSW({
    immediate: true,
    onNeedRefresh() {
      setSnapshot({
        checking: false,
        updateAvailable: true,
        message: "Update verfuegbar",
      });
    },
    onOfflineReady() {
      setSnapshot({
        offlineReady: true,
        message: snapshot.updateAvailable ? "Update verfuegbar" : "App ist aktuell",
      });
    },
    onRegisteredSW(_swUrl: string, registration?: ServiceWorkerRegistration) {
      registrationRef = registration ?? null;
      emitChange();
    },
    onRegisterError() {
      setSnapshot({
        checking: false,
        message: "Updates konnten nicht geprueft werden.",
      });
    },
  });
}

async function checkForUpdate() {
  if (!snapshot.supported) {
    setSnapshot({ message: "Updates werden auf diesem Geraet nicht unterstuetzt." });
    return;
  }

  setSnapshot({
    checking: true,
    message: "Pruefe auf Updates...",
  });

  try {
    await registrationRef?.update();

    if (!snapshot.updateAvailable) {
      setSnapshot({
        checking: false,
        message: "App ist aktuell",
      });
      return;
    }

    setSnapshot({
      checking: false,
      message: "Update verfuegbar",
    });
  } catch {
    setSnapshot({
      checking: false,
      message: "Updates konnten nicht geprueft werden.",
    });
  }
}

async function applyUpdate() {
  if (updateHandler) {
    await updateHandler(true);
    return;
  }

  window.location.reload();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

export function usePwaUpdateState() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...state,
    checkForUpdate,
    applyUpdate,
  };
}
