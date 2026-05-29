import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type {
  MealEstimate,
  MealRecord,
  MealSource,
  SavedFood,
  ThemePreference,
  UserProfile,
} from "../../shared/models";
import {
  calculateTdee,
  computeDailyCoverage,
  createMealSnapshot,
  savedFoodToEstimate,
  scaleEstimate,
  scaleMealSnapshot,
  type MealSnapshot,
} from "../../shared/calorie";
import { createSeededDemoData } from "../lib/demo-data";
import {
  auth,
  db,
  getAuthErrorMessage,
  startGoogleSignIn,
} from "../lib/firebase";
import { deleteMealImages, uploadMealImages } from "../lib/storage";
import type { PreparedImageAssets } from "../lib/image";
import { appEnv } from "../lib/env";
import {
  clearCachedProfile,
  readCachedProfile,
  writeCachedProfile,
  readCachedMeals,
  writeCachedMeals,
  readCachedSavedFoods,
  writeCachedSavedFoods,
} from "../lib/profile-cache";

type SessionUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  isDemo?: boolean;
};

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  authError: string | null;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
  signInDemo: () => Promise<void>;
  isEmulatorMode: boolean;
};

type SaveMealInput = {
  source: MealSource;
  estimate: MealEstimate;
  photoAssets?: PreparedImageAssets | null;
  userContext?: string | null;
  transcript?: string | null;
  favorite?: boolean;
  loggedAt?: string;
};

type MealUpdateInput = Partial<Omit<MealRecord, "id" | "servings" | "baseSnapshot">> & {
  photoAssets?: PreparedImageAssets | null;
  servings?: number;
  baseSnapshot?: MealSnapshot | null;
};

type AppDataContextValue = {
  profile: UserProfile | null;
  meals: MealRecord[];
  savedFoods: SavedFood[];
  loading: boolean;
  syncError: string | null;
  saveProfile: (profile: UserProfile) => Promise<void>;
  saveThemePreference: (themePreference: ThemePreference) => Promise<void>;
  saveMeal: (input: SaveMealInput) => Promise<void>;
  updateMeal: (meal: MealRecord, patch: MealUpdateInput) => Promise<void>;
  updateMealServings: (meal: MealRecord, servings: number) => Promise<void>;
  toggleMealFavorite: (meal: MealRecord) => Promise<void>;
  quickLogSavedFood: (savedFood: SavedFood, multiplier: number, loggedAt?: string) => Promise<void>;
  deleteMeal: (meal: MealRecord) => Promise<void>;
};

type AppDataErrorState = {
  profile: string | null;
  meals: string | null;
  savedFoods: string | null;
  profileSave: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const AppDataContext = createContext<AppDataContextValue | null>(null);
const DEMO_SESSION_KEY = "acorn.demo.session";
const DEMO_DATA_KEY = "acorn.demo.data";
const EMPTY_APP_DATA_ERRORS: AppDataErrorState = {
  profile: null,
  meals: null,
  savedFoods: null,
  profileSave: null,
};

export function buildProfileBootstrapPatch(user: SessionUser, now: string): Partial<UserProfile> {
  return {
    displayName: user.displayName,
    email: user.email,
    updatedAt: now,
    createdAt: now,
  };
}

function defaultProfileFromUser(user: SessionUser): UserProfile {
  return {
    displayName: user.displayName,
    email: user.email,
    units: "metric",
    themePreference: "system",
    age: null,
    sex: null,
    heightCm: null,
    weightKg: null,
    activityLevel: null,
    dailySpendKcal: null,
  };
}

function loadDemoUser(): SessionUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const cached = window.localStorage.getItem(DEMO_SESSION_KEY);
  return cached ? (JSON.parse(cached) as SessionUser) : null;
}

function saveDemoUser(user: SessionUser | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!user) {
    window.localStorage.removeItem(DEMO_SESSION_KEY);
    return;
  }

  window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(user));
}

function loadDemoData(user: SessionUser): { profile: UserProfile; meals: MealRecord[]; savedFoods: SavedFood[] } {
  const seeded = createSeededDemoData(user.displayName, user.email);

  if (typeof window === "undefined") {
    return seeded;
  }

  const cached = window.localStorage.getItem(DEMO_DATA_KEY);
  if (!cached) {
    saveDemoData(seeded);
    return seeded;
  }

  const parsed = JSON.parse(cached) as { profile: UserProfile; meals: MealRecord[]; savedFoods: SavedFood[] };

  return {
    profile: {
      ...seeded.profile,
      ...parsed.profile,
      themePreference: parsed.profile?.themePreference ?? "system",
    },
    meals: parsed.meals?.length ? parsed.meals : seeded.meals,
    savedFoods: parsed.savedFoods?.length ? parsed.savedFoods : seeded.savedFoods,
  };
}

function saveDemoData(data: { profile: UserProfile; meals: MealRecord[]; savedFoods: SavedFood[] }) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(data));
}

function mealSnapshotFromRecord(meal: Pick<MealRecord, "calories" | "macros" | "items">): MealSnapshot {
  return createMealSnapshot(meal);
}

function mealSnapshotFromMeal(meal: MealRecord): MealSnapshot {
  return meal.baseSnapshot ? createMealSnapshot(meal.baseSnapshot) : mealSnapshotFromRecord(meal);
}

function savedFoodFromMeal(meal: MealRecord, existingSavedFood?: SavedFood | null): SavedFood {
  return {
    id: meal.savedFoodId ?? meal.id,
    title: meal.mealTitle,
    summary: meal.summary,
    items: meal.items,
    calories: meal.calories,
    macros: meal.macros,
    defaultServingLabel: meal.items[0]?.portion ?? "1 Portion",
    usageCount: existingSavedFood?.usageCount ?? 0,
    lastUsedAt: existingSavedFood?.lastUsedAt ?? meal.updatedAt ?? meal.loggedAt ?? null,
    linkedMealId: existingSavedFood?.linkedMealId ?? meal.id,
    favorite: true,
  };
}

function ensureMeal(raw: Partial<MealRecord>, id: string): MealRecord {
  return {
    id,
    source: raw.source ?? "manual_ai",
    mealTitle: raw.mealTitle ?? "Untitled meal",
    summary: raw.summary ?? "",
    items: raw.items ?? [],
    calories: raw.calories ?? 0,
    macros: raw.macros ?? { protein: 0, carbs: 0, fat: 0, fiber: null },
    confidence: raw.confidence ?? 70,
    assumptions: raw.assumptions ?? [],
    loggedAt: raw.loggedAt ?? new Date().toISOString(),
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
    photo: raw.photo ?? null,
    userContext: raw.userContext ?? null,
    transcript: raw.transcript ?? null,
    percentOfDailySpend: raw.percentOfDailySpend ?? 0,
    favorite: raw.favorite ?? false,
    savedFoodId: raw.savedFoodId ?? null,
    servings: raw.servings ?? 1,
    baseSnapshot: raw.baseSnapshot ?? null,
  };
}

function ensureSavedFood(raw: Partial<SavedFood>, id: string): SavedFood {
  return {
    id,
    title: raw.title ?? "Favorit",
    summary: raw.summary ?? "",
    items: raw.items ?? [],
    calories: raw.calories ?? 0,
    macros: raw.macros ?? { protein: 0, carbs: 0, fat: 0, fiber: null },
    defaultServingLabel: raw.defaultServingLabel ?? "1 Portion",
    usageCount: raw.usageCount ?? 0,
    lastUsedAt: raw.lastUsedAt ?? null,
    linkedMealId: raw.linkedMealId ?? null,
    favorite: raw.favorite ?? true,
  };
}

function normalizeProfile(profile: UserProfile, user: SessionUser): UserProfile {
  return {
    ...profile,
    displayName: user.displayName ?? profile.displayName ?? null,
    email: user.email ?? profile.email ?? null,
    themePreference: profile.themePreference ?? "system",
    dailySpendKcal: calculateTdee(profile),
  };
}

function getSyncErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

function getAppDataSyncError(errors: AppDataErrorState): string | null {
  return errors.profileSave ?? errors.profile ?? errors.meals ?? errors.savedFoods;
}

export function mergeProfileSources(
  user: SessionUser,
  nextProfile: Partial<UserProfile> | null | undefined,
  fallbackProfile: UserProfile | null = null,
): UserProfile {
  const merged = {
    ...defaultProfileFromUser(user),
    ...(fallbackProfile ?? {}),
    ...(nextProfile ?? {}),
  };

  return normalizeProfile(
    {
      ...merged,
      displayName: user.displayName ?? merged.displayName ?? null,
      email: user.email ?? merged.email ?? null,
      units: merged.units ?? "metric",
      themePreference: merged.themePreference ?? "system",
      age: merged.age ?? null,
      sex: merged.sex ?? null,
      heightCm: merged.heightCm ?? null,
      weightKg: merged.weightKg ?? null,
      activityLevel: merged.activityLevel ?? null,
      createdAt: merged.createdAt ?? null,
      updatedAt: merged.updatedAt ?? null,
    },
    user,
  );
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const demoUser = loadDemoUser();
    if (demoUser) {
      setUser(demoUser);
      setLoading(false);
      return;
    }

    if (appEnv.usingDemoConfig) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      const sessionUser = nextUser
        ? {
            uid: nextUser.uid,
            displayName: nextUser.displayName ?? null,
            email: nextUser.email ?? null,
          }
        : null;
      setUser(sessionUser);
      setLoading(false);
      setAuthError(null);

      if (!sessionUser) {
        return;
      }

      const now = new Date().toISOString();
      await setDoc(
        doc(db, "users", sessionUser.uid),
        buildProfileBootstrapPatch(sessionUser, now),
        { merge: true },
      );
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn: async () => {
        if (appEnv.usingDemoConfig) {
          const demoUser: SessionUser = {
            uid: "demo-squirrel",
            displayName: "Acorn Demo",
            email: "demo@acorn.local",
            isDemo: true,
          };
          saveDemoUser(demoUser);
          setUser(demoUser);
          return;
        }

        setAuthError(null);

        try {
          await startGoogleSignIn();
        } catch (error) {
          setAuthError(getAuthErrorMessage(error));
        }
      },
      signOutUser: async () => {
        if (user?.isDemo || appEnv.usingDemoConfig) {
          saveDemoUser(null);
          setUser(null);
          return;
        }

        await signOut(auth);
        if (user) {
          clearCachedProfile(user.uid);
        }
      },
      signInDemo: async () => {
        const demoUser: SessionUser = {
          uid: "demo-squirrel",
          displayName: "Acorn Demo",
          email: "demo@acorn.local",
          isDemo: true,
        };
        saveDemoUser(demoUser);
        setUser(demoUser);
        setAuthError(null);
      },
      isEmulatorMode: appEnv.useEmulators,
      authError,
    }),
    [authError, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AppDataProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(() =>
    !user || user.isDemo || appEnv.usingDemoConfig ? null : readCachedProfile(user.uid),
  );
  const [meals, setMeals] = useState<MealRecord[]>(() =>
    !user || user.isDemo || appEnv.usingDemoConfig ? [] : readCachedMeals(user.uid),
  );
  const [savedFoods, setSavedFoods] = useState<SavedFood[]>(() =>
    !user || user.isDemo || appEnv.usingDemoConfig ? [] : readCachedSavedFoods(user.uid),
  );
  const [loading, setLoading] = useState(() => {
    if (!user || user.isDemo || appEnv.usingDemoConfig) {
      return false;
    }
    const hasCache = readCachedProfile(user.uid) !== null;
    return !hasCache;
  });
  const [appDataErrors, setAppDataErrors] = useState<AppDataErrorState>({ ...EMPTY_APP_DATA_ERRORS });
  const latestProfileRef = useRef<UserProfile | null>(profile);

  function setProfileState(nextProfile: UserProfile | null) {
    latestProfileRef.current = nextProfile;
    setProfile(nextProfile);

    if (user && !user.isDemo && !appEnv.usingDemoConfig && nextProfile) {
      writeCachedProfile(user.uid, nextProfile);
    }
  }

  useEffect(() => {
    latestProfileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    if (!user) {
      latestProfileRef.current = null;
      setProfile(null);
      setMeals([]);
      setSavedFoods([]);
      setLoading(false);
      setAppDataErrors({ ...EMPTY_APP_DATA_ERRORS });
      return;
    }

    if (user.isDemo || appEnv.usingDemoConfig) {
      const demoData = loadDemoData(user);
      setProfileState(demoData.profile);
      setMeals(demoData.meals);
      setSavedFoods(demoData.savedFoods);
      setLoading(false);
      setAppDataErrors({ ...EMPTY_APP_DATA_ERRORS });
      return;
    }

    setLoading(true);
    setAppDataErrors({ ...EMPTY_APP_DATA_ERRORS });

    let active = true;
    const settled = {
      profile: false,
      meals: false,
      savedFoods: false,
    };
    const settle = (key: keyof typeof settled) => {
      if (!active || settled[key]) {
        return;
      }

      settled[key] = true;
      if (settled.profile && settled.meals && settled.savedFoods) {
        setLoading(false);
      }
    };

    const unsubs = [
      onSnapshot(
        doc(db, "users", user.uid),
        (snapshot) => {
          if (!active) {
            return;
          }

          const rawProfile = snapshot.exists() ? (snapshot.data() as Partial<UserProfile>) : null;
          const nextProfile = mergeProfileSources(user, rawProfile, latestProfileRef.current);
          setProfileState(nextProfile);
          setAppDataErrors((current) => ({
            ...current,
            profile: null,
            profileSave: null,
          }));
          settle("profile");
        },
        (error) => {
          if (!active) {
            return;
          }

          setAppDataErrors((current) => ({
            ...current,
            profile: getSyncErrorMessage(error, "Dein Profil konnte nicht synchronisiert werden."),
          }));
          settle("profile");
        },
      ),
      onSnapshot(
        query(collection(db, `users/${user.uid}/meals`), orderBy("loggedAt", "desc"), limit(150)),
        (snapshot) => {
          if (!active) {
            return;
          }

          const fetchedMeals = snapshot.docs.map((mealDoc) => ensureMeal(mealDoc.data() as Partial<MealRecord>, mealDoc.id));
          setMeals(fetchedMeals);
          writeCachedMeals(user.uid, fetchedMeals);
          setAppDataErrors((current) => ({
            ...current,
            meals: null,
          }));
          settle("meals");
        },
        (error) => {
          if (!active) {
            return;
          }

          setAppDataErrors((current) => ({
            ...current,
            meals: getSyncErrorMessage(error, "Deine Eintraege konnten nicht synchronisiert werden."),
          }));
          settle("meals");
        },
      ),
      onSnapshot(
        query(collection(db, `users/${user.uid}/savedFoods`), orderBy("usageCount", "desc")),
        (snapshot) => {
          if (!active) {
            return;
          }

          const fetchedSavedFoods = snapshot.docs.map((savedFoodDoc) =>
            ensureSavedFood(savedFoodDoc.data() as Partial<SavedFood>, savedFoodDoc.id),
          );
          setSavedFoods(fetchedSavedFoods);
          writeCachedSavedFoods(user.uid, fetchedSavedFoods);
          setAppDataErrors((current) => ({
            ...current,
            savedFoods: null,
          }));
          settle("savedFoods");
        },
        (error) => {
          if (!active) {
            return;
          }

          setAppDataErrors((current) => ({
            ...current,
            savedFoods: getSyncErrorMessage(error, "Deine Favoriten konnten nicht synchronisiert werden."),
          }));
          settle("savedFoods");
        },
      ),
    ];

    return () => {
      active = false;
      unsubs.forEach((unsubscribe) => unsubscribe());
    };
  }, [user]);

  async function saveProfile(nextProfile: UserProfile) {
    if (!user) {
      return;
    }

    const merged = mergeProfileSources(user, nextProfile, latestProfileRef.current);

    if (user.isDemo || appEnv.usingDemoConfig) {
      const nextData = {
        profile: merged,
        meals,
        savedFoods,
      };
      setProfileState(merged);
      saveDemoData(nextData);
      return;
    }

    const now = new Date().toISOString();
    const optimisticProfile = mergeProfileSources(
      user,
      {
        ...merged,
        updatedAt: now,
        createdAt: latestProfileRef.current?.createdAt ?? merged.createdAt ?? now,
      },
      latestProfileRef.current,
    );
    setAppDataErrors((current) => ({
      ...current,
      profileSave: null,
    }));
    setProfileState(optimisticProfile);

    try {
      await setDoc(doc(db, "users", user.uid), optimisticProfile, { merge: true });
    } catch (error) {
      setAppDataErrors((current) => ({
        ...current,
        profileSave: getSyncErrorMessage(error, "Profil wurde lokal gespeichert, konnte aber nicht synchronisiert werden."),
      }));
      throw new Error("Profil wurde lokal gespeichert, konnte aber nicht mit deinem Konto synchronisiert werden.");
    }
  }

  async function saveThemePreference(themePreference: ThemePreference) {
    await saveProfile({
      ...(latestProfileRef.current ?? defaultProfileFromUser(user!)),
      themePreference,
    });
  }

  async function updateMeal(meal: MealRecord, patch: MealUpdateInput) {
    if (!user) {
      return;
    }

    const { photoAssets, ...mealPatch } = patch;
    const now = new Date().toISOString();
    const existingSavedFoodId = meal.savedFoodId ?? meal.id;
    const currentBaseSnapshot = mealSnapshotFromMeal(meal);
    const nextServings = mealPatch.servings ?? meal.servings ?? 1;
    const nextBaseSnapshot = mealPatch.baseSnapshot
      ? createMealSnapshot(mealPatch.baseSnapshot)
      : meal.baseSnapshot
        ? createMealSnapshot(meal.baseSnapshot)
        : currentBaseSnapshot;
    const shouldRecalculateNutrition = mealPatch.baseSnapshot != null;
    const nextScaledSnapshot = shouldRecalculateNutrition
      ? scaleMealSnapshot(nextBaseSnapshot, nextServings)
      : null;
    const nextPhotoAssets = photoAssets ?? undefined;

    const nextPhoto = nextPhotoAssets
      ? user.isDemo || appEnv.usingDemoConfig
        ? {
            storagePath: `data:${nextPhotoAssets.mimeType};base64,${nextPhotoAssets.imageBase64}`,
            thumbPath: `data:${nextPhotoAssets.mimeType};base64,${nextPhotoAssets.imageBase64}`,
          }
        : await uploadMealImages(user.uid, meal.id, nextPhotoAssets)
      : patch.photo !== undefined
        ? patch.photo
        : meal.photo ?? null;

    const nextMeal: MealRecord = {
      ...meal,
      ...mealPatch,
      photo: nextPhoto,
      servings: nextServings,
      baseSnapshot: nextBaseSnapshot,
      ...(shouldRecalculateNutrition
        ? {
            calories: nextScaledSnapshot!.calories,
            macros: nextScaledSnapshot!.macros,
            items: nextScaledSnapshot!.items,
            percentOfDailySpend: computeDailyCoverage(
              nextScaledSnapshot!.calories,
              profile?.dailySpendKcal ?? null,
            ),
          }
        : {}),
      updatedAt: now,
      savedFoodId: patch.savedFoodId ?? meal.savedFoodId ?? null,
    };

    if (user.isDemo || appEnv.usingDemoConfig) {
      const nextSavedFoodId = nextMeal.savedFoodId ?? existingSavedFoodId;
      const nextMeals = meals.map((currentMeal) => (currentMeal.id === meal.id ? nextMeal : currentMeal));
      const nextSavedFoods = nextMeal.favorite && nextSavedFoodId
        ? [
            savedFoodFromMeal(
              { ...nextMeal, savedFoodId: nextSavedFoodId },
              savedFoods.find((item) => item.id === nextSavedFoodId),
            ),
            ...savedFoods.filter((savedFood) => savedFood.id !== nextSavedFoodId),
          ]
        : savedFoods.filter((savedFood) => savedFood.id !== existingSavedFoodId);

      setMeals(nextMeals);
      setSavedFoods(nextSavedFoods);
      saveDemoData({
        profile: profile ?? defaultProfileFromUser(user),
        meals: nextMeals,
        savedFoods: nextSavedFoods,
      });
      return;
    }

    await setDoc(doc(db, `users/${user.uid}/meals`, meal.id), nextMeal, { merge: true });

    if (nextPhotoAssets && meal.photo) {
      await deleteMealImages(meal.photo);
    }

    const nextSavedFoodId = nextMeal.savedFoodId ?? existingSavedFoodId;
    if (nextMeal.favorite && nextSavedFoodId) {
      await setDoc(
        doc(db, `users/${user.uid}/savedFoods`, nextSavedFoodId),
        savedFoodFromMeal(
          { ...nextMeal, savedFoodId: nextSavedFoodId },
          savedFoods.find((item) => item.id === nextSavedFoodId),
        ),
      );
      return;
    }

    if (meal.favorite && existingSavedFoodId) {
      await deleteDoc(doc(db, `users/${user.uid}/savedFoods`, existingSavedFoodId)).catch(() => undefined);
    }
  }

  async function updateMealServings(meal: MealRecord, servings: number) {
    if (!user) {
      return;
    }

    const nextServings = Math.max(1, Math.round(servings));
    const baseSnapshot = mealSnapshotFromMeal(meal);
    const scaledSnapshot = scaleMealSnapshot(baseSnapshot, nextServings);
    const now = new Date().toISOString();
    const existingSavedFoodId = meal.savedFoodId ?? meal.id;
    const nextMeal: MealRecord = {
      ...meal,
      servings: nextServings,
      baseSnapshot,
      calories: scaledSnapshot.calories,
      macros: scaledSnapshot.macros,
      items: scaledSnapshot.items,
      percentOfDailySpend: computeDailyCoverage(scaledSnapshot.calories, profile?.dailySpendKcal ?? null),
      updatedAt: now,
    };

    if (user.isDemo || appEnv.usingDemoConfig) {
      const nextMeals = meals.map((currentMeal) => (currentMeal.id === meal.id ? nextMeal : currentMeal));
      const nextSavedFoods = nextMeal.favorite && nextMeal.savedFoodId
        ? [
            savedFoodFromMeal(
              nextMeal,
              savedFoods.find((item) => item.id === nextMeal.savedFoodId),
            ),
            ...savedFoods.filter((savedFood) => savedFood.id !== nextMeal.savedFoodId),
          ]
        : savedFoods;

      setMeals(nextMeals);
      setSavedFoods(nextSavedFoods);
      saveDemoData({
        profile: profile ?? defaultProfileFromUser(user),
        meals: nextMeals,
        savedFoods: nextSavedFoods,
      });
      return;
    }

    await setDoc(doc(db, `users/${user.uid}/meals`, meal.id), nextMeal, { merge: true });

    if (nextMeal.favorite && nextMeal.savedFoodId) {
      await setDoc(
        doc(db, `users/${user.uid}/savedFoods`, nextMeal.savedFoodId),
        savedFoodFromMeal(
          nextMeal,
          savedFoods.find((item) => item.id === nextMeal.savedFoodId),
        ),
      );
      return;
    }

    if (meal.favorite && existingSavedFoodId) {
      await deleteDoc(doc(db, `users/${user.uid}/savedFoods`, existingSavedFoodId)).catch(() => undefined);
    }
  }

  async function saveMeal(input: SaveMealInput) {
    if (!user) {
      return;
    }

    const baseSnapshot = createMealSnapshot(input.estimate);
    if (user.isDemo || appEnv.usingDemoConfig) {
      const now = new Date().toISOString();
      const mealId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `meal-${Date.now()}`;
      const dataUrl = input.photoAssets
        ? `data:${input.photoAssets.mimeType};base64,${input.photoAssets.imageBase64}`
        : null;
      const mealData: MealRecord = {
        id: mealId,
        source: input.source,
        mealTitle: input.estimate.mealTitle,
        summary: input.estimate.summary,
        items: input.estimate.items,
        calories: input.estimate.calories,
        macros: input.estimate.macros,
        confidence: input.estimate.confidence,
        assumptions: input.estimate.assumptions,
        loggedAt: input.loggedAt ?? now,
        createdAt: now,
        updatedAt: now,
        photo: dataUrl ? { storagePath: dataUrl, thumbPath: dataUrl } : null,
        userContext: input.userContext ?? null,
        transcript: input.transcript ?? null,
        percentOfDailySpend: computeDailyCoverage(input.estimate.calories, profile?.dailySpendKcal ?? null),
        favorite: Boolean(input.favorite),
        savedFoodId: input.favorite ? mealId : null,
        servings: 1,
        baseSnapshot,
      };
      const nextMeals = [mealData, ...meals];
      const nextSavedFoods = input.favorite
        ? [
            {
              id: mealId,
              title: input.estimate.mealTitle,
              summary: input.estimate.summary,
              items: input.estimate.items,
              calories: input.estimate.calories,
              macros: input.estimate.macros,
              defaultServingLabel: input.estimate.items[0]?.portion ?? "1 Portion",
              usageCount: 0,
              lastUsedAt: now,
              linkedMealId: mealId,
              favorite: true,
            },
            ...savedFoods.filter((savedFood) => savedFood.id !== mealId),
          ]
        : savedFoods;
      setMeals(nextMeals);
      setSavedFoods(nextSavedFoods);
      saveDemoData({
        profile: profile ?? defaultProfileFromUser(user),
        meals: nextMeals,
        savedFoods: nextSavedFoods,
      });
      return;
    }

    const mealRef = doc(collection(db, `users/${user.uid}/meals`));
    const now = new Date().toISOString();
    const favorite = Boolean(input.favorite);
    const savedFoodId = favorite ? mealRef.id : null;
    const mealData: MealRecord = {
      id: mealRef.id,
      source: input.source,
      mealTitle: input.estimate.mealTitle,
      summary: input.estimate.summary,
      items: input.estimate.items,
      calories: input.estimate.calories,
      macros: input.estimate.macros,
      confidence: input.estimate.confidence,
      assumptions: input.estimate.assumptions,
      loggedAt: input.loggedAt ?? now,
      createdAt: now,
      updatedAt: now,
      photo: null,
      userContext: input.userContext ?? null,
      transcript: input.transcript ?? null,
      percentOfDailySpend: computeDailyCoverage(
        input.estimate.calories,
        profile?.dailySpendKcal ?? null,
      ),
      favorite,
      savedFoodId,
      servings: 1,
      baseSnapshot,
    };

    const writes: Promise<void>[] = [setDoc(mealRef, mealData)];

    if (favorite) {
      writes.push(
        setDoc(doc(db, `users/${user.uid}/savedFoods`, savedFoodId!), {
          id: savedFoodId,
          title: input.estimate.mealTitle,
          summary: input.estimate.summary,
          items: input.estimate.items,
          calories: input.estimate.calories,
          macros: input.estimate.macros,
          defaultServingLabel: input.estimate.items[0]?.portion ?? "1 Portion",
          usageCount: 0,
          lastUsedAt: now,
          linkedMealId: mealRef.id,
          favorite: true,
        }),
      );
    }

    await Promise.all(writes);

    if (input.photoAssets) {
      uploadMealImages(user.uid, mealRef.id, input.photoAssets).then(
        (photo) => updateDoc(mealRef, { photo }),
        (err) => console.warn("Background image upload failed:", err),
      );
    }
  }

  async function toggleMealFavorite(meal: MealRecord) {
    if (!user) {
      return;
    }

    if (user.isDemo || appEnv.usingDemoConfig) {
      const now = new Date().toISOString();
      const nextMeals = meals.map((currentMeal) =>
        currentMeal.id === meal.id
          ? {
              ...currentMeal,
              favorite: !currentMeal.favorite,
              savedFoodId: currentMeal.favorite ? null : currentMeal.id,
              updatedAt: now,
            }
          : currentMeal,
      );
      const nextSavedFoods = meal.favorite
        ? savedFoods.filter((savedFood) => savedFood.id !== (meal.savedFoodId ?? meal.id))
        : [
            {
              id: meal.id,
              title: meal.mealTitle,
              summary: meal.summary,
              items: meal.items,
              calories: meal.calories,
              macros: meal.macros,
              defaultServingLabel: meal.items[0]?.portion ?? "1 Portion",
              usageCount: 0,
              lastUsedAt: now,
              linkedMealId: meal.id,
              favorite: true,
            },
            ...savedFoods.filter((savedFood) => savedFood.id !== meal.id),
          ];
      setMeals(nextMeals);
      setSavedFoods(nextSavedFoods);
      saveDemoData({
        profile: profile ?? defaultProfileFromUser(user),
        meals: nextMeals,
        savedFoods: nextSavedFoods,
      });
      return;
    }

    const mealRef = doc(db, `users/${user.uid}/meals`, meal.id);
    const savedFoodId = meal.savedFoodId ?? meal.id;

    if (meal.favorite) {
      await updateDoc(mealRef, {
        favorite: false,
        savedFoodId: null,
        updatedAt: new Date().toISOString(),
      });
      await deleteDoc(doc(db, `users/${user.uid}/savedFoods`, savedFoodId));
      return;
    }

    await setDoc(doc(db, `users/${user.uid}/savedFoods`, savedFoodId), {
      id: savedFoodId,
      title: meal.mealTitle,
      summary: meal.summary,
      items: meal.items,
      calories: meal.calories,
      macros: meal.macros,
              defaultServingLabel: meal.items[0]?.portion ?? "1 Portion",
      usageCount: 0,
      lastUsedAt: new Date().toISOString(),
      linkedMealId: meal.id,
      favorite: true,
    });

    await updateDoc(mealRef, {
      favorite: true,
      savedFoodId,
      updatedAt: new Date().toISOString(),
    });
  }

  async function quickLogSavedFood(savedFood: SavedFood, multiplier: number, loggedAt?: string) {
    if (!user) {
      return;
    }

    if (user.isDemo || appEnv.usingDemoConfig) {
      const mealId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `meal-${Date.now()}`;
      const estimate = scaleEstimate(savedFoodToEstimate(savedFood), multiplier);
      const now = new Date().toISOString();
      const mealLoggedAt = loggedAt ?? now;
      const nextMeals: MealRecord[] = [
        {
          id: mealId,
          source: "saved_food",
          mealTitle: estimate.mealTitle,
          summary: estimate.summary,
          items: estimate.items,
          calories: estimate.calories,
          macros: estimate.macros,
          confidence: estimate.confidence,
          assumptions: [`Aus ${savedFood.title} mit Faktor x${multiplier} uebernommen.`],
          loggedAt: mealLoggedAt,
          createdAt: now,
          updatedAt: now,
          photo: null,
          userContext: null,
          transcript: null,
          percentOfDailySpend: computeDailyCoverage(estimate.calories, profile?.dailySpendKcal ?? null),
          favorite: false,
          savedFoodId: null,
          servings: 1,
          baseSnapshot: createMealSnapshot(estimate),
        },
        ...meals,
      ];
      const nextSavedFoods = savedFoods.map((currentSavedFood) =>
        currentSavedFood.id === savedFood.id
          ? {
              ...currentSavedFood,
              usageCount: currentSavedFood.usageCount + 1,
              lastUsedAt: now,
            }
          : currentSavedFood,
      );
      setMeals(nextMeals);
      setSavedFoods(nextSavedFoods);
      saveDemoData({
        profile: profile ?? defaultProfileFromUser(user),
        meals: nextMeals,
        savedFoods: nextSavedFoods,
      });
      return;
    }

    const mealRef = doc(collection(db, `users/${user.uid}/meals`));
    const estimate = scaleEstimate(savedFoodToEstimate(savedFood), multiplier);
    const now = new Date().toISOString();
    const mealLoggedAt = loggedAt ?? now;

    await setDoc(mealRef, {
      id: mealRef.id,
      source: "saved_food",
      mealTitle: estimate.mealTitle,
      summary: estimate.summary,
      items: estimate.items,
      calories: estimate.calories,
      macros: estimate.macros,
      confidence: estimate.confidence,
      assumptions: [`Aus ${savedFood.title} mit Faktor x${multiplier} uebernommen.`],
      loggedAt: mealLoggedAt,
      createdAt: now,
      updatedAt: now,
      photo: null,
      userContext: null,
      transcript: null,
      percentOfDailySpend: computeDailyCoverage(estimate.calories, profile?.dailySpendKcal ?? null),
      favorite: false,
      savedFoodId: null,
      servings: 1,
      baseSnapshot: createMealSnapshot(estimate),
    });

    await updateDoc(doc(db, `users/${user.uid}/savedFoods`, savedFood.id), {
      usageCount: savedFood.usageCount + 1,
      lastUsedAt: now,
    });
  }

  async function deleteMeal(meal: MealRecord) {
    if (!user) {
      return;
    }

    if (user.isDemo || appEnv.usingDemoConfig) {
      const nextMeals = meals.filter((currentMeal) => currentMeal.id !== meal.id);
      const nextSavedFoods = savedFoods.filter((savedFood) => savedFood.id !== meal.savedFoodId);
      setMeals(nextMeals);
      setSavedFoods(nextSavedFoods);
      saveDemoData({
        profile: profile ?? defaultProfileFromUser(user),
        meals: nextMeals,
        savedFoods: nextSavedFoods,
      });
      return;
    }

    await deleteDoc(doc(db, `users/${user.uid}/meals`, meal.id));
    await deleteMealImages(meal.photo);

    if (meal.savedFoodId) {
      await deleteDoc(doc(db, `users/${user.uid}/savedFoods`, meal.savedFoodId)).catch(() => undefined);
    }
  }

  const syncError = useMemo(() => getAppDataSyncError(appDataErrors), [appDataErrors]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      profile,
      meals,
      savedFoods,
      loading,
      syncError,
      saveProfile,
      saveThemePreference,
      saveMeal,
      updateMeal,
      updateMealServings,
      toggleMealFavorite,
      quickLogSavedFood,
      deleteMeal,
    }),
    [loading, meals, profile, savedFoods, syncError],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return value;
}

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) {
    throw new Error("useAppData must be used within AppDataProvider.");
  }

  return value;
}
