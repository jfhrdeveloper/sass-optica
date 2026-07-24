"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/* Login del dueño del SaaS — separado del login de los negocios (brief §2/§3
   del diseño de arquitectura de esta sesión: admin.dominio/login es un
   espacio aparte, no un rol más dentro de un negocio). */
export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setEnviando(false);
      setError("Email o contraseña incorrectos.");
      return;
    }
    /* El proxy re-verifica membresía en super_admins en el siguiente
       request y reescribe hacia admin-panel/(protegido) si corresponde. */
    window.location.href = "/";
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center">
      <h1 className="text-xl font-semibold">Panel del SaaS</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input
          type="email" placeholder="Email" required autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        <input
          type="password" placeholder="Contraseña" required autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={enviando} className="w-full rounded bg-black px-3 py-2 text-white disabled:opacity-50">
          {enviando ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
