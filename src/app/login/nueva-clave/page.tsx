"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* Destino del enlace de invitación/reset (vía /auth/confirm, flujo token_hash
   — ver src/app/auth/confirm/route.ts). La sesión ya quedó creada por
   verifyOtp; aquí solo se fija la contraseña definitiva. */
function NuevaClaveForm() {
  const params = useSearchParams();
  const enlaceVencido = params.get("error") === "1";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setError(null);
    setEnviando(true);

    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setEnviando(false);
    if (err) {
      setError("No se pudo actualizar la contraseña. Pide un nuevo enlace e intenta de nuevo.");
      return;
    }
    setListo(true);
    window.location.href = "/login";
  }

  if (enlaceVencido) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-8">
        <h1 className="text-xl font-semibold text-slate-900">Enlace vencido</h1>
        <p className="mt-2 text-sm text-slate-600">
          Este enlace ya expiró o ya fue usado. Pide uno nuevo desde{" "}
          <a href="/login" className="font-medium text-primary hover:underline">iniciar sesión</a> (opción &quot;olvidé mi clave&quot;).
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-8">
      <h1 className="text-xl font-semibold text-slate-900">Define tu contraseña</h1>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="password">Nueva contraseña</label>
          <input
            id="password" type="password" required autoComplete="new-password"
            value={password} onChange={(ev) => setPassword(ev.target.value)}
            className="input mt-1 w-full"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {listo && <p className="badge badge-success">Listo, redirigiendo…</p>}

        <button type="submit" disabled={enviando} className="btn-primary w-full">
          {enviando ? "Guardando…" : "Guardar y continuar"}
        </button>
      </form>
    </main>
  );
}

export default function NuevaClavePage() {
  return (
    <Suspense fallback={null}>
      <NuevaClaveForm />
    </Suspense>
  );
}
