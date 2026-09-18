"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Dashboard } from "./dashboard";

const USUARIOS: Record<string, string> = {
  hernan: "hernan.quiroga@olavarria.gov.ar",
};

export function AppGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });

    const { data } = supabase.auth.onAuthStateChange(
      (_event, next) => setSession(next)
    );

    return () => data.subscription.unsubscribe();
  }, []);

  async function login(event: React.FormEvent) {
    event.preventDefault();

    setSending(true);
    setError("");

    const usuarioNormalizado = usuario
      .trim()
      .toLowerCase();

    const email = USUARIOS[usuarioNormalizado];

    if (!email) {
      setError("Usuario no reconocido.");
      setSending(false);
      return;
    }

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError) {
      setError(
        "No se pudo ingresar. Revis\u00e1 el usuario y la contrase\u00f1a."
      );
    }

    setSending(false);
  }

  if (checking) {
    return (
      <div className="center-screen">
        <div className="loader" />
      </div>
    );
  }

  if (session) {
    return (
      <Dashboard
        userEmail={session.user.email ?? ""}
      />
    );
  }

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="brand-mark large">FC</div>

        <p className="eyebrow light">
          {"ORGANIZACI\u00d3N Y SEGUIMIENTO"}
        </p>

        <h1>Frente Cultura</h1>

        <p>
          {
            "Un espacio compartido para coordinar el equipo, registrar el trabajo territorial y seguir cada meta."
          }
        </p>
      </section>

      <section className="login-card">
        <div>
          <p className="eyebrow">
            ACCESO AL EQUIPO
          </p>

          <h2>Ingresar</h2>

          <p className="muted">
            {
              "Us\u00e1 tu usuario y contrase\u00f1a para ingresar."
            }
          </p>
        </div>

        <form onSubmit={login}>
          <label>
            Usuario

            <input
              type="text"
              value={usuario}
              onChange={(e) =>
                setUsuario(e.target.value)
              }
              autoComplete="username"
              required
            />
          </label>

          <label>
            {"Contrase\u00f1a"}

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              autoComplete="current-password"
              required
            />
          </label>

          {error && (
            <p className="form-error">
              {error}
            </p>
          )}

          <button
            className="primary wide"
            disabled={sending}
          >
            {sending
              ? "Ingresando..."
              : "Ingresar"}
          </button>
        </form>
      </section>
    </main>
  );
}