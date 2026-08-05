"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Eye, EyeOff, Loader2, ShieldCheck, UserCog, User, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isMockMode, MOCK_EMAIL, MOCK_PASSWORD, MOCK_COOKIE } from "@/lib/mock/mock-mode";
import { MOCK_EMPLEADO, MOCK_EMPLEADO_ENCARGADO, MOCK_EMPLEADO_TRABAJADOR } from "@/lib/mock/mock-data";
import { nombreRol } from "@/lib/roles";
import { generarSlug, validarFormatoSlug, type FormatoSlug } from "@/lib/slug";
import { Stepper } from "@/components/ui/Stepper";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { GoogleIcon, DivisorO } from "@/components/auth/GoogleAuthUi";
import { CreditoJFHR } from "@/components/landing/CreditoJFHR";
import { PLANES, type PlanId } from "@/lib/precios";

type Modo = "login" | "registro";
type EstadoDisponibilidad = "idle" | "verificando" | "disponible" | "no-disponible" | "invalido";

const BENEFICIOS = [
  "Clientes, citas y recetas en un solo lugar",
  "Ventas con IGV calculado solo",
  "Cancela cuando quieras, sin permanencia",
];

/* ================= LOGIN + REGISTRO — PANEL DESLIZANTE =================
   Patrón split-screen con panel de marca deslizante (idea tomada de las
   referencias en diseno-referencia/login-register/): el panel de color
   siempre existe en el DOM y se desliza de un lado al otro con `transition`
   de CSS; debajo, los dos formularios (login/registro) también coexisten
   montados, cross-fadeando por opacidad — así el cambio se ve como una
   animación continua en vez de un salto entre páginas.

   /login y /registro siguen siendo rutas reales (bookmarkeables, sin JS
   funcionan igual de bien) — ambas montan este mismo componente con un
   `modoInicial` distinto. Al togglear, el estado local cambia primero (la
   animación corre ahí mismo) y router.replace() actualiza la URL recién
   cuando la transición ya casi terminó, para que el remount entre rutas
   caiga sobre un estado visual idéntico y no se note. */
export function AuthPage({ modoInicial, planInicial = "gratis" }: { modoInicial: Modo; planInicial?: PlanId }) {
  const [modo, setModo] = useState<Modo>(modoInicial);
  const router = useRouter();
  const mock = isMockMode();

  function cambiarModo(nuevo: Modo) {
    if (nuevo === modo) return;
    setModo(nuevo);
    setTimeout(() => router.replace(nuevo === "login" ? "/login" : "/registro", { scroll: false }), 350);
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white dark:bg-slate-950">
      {/* ====== Cabecera compacta — solo móvil (el panel de marca no cabe) ====== */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">O</div>
          <Link href="/" className="font-display text-slate-900 dark:text-slate-100">SaaS Óptica</Link>
        </div>
        <ThemeToggle />
      </div>

      {/* ====== Panel de marca — SIEMPRE anclado a la izquierda, desliza con
         `translate-x` (no `left`): animar `left` es una propiedad de layout,
         el navegador no la acelera por GPU y se ve "a los saltos"; `transform`
         sí corre en el compositor y queda fluido. En reposo (login) cubre la
         mitad derecha (donde está el form de registro, oculto); al pasar a
         registro se desliza a su posición natural (izquierda), tapando el
         login y revelando el registro a la derecha. ====== */}
      <div
        className={`hidden overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-primary-light p-10 text-white transition-transform duration-500 ease-in-out md:absolute md:inset-y-0 md:left-0 md:flex md:w-1/2 md:flex-col md:justify-between ${
          modo === "login" ? "md:translate-x-full" : "md:translate-x-0"
        }`}
      >
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

        <Link href="/" className="relative font-display text-xl">SaaS Óptica</Link>

        <div className="relative">
          <h2 className="font-display text-3xl leading-tight">
            {modo === "login" ? "Bienvenido de vuelta." : "Empieza en 2 minutos."}
          </h2>
          <p className="mt-3 max-w-sm text-white/80">
            {modo === "login"
              ? "Entra a tu panel y sigue atendiendo. Clientes, citas, ventas — todo donde lo dejaste."
              : "Sin tarjeta de crédito. Carga tu óptica, invita a tu equipo y atiende desde el día uno."}
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

      {/* ====== Formulario: Login — anclado a la izquierda, siempre ====== */}
      <div
        aria-hidden={modo !== "login"}
        className={`${modo === "login" ? "block" : "hidden"} w-full px-6 py-10 transition-opacity duration-500 ease-in-out sm:px-10 md:absolute md:inset-y-0 md:left-0 md:flex md:w-1/2 md:flex-col md:justify-center md:px-14 ${
          modo === "login" ? "md:opacity-100" : "md:pointer-events-none md:opacity-0"
        }`}
      >
        {/* Toggle de tema — dentro de cada mitad de formulario (no un único
           toggle fijo en la pantalla) para que siempre caiga sobre el fondo
           claro/oscuro del form, nunca sobre el panel de marca azul (ahí el
           ícono se leería mal). Solo desktop; en móvil vive en la cabecera. */}
        <div className="absolute right-6 top-6 hidden md:block">
          <ThemeToggle />
        </div>
        <LoginForm mock={mock} onIrARegistro={() => cambiarModo("registro")} />
      </div>

      {/* ====== Formulario: Registro — anclado a la derecha, siempre ====== */}
      <div
        aria-hidden={modo !== "registro"}
        className={`${modo === "registro" ? "block" : "hidden"} w-full px-6 py-10 transition-opacity duration-500 ease-in-out sm:px-10 md:absolute md:inset-y-0 md:left-1/2 md:flex md:w-1/2 md:flex-col md:justify-center md:px-14 ${
          modo === "registro" ? "md:opacity-100" : "md:pointer-events-none md:opacity-0"
        }`}
      >
        <div className="absolute right-6 top-6 hidden md:block">
          <ThemeToggle />
        </div>
        <RegistroForm onIrALogin={() => cambiarModo("login")} planInicial={planInicial} />
      </div>
    </div>
  );
}

/* ================= FORMULARIO DE LOGIN ================= */
function LoginForm({ mock, onIrARegistro }: { mock: boolean; onIrARegistro: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [recordarme, setRecordarme] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [modoReset, setModoReset] = useState(false);
  const [resetMensaje, setResetMensaje] = useState<string | null>(null);
  const [resetEnviando, setResetEnviando] = useState(false);
  const [enviandoGoogle, setEnviandoGoogle] = useState(false);

  /* Redirige a Google y vuelve por /auth/callback (ver route.ts) — ese
     endpoint decide si mandar al dashboard (ya tiene negocio) o a
     /registro/completar (cuenta de Google nueva, sin negocio todavía). En
     modo mock no hay Supabase real detrás, así que no tiene sentido
     intentar el redirect — mismo criterio que onSolicitarReset abajo. */
  async function conGoogle() {
    if (mock) {
      setError("Modo mock activo — el inicio de sesión con Google no está disponible aquí.");
      return;
    }
    setEnviandoGoogle(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/login` },
    });
    if (err) {
      setEnviandoGoogle(false);
      setError("No se pudo iniciar sesión con Google. Intenta de nuevo.");
    }
  }

  /* Selector rápido de perfil (solo modo mock) — pedido explícito del
     usuario para probar los 3 roles sin mantener 3 cuentas reales. El valor
     de la cookie pasa a ser el id del empleado elegido (ver leerCookie en
     SessionProvider.tsx), no un flag fijo. */
  function entrarComo(empleadoId: string) {
    document.cookie = `${MOCK_COOKIE}=${empleadoId}; path=/; max-age=86400`;
    window.location.href = "/dashboard";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    if (mock) {
      if (email === MOCK_EMAIL && password === MOCK_PASSWORD) {
        entrarComo(MOCK_EMPLEADO.id);
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
      setError(/invalid login credentials/i.test(err.message)
        ? "Email o contraseña incorrectos."
        : "No se pudo iniciar sesión. Intenta de nuevo.");
      return;
    }

    void recordarme;
    window.location.href = "/login";
  }

  async function onSolicitarReset(e: React.FormEvent) {
    e.preventDefault();
    setResetMensaje(null);
    if (!email) { setResetMensaje("Escribe tu correo para enviarte el enlace."); return; }

    if (mock) {
      setResetMensaje("Modo mock activo — no se envían correos reales.");
      return;
    }

    setResetEnviando(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login/nueva-clave`,
    });
    setResetEnviando(false);
    setResetMensaje(err
      ? "No se pudo enviar el enlace. Verifica el correo e intenta de nuevo."
      : "Te enviamos un enlace para restablecer tu contraseña. Revisa tu correo.");
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="font-display text-2xl text-slate-900 dark:text-slate-100">Iniciar sesión</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ingresa tus credenciales para entrar a tu panel</p>

      {mock && (
        <>
          <p className="badge badge-warning mt-3 px-3 py-1.5">
            Modo mock activo — usa <strong className="ml-1">{MOCK_EMAIL}</strong> / <strong>{MOCK_PASSWORD}</strong>
          </p>

          {/* Selector rápido de perfil — entra directo sin pasar por el
              formulario, para probar los 3 roles sin mantener 3 cuentas. */}
          <div className="mt-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
              Entrar rápido como…
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button type="button" onClick={() => entrarComo(MOCK_EMPLEADO.id)} className="btn-outline gap-1.5 text-sm">
                <ShieldCheck size={15} /> {nombreRol("administrador")}
              </button>
              <button type="button" onClick={() => entrarComo(MOCK_EMPLEADO_ENCARGADO.id)} className="btn-outline gap-1.5 text-sm">
                <UserCog size={15} /> {nombreRol("encargado")}
              </button>
              <button type="button" onClick={() => entrarComo(MOCK_EMPLEADO_TRABAJADOR.id)} className="btn-outline gap-1.5 text-sm">
                <User size={15} /> {nombreRol("trabajador")}
              </button>
            </div>
          </div>
        </>
      )}

      {!modoReset && (
        <>
          <button type="button" onClick={conGoogle} disabled={enviandoGoogle} className="btn-outline mt-6 w-full gap-2">
            <GoogleIcon /> {enviandoGoogle ? "Redirigiendo…" : "Continuar con Google"}
          </button>
          <DivisorO texto="o continúa con tu email" />
        </>
      )}

      {!modoReset ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="login-email">Email</label>
            <input
              id="login-email" type="email" required autoComplete="email"
              value={email} onChange={(ev) => setEmail(ev.target.value)}
              className="input mt-1 w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="login-password">Contraseña</label>
            <div className="relative mt-1">
              <input
                id="login-password" type={verPassword ? "text" : "password"} required autoComplete="current-password"
                value={password} onChange={(ev) => setPassword(ev.target.value)}
                className="input w-full pr-10"
              />
              <button
                type="button" onClick={() => setVerPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {verPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={recordarme} onChange={(ev) => setRecordarme(ev.target.checked)} className="checkbox" />
              Recuérdame
            </label>
            <button type="button" onClick={() => { setModoReset(true); setResetMensaje(null); }} className="link-underline text-xs font-medium text-primary">
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button type="submit" disabled={enviando} className="btn-primary w-full">
            {enviando ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      ) : (
        <form onSubmit={onSolicitarReset} className="mt-6 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">Escribe tu correo y te mandamos un enlace para poner una contraseña nueva.</p>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="reset-email">Email</label>
            <input
              id="reset-email" type="email" required autoComplete="email"
              value={email} onChange={(ev) => setEmail(ev.target.value)}
              className="input mt-1 w-full"
            />
          </div>
          {resetMensaje && <p className="text-sm text-slate-600 dark:text-slate-300">{resetMensaje}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setModoReset(false)} className="btn-outline flex-1">Atrás</button>
            <button type="submit" disabled={resetEnviando} className="btn-primary flex-1">
              {resetEnviando ? "Enviando…" : "Enviar enlace"}
            </button>
          </div>
        </form>
      )}

      <p className="mt-6 text-sm text-slate-600 dark:text-slate-300">
        ¿No tienes cuenta?{" "}
        <button type="button" onClick={onIrARegistro} className="link-underline font-medium text-primary">Prueba gratis</button>
      </p>

      <CreditoJFHR className="mt-8 md:hidden" />
    </div>
  );
}

const VACIO_REGISTRO = { nombreNegocio: "", nombres: "", apellidos: "", email: "", password: "" };

/* Opciones del selector de plan (Paso 1) — "Gratis" no vive en `PLANES`
   (no es un plan pago, no pasa por Culqi), así que se antepone a mano. */
const OPCIONES_PLAN = [
  { valor: "gratis", label: "Gratis" },
  ...PLANES.map((p) => ({ valor: p.id, label: p.nombre })),
];

/* ================= FORMULARIO DE REGISTRO (2 pasos) ================= */
function RegistroForm({ onIrALogin, planInicial }: { onIrALogin: () => void; planInicial: PlanId }) {
  const [paso, setPaso] = useState(1);
  const [form, setForm] = useState(VACIO_REGISTRO);
  const [formato, setFormato] = useState<FormatoSlug>("guiones");
  const [plan, setPlan] = useState<PlanId>(planInicial);
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviandoGoogle, setEnviandoGoogle] = useState(false);
  const mock = isMockMode();

  /* Registrarse con Google salta directo al OAuth (sin pedir nombre de
     óptica/contraseña acá) — /auth/callback detecta que la cuenta de Google
     es nueva (sin negocio_id todavía, ver handle_new_user() en el schema) y
     manda a /registro/completar, que solo pide el nombre de la óptica. El
     plan elegido acá viaja en el propio `next` para no perderse en la vuelta
     de Google (ver auth/callback/route.ts, que preserva ese query string). */
  async function conGoogle() {
    if (mock) {
      setError("Modo mock activo — el registro con Google no está disponible aquí.");
      return;
    }
    setEnviandoGoogle(true);
    const supabase = createClient();
    const next = encodeURIComponent(`/registro/completar?plan=${plan}`);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${next}` },
    });
    if (err) {
      setEnviandoGoogle(false);
      setError("No se pudo continuar con Google. Intenta de nuevo.");
    }
  }

  const slug = useMemo(() => generarSlug(form.nombreNegocio, formato), [form.nombreNegocio, formato]);
  const formatoSlug = useMemo(() => (slug ? validarFormatoSlug(slug) : null), [slug]);
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost";

  /* Resultado del último chequeo completado — si `chequeo.slug` ya no
     coincide con `slug` actual, quedó desactualizado y se deriva
     "verificando" más abajo (ningún estado se fija sincrónicamente en el
     cuerpo del efecto, solo dentro del callback async del debounce). */
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

  function siguiente() {
    if (estadoSlug !== "disponible") return;
    setPaso(2);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    const res = await fetch("/api/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombreNegocio: form.nombreNegocio, subdominio: slug, nombres: form.nombres, apellidos: form.apellidos, email: form.email, password: form.password, plan }),
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
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    setEnviando(false);
    if (signInErr) {
      window.location.href = "/login";
      return;
    }

    const port = typeof window !== "undefined" && window.location.port ? `:${window.location.port}` : "";
    window.location.href = `${window.location.protocol}//${data.subdominio}.${rootDomain}${port}/dashboard?bienvenida=${plan}`;
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="font-display text-2xl text-slate-900 dark:text-slate-100">Crea tu cuenta</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sin tarjeta de crédito · Elige tu plan cuando quieras</p>

      {/* mt-6: sin este margen el stepper queda pegado al subtítulo (no tiene
         un header de panel arriba como en el SlideOver, que sí trae su
         propio padding) y el paso 1/2 se ve comprimido contra el borde
         superior del formulario. */}
      <div className="mt-6">
        <Stepper paso={paso} total={2} />
      </div>

      {paso === 1 && (
        <>
          <button type="button" onClick={conGoogle} disabled={enviandoGoogle} className="btn-outline w-full gap-2">
            <GoogleIcon /> {enviandoGoogle ? "Redirigiendo…" : "Registrarse con Google"}
          </button>
          <DivisorO texto="o regístrate con tu email" />
        </>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        {paso === 1 ? (
          <>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            {/* Plan preseleccionado según la tarjeta de precios clickeada en
               la landing (?plan=, ver registro/page.tsx), pero siempre
               editable acá — quien entra por un CTA genérico ("Crear cuenta
               gratis") también puede cambiar de opinión antes de crear la
               cuenta. */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">Tu plan</p>
              <SegmentedControl
                aria-label="Elige tu plan"
                variante="opciones"
                valor={plan}
                onChange={(v) => setPlan(v as PlanId)}
                opciones={OPCIONES_PLAN}
                className="mt-2"
              />
              <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-500">
                {plan === "gratis"
                  ? "Gratis para siempre, con límites — sube de plan cuando quieras."
                  : "30 días de prueba sin tarjeta. Si no activas el pago, vuelves solo al plan Gratis."}
              </p>
            </div>

            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">Tu óptica</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="reg-negocio">Nombre de tu óptica</label>
              <input
                id="reg-negocio" required value={form.nombreNegocio}
                onChange={(ev) => setForm({ ...form, nombreNegocio: ev.target.value })}
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

                {/* Radios (no checkboxes): las dos opciones son excluyentes.
                    El `name` compartido es lo que las hace un grupo de verdad
                    — sin él el navegador las trata como controles sueltos y se
                    pierde la navegación con flechas ↑↓, además de que un lector
                    de pantalla no anuncia "1 de 2". El `fieldset`/`legend` le
                    da nombre accesible al grupo (la leyenda es solo para
                    lectores: el contexto visual ya lo da el campo de arriba). */}
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

            <button type="button" disabled={estadoSlug !== "disponible"} onClick={siguiente} className="btn-primary w-full">
              Siguiente
            </button>
          </>
        ) : (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">Tus datos</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="reg-nombres">Nombres</label>
                <input
                  id="reg-nombres" required value={form.nombres}
                  onChange={(ev) => setForm({ ...form, nombres: ev.target.value })}
                  className="input mt-1 w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="reg-apellidos">Apellidos</label>
                <input
                  id="reg-apellidos" value={form.apellidos}
                  onChange={(ev) => setForm({ ...form, apellidos: ev.target.value })}
                  className="input mt-1 w-full"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="reg-email">Email</label>
              <input
                id="reg-email" type="email" required autoComplete="email" value={form.email}
                onChange={(ev) => setForm({ ...form, email: ev.target.value })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="reg-password">Contraseña</label>
              <div className="relative mt-1">
                <input
                  id="reg-password" type={verPassword ? "text" : "password"} required minLength={8} autoComplete="new-password" value={form.password}
                  onChange={(ev) => setForm({ ...form, password: ev.target.value })}
                  className="input w-full pr-10"
                />
                <button
                  type="button" onClick={() => setVerPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {verPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex gap-2">
              <button type="button" onClick={() => setPaso(1)} className="btn-outline flex-1">Atrás</button>
              <button type="submit" disabled={enviando} className="btn-primary flex-1">
                {enviando ? "Creando…" : "Crear mi cuenta"}
              </button>
            </div>
          </>
        )}
      </form>

      <p className="mt-6 text-sm text-slate-600 dark:text-slate-300">
        ¿Ya tienes cuenta?{" "}
        <button type="button" onClick={onIrALogin} className="link-underline font-medium text-primary">Inicia sesión</button>
      </p>

      <CreditoJFHR className="mt-8 md:hidden" />
    </div>
  );
}
