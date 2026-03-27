import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  collection,
  deleteDoc,
  doc,
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
import { calculateTdee, computeDailyCoverage, savedFoodToEstimate, scaleEstimate } from "../../shared/calorie";
import { createSeededDemoData } from "../lib/demo-data";
import {
  auth,
  db,
  startGoogleSignIn,
} from "../lib/firebase";
import { deleteMealImages, uploadMealImages } from "../lib/storage";
import type { PreparedImageAssets } from "../lib/image";
import { appEnv } from "../lib/env";

type SessionUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  isDemo?: boolean;
};

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
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
};

type AppDataContextValue = {
  profile: UserProfile | null;
  meals: MealRecord[];
  savedFoods: SavedFood[];
  loading: boolean;
  saveProfile: (profile: UserProfile) => Promise<void>;
  saveThemePreference: (themePreference: ThemePreference) => Promise<void>;
  saveMeal: (input: SaveMealInput) => Promise<void>;
  toggleMealFavorite: (meal: MealRecord) => Promise<void>;
  quickLogSavedFood: (savedFood: SavedFood, multiplier: number) => Promise<void>;
  deleteMeal: (meal: MealRecord) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const AppDataContext = createContext<AppDataContextValue | null>(null);
const DEMO_SESSION_KEY = "acorn.demo.session";
const DEMO_DATA_KEY = "acorn.demo.data";

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
  };
}

function ensureSavedFood(raw: Partial<SavedFood>, id: string): SavedFood {
  return {
    id,
    title: raw.title ?? "Saved food",
    summary: raw.summary ?? "",
    items: raw.items ?? [],
    calories: raw.calories ?? 0,
    macros: raw.macros ?? { protein: 0, carbs: 0, fat: 0, fiber: null },
    defaultServingLabel: raw.defaultServingLabel ?? "1 serving",
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

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

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

      if (!sessionUser) {
        return;
      }

      const now = new Date().toISOString();
      await setDoc(
        doc(db, "users", sessionUser.uid),
        {
          ...defaultProfileFromUser(sessionUser),
          updatedAt: now,
          createdAt: now,
        },
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

        await startGoogleSignIn();
      },
      signOutUser: async () => {
        if (user?.isDemo || appEnv.usingDemoConfig) {
          saveDemoUser(null);
          setUser(null);
          return;
        }

        await signOut(auth);
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
      },
      isEmulatorMode: appEnv.useEmulators,
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AppDataProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [savedFoods, setSavedFoods] = useState<SavedFood[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (user.isDemo || appEnv.usingDemoConfig) {
      const demoData = loadDemoData(user);
      setProfile(demoData.profile);
      setMeals(demoData.meals);
      setSavedFoods(demoData.savedFoods);
      setLoading(false);
      return;
    }

    let pending = 3;
    const settle = () => {
      pending -= 1;
      if (pending <= 0) {
        setLoading(false);
      }
    };

    setLoading(true);

    const unsubs = [
      onSnapshot(doc(db, "users", user.uid), (snapshot) => {
        const rawProfile = snapshot.exists() ? (snapshot.data() as UserProfile) : defaultProfileFromUser(user);
        setProfile(normalizeProfile(rawProfile, user));
        settle();
      }),
      onSnapshot(
        query(collection(db, `users/${user.uid}/meals`), orderBy("loggedAt", "desc")),
        (snapshot) => {
          setMeals(snapshot.docs.map((mealDoc) => ensureMeal(mealDoc.data() as Partial<MealRecord>, mealDoc.id)));
          settle();
        },
      ),
      onSnapshot(
        query(collection(db, `users/${user.uid}/savedFoods`), orderBy("usageCount", "desc")),
        (snapshot) => {
          setSavedFoods(
            snapshot.docs.map((savedFoodDoc) =>
              ensureSavedFood(savedFoodDoc.data() as Partial<SavedFood>, savedFoodDoc.id),
            ),
          );
          settle();
        },
      ),
    ];

    return () => {
      unsubs.forEach((unsubscribe) => unsubscribe());
    };
  }, [user]);

  async function saveProfile(nextProfile: UserProfile) {
    if (!user) {
      return;
    }

    const merged = normalizeProfile(nextProfile, user);

    if (user.isDemo || appEnv.usingDemoConfig) {
      const nextData = {
        profile: merged,
        meals,
        savedFoods,
      };
      setProfile(merged);
      saveDemoData(nextData);
      return;
    }

    const now = new Date().toISOString();
    await setDoc(
      doc(db, "users", user.uid),
      {
        ...merged,
        updatedAt: now,
        createdAt: profile?.createdAt ?? now,
      },
      { merge: true },
    );
  }

  async function saveThemePreference(themePreference: ThemePreference) {
    await saveProfile({
      ...(profile ?? defaultProfileFromUser(user!)),
      themePreference,
    });
  }

  async function saveMeal(input: SaveMealInput) {
    if (!user) {
      return;
    }

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
        loggedAt: now,
        createdAt: now,
        updatedAt: now,
        photo: dataUrl ? { storagePath: dataUrl, thumbPath: dataUrl } : null,
        userContext: input.userContext ?? null,
        transcript: input.transcript ?? null,
        percentOfDailySpend: computeDailyCoverage(input.estimate.calories, profile?.dailySpendKcal ?? null),
        favorite: Boolean(input.favorite),
        savedFoodId: input.favorite ? mealId : null,
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
              defaultServingLabel: input.estimate.items[0]?.portion ?? "1 serving",
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
    const photo = input.photoAssets ? await uploadMealImages(user.uid, mealRef.id, input.photoAssets) : null;
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
      loggedAt: now,
      createdAt: now,
      updatedAt: now,
      photo,
      userContext: input.userContext ?? null,
      transcript: input.transcript ?? null,
      percentOfDailySpend: computeDailyCoverage(
        input.estimate.calories,
        profile?.dailySpendKcal ?? null,
      ),
      favorite,
      savedFoodId,
    };

    await setDoc(mealRef, mealData);

    if (favorite) {
      await setDoc(doc(db, `users/${user.uid}/savedFoods`, savedFoodId!), {
        id: savedFoodId,
        title: input.estimate.mealTitle,
        summary: input.estimate.summary,
        items: input.estimate.items,
        calories: input.estimate.calories,
        macros: input.estimate.macros,
        defaultServingLabel: input.estimate.items[0]?.portion ?? "1 serving",
        usageCount: 0,
        lastUsedAt: now,
        linkedMealId: mealRef.id,
        favorite: true,
      });
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
              defaultServingLabel: meal.items[0]?.portion ?? "1 serving",
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
      defaultServingLabel: meal.items[0]?.portion ?? "1 serving",
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

  async function quickLogSavedFood(savedFood: SavedFood, multiplier: number) {
    if (!user) {
      return;
    }

    if (user.isDemo || appEnv.usingDemoConfig) {
      const mealId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `meal-${Date.now()}`;
      const estimate = scaleEstimate(savedFoodToEstimate(savedFood), multiplier);
      const now = new Date().toISOString();
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
          assumptions: [`Logged from ${savedFood.title} at x${multiplier}.`],
          loggedAt: now,
          createdAt: now,
          updatedAt: now,
          photo: null,
          userContext: null,
          transcript: null,
          percentOfDailySpend: computeDailyCoverage(estimate.calories, profile?.dailySpendKcal ?? null),
          favorite: false,
          savedFoodId: null,
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

    await setDoc(mealRef, {
      id: mealRef.id,
      source: "saved_food",
      mealTitle: estimate.mealTitle,
      summary: estimate.summary,
      items: estimate.items,
      calories: estimate.calories,
      macros: estimate.macros,
      confidence: estimate.confidence,
      assumptions: [`Logged from ${savedFood.title} at x${multiplier}.`],
      loggedAt: now,
      createdAt: now,
      updatedAt: now,
      photo: null,
      userContext: null,
      transcript: null,
      percentOfDailySpend: computeDailyCoverage(estimate.calories, profile?.dailySpendKcal ?? null),
      favorite: false,
      savedFoodId: null,
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

  const value = useMemo<AppDataContextValue>(
    () => ({
      profile,
      meals,
      savedFoods,
      loading,
      saveProfile,
      saveThemePreference,
      saveMeal,
      toggleMealFavorite,
      quickLogSavedFood,
      deleteMeal,
    }),
    [loading, meals, profile, savedFoods],
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
