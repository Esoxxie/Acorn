import { useEffect } from "react";
import { Camera, Plus, Library, UserRound } from "lucide-react";
import { BrowserRouter, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { AppDataProvider, AuthProvider, useAppData, useAuth } from "./contexts";
import { LogFlowProvider, useLogFlow } from "../features/log/LogFlow";
import { AcornLogo } from "../components/AcornLogo";
import { AuthPage } from "../routes/AuthPage";
import { LibraryPage } from "../routes/LibraryPage";
import { ProfilePage } from "../routes/ProfilePage";
import { TodayPage } from "../routes/TodayPage";
import { uiCopy } from "../lib/copy";
import { applyThemePreference, getStoredThemePreference, setStoredThemePreference } from "../lib/theme";

function LoadingScreen() {
  return (
    <main className="auth-page">
      <section className="hero-card hero-card--compact hero-card--loading">
        <AcornLogo />
      </section>
    </main>
  );
}

function AppShell() {
  const { openLogFlow } = useLogFlow();
  const { syncError } = useAppData();

  return (
    <div className="shell">
      <header className="topbar">
        <AcornLogo compact />
        <button className="pill-button topbar__add-button" onClick={openLogFlow} type="button">
          <Plus size={16} />
          {uiCopy.nav.add}
        </button>
      </header>

      {syncError ? <div className="inline-error">{syncError}</div> : null}

      <main className="shell__main">
        <Routes>
          <Route element={<TodayPage />} path="/" />
          <Route element={<LibraryPage />} path="/library" />
          <Route element={<ProfilePage />} path="/profile" />
          <Route element={<Navigate replace to="/" />} path="*" />
        </Routes>
      </main>

      <button className="floating-log-button" onClick={openLogFlow} type="button" aria-label={uiCopy.nav.add}>
        <Plus size={18} />
      </button>

      <nav className="bottom-nav">
        <NavLink className={({ isActive }) => `bottom-nav__item ${isActive ? "is-active" : ""}`} end to="/">
          <Camera size={18} />
          <span>{uiCopy.nav.today}</span>
        </NavLink>
        <NavLink className={({ isActive }) => `bottom-nav__item ${isActive ? "is-active" : ""}`} to="/library">
          <Library size={18} />
          <span>{uiCopy.nav.library}</span>
        </NavLink>
        <NavLink className={({ isActive }) => `bottom-nav__item ${isActive ? "is-active" : ""}`} to="/profile">
          <UserRound size={18} />
          <span>{uiCopy.nav.profile}</span>
        </NavLink>
      </nav>
    </div>
  );
}

function ThemeSync() {
  const { profile } = useAppData();

  useEffect(() => {
    const nextTheme = profile?.themePreference ?? getStoredThemePreference();
    setStoredThemePreference(nextTheme);
    applyThemePreference(nextTheme);
  }, [profile?.themePreference]);

  return null;
}

function RoutedApp() {
  const { loading, user } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <AppDataProvider key={user.uid}>
      <ThemeSync />
      <LogFlowProvider>
        <AppShell />
      </LogFlowProvider>
    </AppDataProvider>
  );
}

export function App() {
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => {
      applyThemePreference(getStoredThemePreference());
    };

    syncTheme();
    mediaQuery.addEventListener("change", syncTheme);

    return () => {
      mediaQuery.removeEventListener("change", syncTheme);
    };
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <RoutedApp />
      </BrowserRouter>
    </AuthProvider>
  );
}
