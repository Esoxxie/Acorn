import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ActivityLevel, BiologicalSex, ThemePreference, UnitSystem, UserProfile } from "../../shared/models";
import { useAppData, useAuth } from "../app/contexts";
import { uiCopy } from "../lib/copy";
import { formatCalories } from "../lib/format";
import { usePwaUpdateState } from "../lib/pwa-update";

type ProfileFormState = {
  units: UnitSystem;
  themePreference: ThemePreference;
  age: string;
  sex: BiologicalSex | "";
  height: string;
  weight: string;
  activityLevel: ActivityLevel | "";
  goalMode: "calculated" | "manual";
  manualCalorieGoal: string;
  manualProteinGoal: string;
  manualCarbGoal: string;
  manualFatGoal: string;
};

const activityLabels: Record<ActivityLevel, string> = {
  sedentary: "Sitzend",
  light: "Leicht aktiv",
  moderate: "Moderat aktiv",
  active: "Aktiv",
  very_active: "Sehr aktiv",
};

function toFormState(profile: UserProfile | null): ProfileFormState {
  const units = profile?.units ?? "metric";
  const height = profile?.heightCm
    ? units === "imperial"
      ? (profile.heightCm / 2.54).toFixed(1)
      : String(profile.heightCm)
    : "";
  const weight = profile?.weightKg
    ? units === "imperial"
      ? (profile.weightKg / 0.45359237).toFixed(1)
      : String(profile.weightKg)
    : "";

  return {
    units,
    themePreference: profile?.themePreference ?? "system",
    age: profile?.age ? String(profile.age) : "",
    sex: profile?.sex ?? "",
    height,
    weight,
    activityLevel: profile?.activityLevel ?? "",
    goalMode: profile?.goalMode ?? "calculated",
    manualCalorieGoal: profile?.manualCalorieGoal ? String(profile.manualCalorieGoal) : "",
    manualProteinGoal: profile?.manualProteinGoal ? String(profile.manualProteinGoal) : "",
    manualCarbGoal: profile?.manualCarbGoal ? String(profile.manualCarbGoal) : "",
    manualFatGoal: profile?.manualFatGoal ? String(profile.manualFatGoal) : "",
  };
}

export function ProfilePage() {
  const { profile, saveProfile, loading, syncError } = useAppData();
  const { signOutUser, user } = useAuth();
  const { checking, updateAvailable, checkForUpdate, applyUpdate } = usePwaUpdateState();
  const [formState, setFormState] = useState<ProfileFormState>(toFormState(profile));
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setFormState(toFormState(profile));
  }, [profile]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    const heightValue = Number(formState.height);
    const weightValue = Number(formState.weight);
    const nextProfile: UserProfile = {
      displayName: user?.displayName ?? profile?.displayName ?? null,
      email: user?.email ?? profile?.email ?? null,
      units: formState.units,
      themePreference: formState.themePreference,
      age: formState.age ? Number(formState.age) : null,
      sex: formState.sex || null,
      heightCm: formState.height
        ? formState.units === "imperial"
          ? Math.round(heightValue * 2.54 * 10) / 10
          : heightValue
        : null,
      weightKg: formState.weight
        ? formState.units === "imperial"
          ? Math.round(weightValue * 0.45359237 * 10) / 10
          : weightValue
        : null,
      activityLevel: formState.activityLevel || null,
      dailySpendKcal: profile?.dailySpendKcal ?? null,
      createdAt: profile?.createdAt ?? null,
      updatedAt: profile?.updatedAt ?? null,
      goalMode: formState.goalMode,
      manualCalorieGoal: formState.manualCalorieGoal ? Number(formState.manualCalorieGoal) : null,
      manualProteinGoal: formState.manualProteinGoal ? Number(formState.manualProteinGoal) : null,
      manualCarbGoal: formState.manualCarbGoal ? Number(formState.manualCarbGoal) : null,
      manualFatGoal: formState.manualFatGoal ? Number(formState.manualFatGoal) : null,
    };

    try {
      await saveProfile(nextProfile);
      setStatus(uiCopy.profile.saved);
      window.setTimeout(() => setStatus(null), 3000);
    } catch {
      setStatus(null);
    }
  }

  if (loading && !profile) {
    return (
      <div className="page-stack">
        <section className="section-card">
          <div className="section-card__header">
            <h1>Profil</h1>
          </div>
          <div className="empty-state">{uiCopy.profile.loading}</div>
        </section>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-stack">
        <section className="section-card">
          <div className="section-card__header">
            <h1>Profil</h1>
            <p>{uiCopy.profile.missing}</p>
          </div>
          <div className="inline-error">
            {syncError ?? uiCopy.profile.syncLag}
          </div>
          <div className="sheet__actions">
            <button className="secondary-button" onClick={() => void signOutUser()} type="button">
              {uiCopy.profile.signOut}
            </button>
          </div>
        </section>
      </div>
    );
  }

  const activeSpend = profile.goalMode === "manual"
    ? (profile.manualCalorieGoal ?? profile.dailySpendKcal ?? null)
    : (profile.dailySpendKcal ?? null);

  const hasCompleteCalculatedProfile = Boolean(
    profile.age &&
    profile.sex &&
    profile.heightCm &&
    profile.weightKg &&
    profile.activityLevel
  );

  // Dynamic placeholder calculation for custom goal macros
  const customCalories = formState.manualCalorieGoal ? Number(formState.manualCalorieGoal) : 0;
  const placeholderProtein = customCalories > 0 ? Math.round((customCalories * 0.25) / 4) : 125;
  const placeholderFat = customCalories > 0 ? Math.round((customCalories * 0.25) / 9) : 56;
  const placeholderCarbs = customCalories > 0 ? Math.round((customCalories * 0.5) / 4) : 250;

  return (
    <div className="page-stack">
      {/* Minimal Header and Stats Dashboard */}
      <div className="profile-header">
        <h1>Profil</h1>
      </div>

      <div className="stats-grid stats-grid--compact">
        <article className="stat-card">
          <span>Tagesziel</span>
          <strong>{activeSpend ? `${formatCalories(activeSpend)}` : "Nicht definiert"}</strong>
          <small style={{ color: "var(--text-muted)", fontSize: "var(--font-size-caption)", fontWeight: 700 }}>
            {profile.goalMode === "manual" ? "Selbst festgelegt" : "Berechnet"}
          </small>
        </article>
        <article className="stat-card">
          <span>Konto</span>
          <strong>{user?.displayName ?? "Acorn"}</strong>
          <small style={{ color: "var(--text-muted)", fontSize: "var(--font-size-caption)", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.email ?? "Lokale Demo"}
          </small>
        </article>
      </div>

      {/* Main Settings Form */}
      <form className="page-stack" onSubmit={handleSubmit}>
        <section className="section-card form-grid">
          {/* Segmented Control for Goal Mode */}
          <div className="segmented-control">
            <button
              className={`segmented-control__button ${formState.goalMode === "calculated" ? "segmented-control__button--active" : ""}`}
              onClick={() => setFormState((current) => ({ ...current, goalMode: "calculated" }))}
              type="button"
            >
              Berechnen
            </button>
            <button
              className={`segmented-control__button ${formState.goalMode === "manual" ? "segmented-control__button--active" : ""}`}
              onClick={() => setFormState((current) => ({ ...current, goalMode: "manual" }))}
              type="button"
            >
              Selbst festlegen
            </button>
          </div>

          {formState.goalMode === "manual" ? (
            <div className="stack" style={{ gap: "12px" }}>
              <label>
                Kalorien (kcal)
                <input
                  inputMode="numeric"
                  onChange={(event) => setFormState((current) => ({ ...current, manualCalorieGoal: event.target.value }))}
                  placeholder="z.B. 2000"
                  type="number"
                  value={formState.manualCalorieGoal}
                />
              </label>

              <div className="profile-macro-grid">
                <label>
                  Protein (g)
                  <input
                    inputMode="numeric"
                    onChange={(event) => setFormState((current) => ({ ...current, manualProteinGoal: event.target.value }))}
                    placeholder={`${placeholderProtein}g`}
                    type="number"
                    value={formState.manualProteinGoal}
                  />
                </label>
                <label>
                  KH (g)
                  <input
                    inputMode="numeric"
                    onChange={(event) => setFormState((current) => ({ ...current, manualCarbGoal: event.target.value }))}
                    placeholder={`${placeholderCarbs}g`}
                    type="number"
                    value={formState.manualCarbGoal}
                  />
                </label>
                <label>
                  Fett (g)
                  <input
                    inputMode="numeric"
                    onChange={(event) => setFormState((current) => ({ ...current, manualFatGoal: event.target.value }))}
                    placeholder={`${placeholderFat}g`}
                    type="number"
                    value={formState.manualFatGoal}
                  />
                </label>
              </div>
            </div>
          ) : (
            <details className="bmr-calculator-details" open={!hasCompleteCalculatedProfile}>
              <summary>
                <span>Energiebedarf berechnen</span>
                <ChevronDown size={14} />
              </summary>
              <div className="bmr-calculator-details__content">
                <label>
                  {uiCopy.profile.age}
                  <input
                    inputMode="numeric"
                    onChange={(event) => setFormState((current) => ({ ...current, age: event.target.value }))}
                    placeholder="29"
                    type="number"
                    value={formState.age}
                  />
                </label>

                <label>
                  {uiCopy.profile.sex}
                  <select
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        sex: event.target.value as BiologicalSex | "",
                      }))
                    }
                    value={formState.sex}
                  >
                    <option value="">{uiCopy.profile.select}</option>
                    <option value="female">{uiCopy.profile.female}</option>
                    <option value="male">{uiCopy.profile.male}</option>
                  </select>
                </label>

                <label>
                  {uiCopy.profile.height} ({formState.units === "metric" ? "cm" : "in"})
                  <input
                    inputMode="decimal"
                    onChange={(event) => setFormState((current) => ({ ...current, height: event.target.value }))}
                    placeholder={formState.units === "metric" ? "170" : "67"}
                    type="number"
                    value={formState.height}
                  />
                </label>

                <label>
                  {uiCopy.profile.weight} ({formState.units === "metric" ? "kg" : "lb"})
                  <input
                    inputMode="decimal"
                    onChange={(event) => setFormState((current) => ({ ...current, weight: event.target.value }))}
                    placeholder={formState.units === "metric" ? "68" : "150"}
                    type="number"
                    value={formState.weight}
                  />
                </label>

                <label>
                  {uiCopy.profile.activity}
                  <select
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        activityLevel: event.target.value as ActivityLevel | "",
                      }))
                    }
                    value={formState.activityLevel}
                  >
                    <option value="">{uiCopy.profile.select}</option>
                    {Object.entries(activityLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </details>
          )}
        </section>

        {/* System Settings & Theme */}
        <section className="section-card form-grid">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <label>
              {uiCopy.profile.appearance}
              <select
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    themePreference: event.target.value as ThemePreference,
                  }))
                }
                value={formState.themePreference}
              >
                <option value="system">System</option>
                <option value="light">Hell</option>
                <option value="dark">Dunkel</option>
              </select>
            </label>

            <label>
              {uiCopy.profile.units}
              <select
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    units: event.target.value as UnitSystem,
                  }))
                }
                value={formState.units}
              >
                <option value="metric">{uiCopy.profile.metric}</option>
                <option value="imperial">{uiCopy.profile.imperial}</option>
              </select>
            </label>
          </div>

          <div className="profile-app-updates-row">
            <span>Updates</span>
            {updateAvailable ? (
              <button className="primary-button" onClick={() => void applyUpdate()} type="button" style={{ minHeight: "36px", height: "36px", padding: "0 12px", borderRadius: "10px", fontSize: "0.85rem" }}>
                {uiCopy.profile.reload}
              </button>
            ) : (
              <button
                className="secondary-button"
                disabled={checking}
                onClick={() => void checkForUpdate()}
                type="button"
                style={{ minHeight: "36px", height: "36px", padding: "0 12px", borderRadius: "10px", fontSize: "0.85rem" }}
              >
                {checking ? uiCopy.profile.checkingUpdates : "Prüfen"}
              </button>
            )}
          </div>
        </section>

        {/* Action Buttons */}
        <div className="sheet__actions" style={{ marginTop: "8px" }}>
          <button className="primary-button" type="submit" style={{ flex: 1.5 }}>
            {uiCopy.profile.save}
          </button>
          <button className="secondary-button" onClick={() => void signOutUser()} type="button">
            {uiCopy.profile.signOut}
          </button>
        </div>

        {status ? <p className="status-text" style={{ textAlign: "center", marginTop: "4px" }}>{status}</p> : null}
      </form>
    </div>
  );
}
