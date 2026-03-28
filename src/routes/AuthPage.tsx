import { ArrowRight } from "lucide-react";
import { useAuth } from "../app/contexts";
import { appEnv } from "../lib/env";
import { AcornLogo } from "../components/AcornLogo";
import { uiCopy } from "../lib/copy";

export function AuthPage() {
  const { authError, signIn, signInDemo } = useAuth();
  const isLocalDemo = appEnv.usingDemoConfig;

  return (
    <main className="auth-page">
      <section className="hero-card hero-card--auth">
        <AcornLogo />
        <h1>{uiCopy.auth.heading}</h1>

        <div className="hero-card__actions">
          <button className="primary-button" onClick={() => void signIn()} type="button">
            {isLocalDemo ? uiCopy.auth.startDemo : uiCopy.auth.continueGoogle}
            <ArrowRight size={18} />
          </button>
          {!isLocalDemo ? (
            <button className="secondary-button" onClick={() => void signInDemo()} type="button">
              {uiCopy.auth.tryDemo}
            </button>
          ) : null}
        </div>
        {authError ? <div className="inline-error">{authError}</div> : null}
      </section>
    </main>
  );
}
