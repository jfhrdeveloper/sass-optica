"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generarSlug, validarFormatoSlug, type FormatoSlug } from "@/lib/slug";

type EstadoDisponibilidad = "idle" | "verificando" | "disponible" | "no-disponible" | "invalido";

/* Registro self-service (brief §4): nombre del negocio → subdominio en vivo,
   estilo Instagram (✅/❌ con debounce), formato junto/con-guiones. Al
   confirmar, /api/registro crea negocio + administrador + trial de forma
   atómica; luego iniciamos sesión en el cliente y redirigimos al subdominio
   recién creado, ya logueado. */
export default function RegistroPage() {
  const [nombreNegocio, setNombreNegocio] = useState("");
  const [formato, setFormato] = useState<FormatoSlug>("guiones");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const slug = useMemo(() => generarSlug(nombreNegocio, formato), [nombreNegocio, formato]);
  const formatoSlug = useMemo(() => (slug ? validarFormatoSlug(slug) : null), [slug]);
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost";

  /* Resultado del último chequeo de disponibilidad completado (solo para
     slugs con formato válido). Si `chequeo.slug` ya no coincide con `slug`
     actual, el chequeo quedó desactualizado y se deriva "verificando" más
     abajo — así ningún estado se fija sincrónicamente en el cuerpo del
     efecto, solo dentro del callback async diferido por el debounce. */
  const [chequeo, setChequeo] = useState<{ slug: string; disponible: boolean; mensaje: string | null } | null>(null);

  /* Verificación en vivo con debounce (~500ms), igual que Instagram/Slack. */
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

  const estado: EstadoDisponibilidad = !slug
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
    if (estado !== "disponible") return;
    setError(null);
    setEnviando(true);

    const res = await fetch("/api/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombreNegocio, subdominio: slug, nombres, apellidos, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setEnviando(false);
      setError(data.error ?? "No se pudo completar el registro.");
      return;
    }

    /* El registro no deja sesión iniciada en este navegador (se creó por
       service_role) — iniciamos sesión ahora, igual que en /login. */
    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    setEnviando(false);
    if (signInErr) {
      window.location.href = "/login";
      return;
    }

    const port = typeof window !== "undefined" && window.location.port ? `:${window.location.port}` : "";
    window.location.href = `${window.location.protocol}//${data.subdominio}.${rootDomain}${port}/dashboard`;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-8">
      <h1 className="text-xl font-semibold">Prueba gratis 30 días</h1>
      <p className="mt-1 text-sm text-neutral-600">Sin tarjeta de crédito · Cancela cuando quieras</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium" htmlFor="nombreNegocio">Nombre de tu óptica</label>
          <input
            id="nombreNegocio" required value={nombreNegocio}
            onChange={(ev) => setNombreNegocio(ev.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>

        {slug && (
          <div className="rounded border bg-neutral-50 px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate">
                {slug}.{rootDomain}
              </span>
              <span>
                {estado === "verificando" && "…"}
                {estado === "disponible" && "✅"}
                {(estado === "no-disponible" || estado === "invalido") && "❌"}
              </span>
            </div>
            {mensajeSlug && <p className="mt-1 text-red-600">{mensajeSlug}</p>}

            <div className="mt-2 flex gap-4 text-xs text-neutral-600">
              <label className="flex items-center gap-1">
                <input type="radio" checked={formato === "guiones"} onChange={() => setFormato("guiones")} />
                con-guiones
              </label>
              <label className="flex items-center gap-1">
                <input type="radio" checked={formato === "junto"} onChange={() => setFormato("junto")} />
                junto
              </label>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium" htmlFor="nombres">Tu nombre</label>
          <input
            id="nombres" required value={nombres}
            onChange={(ev) => setNombres(ev.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="apellidos">Tus apellidos</label>
          <input
            id="apellidos" value={apellidos}
            onChange={(ev) => setApellidos(ev.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="email">Email</label>
          <input
            id="email" type="email" required autoComplete="email" value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="password">Contraseña</label>
          <input
            id="password" type="password" required minLength={8} autoComplete="new-password" value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={enviando || estado !== "disponible"}
          className="w-full rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {enviando ? "Creando tu cuenta…" : "Crear mi cuenta"}
        </button>
      </form>
    </main>
  );
}
