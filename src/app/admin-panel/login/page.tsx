"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isMockMode, MOCK_ADMIN_EMAIL, MOCK_ADMIN_PASSWORD, MOCK_ADMIN_COOKIE } from "@/lib/mock/mock-mode";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GoogleIcon, DivisorO } from "@/components/auth/GoogleAuthUi";
import { CreditoJFHR } from "@/components/CreditoJFHR";

const BENEFICIOS = [
  "Negocios, trials y pagos en un solo lugar",
  "MRR y cobros de Culqi, cross-tenant",
  "Datos aislados por negocio, siempre",
];

/* Login del dueño del SaaS — separado del login de los negocios (brief §2/§3:
   admin.dominio/login es un espacio aparte, no un rol más dentro de un
   negocio). Mismo lenguaje visual Y misma estructura de formulario que
   AuthPage.tsx (panel de marca + form con labels + Google + max-w-sm) —
   antes el form ocupaba todo el ancho de su mitad de pantalla (se veía
   "estirado" comparado al de negocios, que va centrado en max-w-sm). Sin el
   toggle login/registro deslizante: el admin-panel no tiene alta
   self-service, un solo formulario no necesita esa animación. */
export default function AdminLoginPage() {
  const mock = isMockMode();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviandoGoogle, setEnviandoGoogle] = useState(false);

  /* Mismo flujo que LoginForm en AuthPage.tsx: vuelve por /auth/callback,
     que ahora chequea super_admins ANTES que empleados (ver route.ts) para
     no mandar a un super_admin a /registro/completar. proxy.ts deja pasar
     /auth/callback bajo el subdominio admin sin exigir sesión todavía (el
     exchange de código pasa recién dentro de esa ruta). */
  async function conGoogle() {
    if (mock) {
      setError("Modo mock activo — el inicio de sesión con Google no está disponible aquí.");
      return;
    }
    setEnviandoGoogle(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/` },
    });
    if (err) {
      setEnviandoGoogle(false);
      setError("No se pudo iniciar sesión con Google. Intenta de nuevo.");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    /* Modo mock: no hay proxy real resolviendo admin.dominio ni tabla
       super_admins — ver mock-mode.ts. Misma cookie que revisa el layout
       protegido, sin tocar Supabase. */
    if (mock) {
      if (email === MOCK_ADMIN_EMAIL && password === MOCK_ADMIN_PASSWORD) {
        document.cookie = `${MOCK_ADMIN_COOKIE}=1; path=/; max-age=86400`;
        window.location.href = "/admin-panel";
      } else {
        setEnviando(false);
        setError("Email o contraseña incorrectos.");
      }
      return;
    }

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
    <div className="relative min-h-screen w-full overflow-hidden bg-white dark:bg-slate-950">
      {/* ====== Cabecera compacta — solo móvil (el panel de marca no cabe) ====== */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <ShieldCheck size={16} strokeWidth={2.25} />
          </div>
          <span className="font-display text-slate-900 dark:text-slate-100">Panel del SaaS</span>
        </div>
        <ThemeToggle />
      </div>

      {/* ====== Panel de marca — mismo gradiente/círculos decorativos que
         AuthPage.tsx, fijo a la DERECHA (mismo lado que AuthPage.tsx en su
         estado "login" — el panel ahí solo parece estar a la izquierda en
         el código porque parte de esa posición y se desliza con
         `translate-x-full` hacia la derecha en modo login; acá, sin
         segundo formulario con el que animar, se ancla directo del lado
         correcto sin necesidad de la animación). ====== */}
      <div className="hidden overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-primary-light p-10 text-white md:absolute md:inset-y-0 md:right-0 md:flex md:w-1/2 md:flex-col md:justify-between">
        {[
          { top: -80, right: -80, size: 320 },
          { bottom: -60, left: -60, size: 260 },
          { top: "40%", left: "60%", size: 120 },
        ].map((c, i) => (
          <div
            key={i}
            className="pointer-events-none absolute rounded-full bg-white/5"
            style={{
              top: "top" in c ? c.top : undefined,
              right: "right" in c ? c.right : undefined,
              bottom: "bottom" in c ? c.bottom : undefined,
              left: "left" in c ? c.left : undefined,
              width: c.size, height: c.size,
            }}
          />
        ))}

        <span className="relative flex items-center gap-2 font-display text-xl">
          <ShieldCheck size={20} /> Panel del SaaS
        </span>

        <div className="relative">
          <h2 className="font-display text-3xl leading-tight">Acceso exclusivo del equipo.</h2>
          <p className="mt-3 max-w-sm text-white/80">
            Negocios, suscripciones y cobros de todas las ópticas del SaaS, cross-tenant.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-white/85">
            {BENEFICIOS.map((b) => (
              <li key={b} className="flex items-center gap-2">
                <Check size={16} className="shrink-0" /> {b}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex flex-col gap-1.5">
          <p className="text-xs text-white/50">© {new Date().getFullYear()} SaaS Óptica</p>
          <CreditoJFHR variant="brand" align="left" />
        </div>
      </div>

      {/* ====== Formulario — anclado a la izquierda (mismo lado que
         AuthPage.tsx en login), centrado en max-w-sm (mismo ancho que
         LoginForm, no todo el ancho de la mitad de pantalla). ====== */}
      <div className="w-full px-6 py-10 sm:px-10 md:absolute md:inset-y-0 md:left-0 md:flex md:w-1/2 md:flex-col md:justify-center md:px-14">
        <div className="absolute right-6 top-6 hidden md:block">
          <ThemeToggle />
        </div>

        <div className="mx-auto w-full max-w-sm">
          <h1 className="font-display text-2xl text-slate-900 dark:text-slate-100">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Solo para el equipo del SaaS.</p>

          {mock && (
            <p className="badge badge-warning mt-3 px-3 py-1.5">
              Modo mock activo — usa <strong className="ml-1">{MOCK_ADMIN_EMAIL}</strong> / <strong>{MOCK_ADMIN_PASSWORD}</strong>
            </p>
          )}

          <button type="button" onClick={conGoogle} disabled={enviandoGoogle} className="btn-outline mt-6 w-full gap-2">
            <GoogleIcon /> {enviandoGoogle ? "Redirigiendo…" : "Continuar con Google"}
          </button>
          <DivisorO texto="o continúa con tu email" />

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="admin-email">Email</label>
              <input
                id="admin-email" type="email" required autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="admin-password">Contraseña</label>
              <input
                id="admin-password" type="password" required autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="input mt-1 w-full"
              />
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button type="submit" disabled={enviando} className="btn-primary w-full">
              {enviando ? "Ingresando…" : "Ingresar"}
            </button>
          </form>

          <Link href="/" className="link-underline mt-6 inline-block text-xs font-medium link">← Volver al sitio</Link>

          <CreditoJFHR className="mt-8 md:hidden" />
        </div>
      </div>
    </div>
  );
}
