"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Loader2, X } from "lucide-react";
import { generarSlug, validarFormatoSlug, type FormatoSlug } from "@/lib/slug";
import { ThemeToggle } from "@/components/ThemeToggle";

type EstadoDisponibilidad = "idle" | "verificando" | "disponible" | "no-disponible" | "invalido";

/* ================= COMPLETAR REGISTRO (cuentas de Google) =================
   Última parada de "Registrarse con Google" (ver AuthPage.tsx →
   /auth/callback/route.ts → /registro/completar/page.tsx, que renderiza
   esto): la sesión de Google ya existe, así que solo falta el nombre de la
   óptica — ni contraseña ni datos personales, esos ya vinieron del perfil
   de Google. Reutiliza el mismo picker de subdominio en vivo del paso 1 de
   RegistroForm (duplicado a propósito: es un flujo distinto —sin
   contraseña, sin paso 2— no una variación del mismo formulario). */
export function CompletarRegistroForm({ email }: { email: string }) {
  const [nombreNegocio, setNombreNegocio] = useState("");
  const [formato, setFormato] = useState<FormatoSlug>("guiones");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const slug = useMemo(() => generarSlug(nombreNegocio, formato), [nombreNegocio, formato]);
  const formatoSlug = useMemo(() => (slug ? validarFormatoSlug(slug) : null), [slug]);
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost";

  const [chequeo, setChequeo] = useState<{ slug: string; disponible: boolean; mensaje: string | null } | null>(null);

  useEffect(() => {
    if (!slug || !formatoSlug?.valido) return;
    let cancelado = false;
    const t = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/registro/disponibilidad?slug=${encodeURIComponent(slug)}`);
          const data = await res.json();
          if (cancelado) return;
          setChequeo({
            slug,
            disponible: Boolean(data.disponible),
            mensaje: data.disponible ? null : (data.error ?? "Ese nombre ya está en uso."),
          });
        } catch {
          if (!cancelado) setChequeo(null);
        }
      })();
    }, 500);
    return () => { cancelado = true; clearTimeout(t); };
  }, [slug, formatoSlug]);

  const estadoSlug: EstadoDisponibilidad = !slug
    ? "idle"
    : !formatoSlug?.valido
    ? "invalido"
    : chequeo?.slug !== slug
    ? "verificando"
    : chequeo.disponible
    ? "disponible"
    : "no-disponible";

  const mensajeSlug =
    !slug ? null
    : !formatoSlug?.valido ? (formatoSlug?.error ?? null)
    : chequeo?.slug === slug ? chequeo.mensaje
    : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (estadoSlug !== "disponible") return;
    setError(null);
    setEnviando(true);

    const res = await fetch("/api/registro/completar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombreNegocio, subdominio: slug }),
    });
    const data = await res.json();
    if (!res.ok) {
      setEnviando(false);
      setError(data.error ?? "No se pudo completar el registro.");
      return;
    }

    const port = typeof window !== "undefined" && window.location.port ? `:${window.location.port}` : "";
    window.location.href = `${window.location.protocol}//${data.subdominio}.${rootDomain}${port}/dashboard`;
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-white px-6 py-10 dark:bg-slate-950">
      <div className="absolute right-6 top-6"><ThemeToggle /></div>
      <div className="mx-auto w-full max-w-sm">
        <Link href="/" className="font-display text-slate-900 dark:text-slate-100">SaaS Óptica</Link>
        <h1 className="mt-4 font-display text-2xl text-slate-900 dark:text-slate-100">Ya casi — nombra tu óptica</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Conectado como <strong>{email}</strong>. Elige el nombre de tu óptica y tu subdominio.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="completar-negocio">Nombre de tu óptica</label>
            <input
              id="completar-negocio" required value={nombreNegocio}
              onChange={(ev) => setNombreNegocio(ev.target.value)}
              className="input mt-1 w-full"
            />
          </div>

          {slug && (
            <div className="card bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-slate-700 dark:text-slate-200">{slug}.{rootDomain}</span>
                <span className="shrink-0">
                  {estadoSlug === "verificando" && <Loader2 size={16} className="animate-spin text-slate-400 dark:text-slate-500" />}
                  {estadoSlug === "disponible" && <Check size={16} className="text-accent" />}
                  {(estadoSlug === "no-disponible" || estadoSlug === "invalido") && <X size={16} className="text-red-600 dark:text-red-400" />}
                </span>
              </div>
              {mensajeSlug && <p className="mt-1 text-red-600 dark:text-red-400">{mensajeSlug}</p>}

              {/* Mismo grupo de radios que en AuthPage.tsx (registro por
                  email) — ver el comentario largo allá: el `name` compartido
                  es lo que los agrupa y habilita las flechas ↑↓. */}
              <fieldset className="mt-2">
                <legend className="sr-only">Formato del subdominio</legend>
                <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="radio" name="formato-slug" value="guiones" className="radio"
                      checked={formato === "guiones"} onChange={() => setFormato("guiones")}
                    />
                    con-guiones
                  </label>
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="radio" name="formato-slug" value="junto" className="radio"
                      checked={formato === "junto"} onChange={() => setFormato("junto")}
                    />
                    junto
                  </label>
                </div>
              </fieldset>
            </div>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button type="submit" disabled={estadoSlug !== "disponible" || enviando} className="btn-primary w-full">
            {enviando ? "Creando…" : "Crear mi óptica"}
          </button>
        </form>
      </div>
    </div>
  );
}
