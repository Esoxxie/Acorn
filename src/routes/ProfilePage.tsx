import { useEffect, useState } from "react";
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
            <p>{uiCopy.profile.loadingSaved}</p>
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

  return (
    <div className="page-stack">
      <section className="section-card">
        <div className="section-card__header">
          <h1>Profil</h1>
          <p>{uiCopy.profile.intro}</p>
        </div>

        <div className="stats-grid">
          <article className="stat-card">
            <span>{uiCopy.profile.dailyTarget}</span>
            <strong>{profile.dailySpendKcal ? formatCalories(profile.dailySpendKcal) : uiCopy.profile.incomplete}</strong>
            <p>
              {profile.dailySpendKcal
                ? uiCopy.profile.calculatedFromProfile
                : uiCopy.profile.completeProfileHint}
            </p>
          </article>
          <article className="stat-card">
            <span>{uiCopy.profile.account}</span>
            <strong>{user?.displayName ?? "Acorn"}</strong>
            <p>{user?.email ?? "Lokale Demo"}</p>
          </article>
        </div>
      </section>

      <section className="section-card">
        <div className="section-card__header">
          <h2>{uiCopy.profile.app}</h2>
        </div>
        <div className="sheet__actions">
          {updateAvailable ? (
            <button className="primary-button" onClick={() => void applyUpdate()} type="button">
              {uiCopy.profile.reload}
            </button>
          ) : (
            <button className="secondary-button" disabled={checking} onClick={() => void checkForUpdate()} type="button">
              {checking ? uiCopy.profile.checkingUpdates : uiCopy.profile.checkUpdates}
            </button>
          )}
        </div>
      </section>

      <form className="section-card form-grid" onSubmit={handleSubmit}>
        <div className="section-card__header">
          <h2>{uiCopy.profile.settings}</h2>
        </div>

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

        <div className="sheet__actions">
          <button className="primary-button" type="submit">
            {uiCopy.profile.save}
          </button>
          <button className="secondary-button" onClick={() => void signOutUser()} type="button">
            {uiCopy.profile.signOut}
          </button>
        </div>
        {status ? <p className="status-text">{status}</p> : null}
      </form>
    </div>
  );
}
