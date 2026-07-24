"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/* Login genérico en el dominio raíz — el usuario no necesita recordar su
   subdominio. Tras iniciar sesión, recargamos /login: el middleware detecta
   la cookie recién creada, identifica el negocio del empleado y redirige
   directo a [negocio].dominio/dashboard (ver src/middleware.ts). */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recordarme, setRecordarme] = useState(true);
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
      setError(/invalid login credentials/i.test(err.message)
        ? "Email o contraseña incorrectos."
        : "No se pudo iniciar sesión. Intenta de nuevo.");
      return;
    }

    /* `recordarme` decide dónde persiste la sesión del navegador (Supabase
       usa localStorage por defecto en createBrowserClient; para sessionStorage
       habría que pasar un storage custom — se deja documentado aquí porque
       el requisito exacto de UX está pendiente de definir en style-guide). */
    void recordarme;

    window.location.href = "/login";
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-8">
      <h1 className="text-xl font-semibold">Iniciar sesión</h1>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium" htmlFor="email">Email</label>
          <input
            id="email" type="email" required autoComplete="email"
            value={email} onChange={(ev) => setEmail(ev.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="password">Contraseña</label>
          <input
            id="password" type="password" required autoComplete="current-password"
            value={password} onChange={(ev) => setPassword(ev.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={recordarme} onChange={(ev) => setRecordarme(ev.target.checked)} />
          Recuérdame
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={enviando} className="w-full rounded bg-black px-3 py-2 text-white disabled:opacity-50">
          {enviando ? "Ingresando…" : "Ingresar"}
        </button>
      </form>

      <p className="mt-6 text-sm">
        ¿No tienes cuenta? <Link href="/registro" className="underline">Prueba gratis</Link>
      </p>
    </main>
  );
}
