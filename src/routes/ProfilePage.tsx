import { useEffect, useState } from "react";
import type { ActivityLevel, BiologicalSex, ThemePreference, UnitSystem, UserProfile } from "../../shared/models";
import { useAppData, useAuth } from "../app/contexts";
import { formatCalories } from "../lib/format";

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
  sedentary: "Sedentary",
  light: "Lightly active",
  moderate: "Moderately active",
  active: "Active",
  very_active: "Very active",
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
  const { profile, saveProfile } = useAppData();
  const { signOutUser, user } = useAuth();
  const [formState, setFormState] = useState<ProfileFormState>(toFormState(profile));
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setFormState(toFormState(profile));
  }, [profile]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

    await saveProfile(nextProfile);
    setStatus("Profile saved.");
    window.setTimeout(() => setStatus(null), 3000);
  }

  return (
    <div className="page-stack">
      <section className="section-card">
        <div className="section-card__header">
          <h1>Profile</h1>
        </div>
        <div className="stats-grid">
          <article className="stat-card">
            <span>Daily</span>
            <strong>{profile?.dailySpendKcal ? formatCalories(profile.dailySpendKcal) : "Incomplete"}</strong>
            <p>
              {profile?.dailySpendKcal
                ? "Estimated spend"
                : "Add age, sex, height, weight, and activity to calculate TDEE"}
            </p>
          </article>
          <article className="stat-card">
            <span>Account</span>
            <strong>{user?.displayName ?? "Acorn"}</strong>
            <p>{user?.email ?? ""}</p>
          </article>
        </div>
      </section>

      <form className="section-card form-grid" onSubmit={handleSubmit}>
        <div className="section-card__header">
          <h2>Details</h2>
        </div>

        <label>
          Theme
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
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>

        <label>
          Units
          <select
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                units: event.target.value as UnitSystem,
              }))
            }
            value={formState.units}
          >
            <option value="metric">Metric</option>
            <option value="imperial">Imperial</option>
          </select>
        </label>

        <label>
          Age
          <input
            inputMode="numeric"
            onChange={(event) => setFormState((current) => ({ ...current, age: event.target.value }))}
            placeholder="29"
            type="number"
            value={formState.age}
          />
        </label>

        <label>
          Sex
          <select
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                sex: event.target.value as BiologicalSex | "",
              }))
            }
            value={formState.sex}
          >
            <option value="">Select</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </label>

        <label>
          Height ({formState.units === "metric" ? "cm" : "in"})
          <input
            inputMode="decimal"
            onChange={(event) => setFormState((current) => ({ ...current, height: event.target.value }))}
            placeholder={formState.units === "metric" ? "170" : "67"}
            type="number"
            value={formState.height}
          />
        </label>

        <label>
          Weight ({formState.units === "metric" ? "kg" : "lb"})
          <input
            inputMode="decimal"
            onChange={(event) => setFormState((current) => ({ ...current, weight: event.target.value }))}
            placeholder={formState.units === "metric" ? "68" : "150"}
            type="number"
            value={formState.weight}
          />
        </label>

        <label>
          Activity level
          <select
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                activityLevel: event.target.value as ActivityLevel | "",
              }))
            }
            value={formState.activityLevel}
          >
            <option value="">Select</option>
            {Object.entries(activityLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className="sheet__actions">
          <button className="primary-button" type="submit">
            Save profile
          </button>
          <button className="secondary-button" onClick={() => void signOutUser()} type="button">
            Sign out
          </button>
        </div>
        {status ? <p className="status-text">{status}</p> : null}
      </form>
    </div>
  );
}
