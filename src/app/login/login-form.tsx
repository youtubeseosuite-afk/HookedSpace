// src/app/login/login-form.tsx
// OPDATERET (besked til bortviste brugere). Login-formular: log ind / opret profil med email og adgangskode, eller med Google.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

function translateError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Forkert email eller adgangskode.";
  if (m.includes("email not confirmed")) return "Du skal bekræfte din email først. Tjek din indbakke.";
  if (m.includes("already registered")) return "Der findes allerede en profil med den email.";
  if (m.includes("password should be at least")) return "Adgangskoden skal være mindst 8 tegn.";
  if (m.includes("banned")) return "Din profil er bortvist fra HookedSpace. Kontakt os, hvis du mener, det er en fejl.";
  if (m.includes("rate limit")) return "For mange forsøg. Vent lidt og prøv igen.";
  if (m.includes("valid email") || m.includes("invalid format")) return "Skriv en gyldig email.";
  return "Noget gik galt. Prøv igen.";
}

export default function LoginForm({ next, callbackError }: { next: string; callbackError: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    callbackError ? "Login mislykkedes. Prøv igen." : null
  );
  const [info, setInfo] = useState<string | null>(null);

  const callbackUrl = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (error) {
      setError(translateError(error.message));
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (mode === "signup" && password.length < 8) {
      setError("Adgangskoden skal være mindst 8 tegn.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(translateError(error.message));
        setLoading(false);
        return;
      }
      router.replace(next);
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callbackUrl() },
    });
    setLoading(false);

    if (error) {
      setError(translateError(error.message));
      return;
    }
    // Supabase returnerer en bruger uden identities, hvis emailen allerede findes
    if (data.user && data.user.identities?.length === 0) {
      setError("Der findes allerede en profil med den email.");
      return;
    }
    setInfo("Tjek din indbakke. Vi har sendt et link, så du kan bekræfte din email.");
    setPassword("");
  }

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 rounded-lg bg-mist-100 p-1 text-sm font-medium">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
              setInfo(null);
            }}
            className={`rounded-md py-2 transition ${
              mode === m ? "bg-white text-deep-900 shadow-sm" : "text-deep-700 hover:text-deep-900"
            }`}
          >
            {m === "login" ? "Log ind" : "Opret profil"}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-mist-100 bg-white py-2.5 text-sm font-medium text-deep-900 transition hover:bg-mist-50 disabled:opacity-60"
      >
        <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden>
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        Fortsæt med Google
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-deep-700">
        <span className="h-px flex-1 bg-mist-100" />
        eller med email
        <span className="h-px flex-1 bg-mist-100" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-deep-900">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-mist-100 bg-mist-50 px-3 py-2.5 text-deep-950 outline-none focus:border-deep-700 focus:bg-white"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-deep-900">
            Adgangskode
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-mist-100 bg-mist-50 px-3 py-2.5 text-deep-950 outline-none focus:border-deep-700 focus:bg-white"
          />
          {mode === "signup" && (
            <p className="mt-1 text-xs text-deep-700">Mindst 8 tegn.</p>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {info && (
          <p role="status" className="rounded-lg bg-reed-300/30 px-3 py-2 text-sm text-deep-900">
            {info}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-deep-900 py-2.5 text-sm font-semibold text-mist-50 transition hover:bg-deep-800 disabled:opacity-60"
        >
          {loading ? "Vent..." : mode === "login" ? "Log ind" : "Opret profil"}
        </button>
      </form>
    </div>
  );
}
