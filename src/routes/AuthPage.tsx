import { ArrowRight } from "lucide-react";
import { useAuth } from "../app/contexts";
import { appEnv } from "../lib/env";
import { AcornLogo } from "../components/AcornLogo";

export function AuthPage() {
  const { signIn, signInDemo } = useAuth();
  const isLocalDemo = appEnv.usingDemoConfig;

  return (
    <main className="auth-page">
      <section className="hero-card hero-card--auth">
        <AcornLogo />
        <h1>Photo-first calorie tracking.</h1>
        <p>Fast, quiet, and easy to keep up with.</p>

        <div className="hero-card__actions">
          <button className="primary-button" onClick={() => void signIn()} type="button">
            {isLocalDemo ? "Enter local demo" : "Continue with Google"}
            <ArrowRight size={18} />
          </button>
          {!isLocalDemo ? (
            <button className="secondary-button" onClick={() => void signInDemo()} type="button">
              Try demo
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}
