import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { sharedCookieDomain } from "@/lib/supabase/cookie-domain";

/* ================= MIDDLEWARE — LANDING / DASHBOARD / ADMIN =================
   Backend único: Supabase. Lee el hostname de cada request y decide a qué
   "espacio" pertenece (ver docs/architecture.md §3 y §9):

     - dominio raíz (o www → redirige al raíz)  → landing pública, sin auth
     - [negocio].dominio                        → dashboard: exige sesión,
       resuelve el tenant por el subdominio, valida que el empleado
       pertenezca a ESE negocio, protege rutas admin-only por rol
     - admin.dominio                            → reservado para el panel
       del dueño del SaaS (Fase 5, fuera de alcance por ahora)

   Doble capa de autorización: esto protege el bypass de UI; RLS (con
   negocio_id = current_tenant()) protege el bypass de datos. Las dos son
   necesarias — ver invariante en docs/architecture.md §10.

   Si faltan las env vars de Supabase, deja pasar todo (útil en el primer
   arranque del proyecto antes de configurar .env.local). */
export async function proxy(request: NextRequest) {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost";
  const hostname = request.headers.get("host")?.split(":")[0] ?? rootDomain;
  const pathname = request.nextUrl.pathname;

  /* ====== www → dominio raíz (canónico, sin www — ver docs/architecture.md §8) ====== */
  if (hostname === `www.${rootDomain}`) {
    const url = request.nextUrl.clone();
    url.hostname = rootDomain;
    return NextResponse.redirect(url, 301);
  }

  /* ====== Resuelve el subdominio (si lo hay) ====== */
  let subdomain: string | null = null;
  if (hostname !== rootDomain && hostname.endsWith(`.${rootDomain}`)) {
    subdomain = hostname.slice(0, -(rootDomain.length + 1));
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { domain: sharedCookieDomain(), sameSite: "lax" },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet: { name: string; value: string; options: CookieOptions }[]) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  /* ================= DOMINIO RAÍZ: landing pública ================= */
  if (!subdomain) {
    /* Confirmación de enlace (invite/recovery) — pública, verifyOtp crea la
       sesión DENTRO de esta ruta; exigir sesión previa la rompería. */
    if (pathname.startsWith("/auth/confirm")) {
      return supabaseResponse;
    }

    /* Si ya hay sesión y entra a /login (no a nueva-clave), redirige directo
       a su subdominio en vez de mostrarle el form de login de nuevo. */
    if (user && pathname.startsWith("/login") && !pathname.startsWith("/login/nueva-clave")) {
      const { data: empleado } = await supabase
        .from("empleados").select("negocio_id").eq("id", user.id).maybeSingle();
      if (empleado?.negocio_id) {
        const { data: negocio } = await supabase
          .from("negocios").select("subdominio").eq("id", empleado.negocio_id).maybeSingle();
        if (negocio?.subdominio) {
          const url = request.nextUrl.clone();
          url.hostname = `${negocio.subdominio}.${rootDomain}`;
          url.pathname = "/dashboard";
          return NextResponse.redirect(url);
        }
      }
    }

    return supabaseResponse;
  }

  /* ================= SUBDOMINIO admin: panel del dueño del SaaS =================
     Fuera de alcance por ahora (Fase 5) — solo reservamos el nombre; no hay
     páginas construidas todavía, así que simplemente se deja pasar. */
  if (subdomain === "admin") {
    return supabaseResponse;
  }

  /* ================= SUBDOMINIO de negocio: dashboard =================
     Exige sesión + resuelve el tenant por el subdominio + valida que el
     empleado pertenezca a ESE negocio (no basta con estar logueado en
     cualquier negocio: el subdominio y el negocio del empleado deben calzar). */
  const loginRedirect = () => {
    const url = request.nextUrl.clone();
    url.hostname = rootDomain;
    url.pathname = "/login";
    return NextResponse.redirect(url);
  };

  if (!user) {
    return loginRedirect();
  }

  const { data: negocio } = await supabase
    .from("negocios").select("id, activo").eq("subdominio", subdomain).maybeSingle();
  if (!negocio || !negocio.activo) {
    const url = request.nextUrl.clone();
    url.hostname = rootDomain;
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const { data: empleado } = await supabase
    .from("empleados").select("negocio_id, rol, activo").eq("id", user.id).maybeSingle();
  if (!empleado || !empleado.activo || empleado.negocio_id !== negocio.id) {
    return loginRedirect();
  }

  const rol = empleado.rol as string;

  /* ====== Rutas exclusivas de `administrador` ======
     /dashboard/facturacion NO está aquí a propósito: todos los roles deben
     poder verla (para saber que hay que renovar), aunque solo el
     administrador vea el botón de pago — esa distinción se hace dentro de
     la página, no en el proxy. */
  const rutasSoloAdministrador = ["/dashboard/gastos", "/dashboard/empleados", "/dashboard/config"];
  if (rol !== "administrador" && rutasSoloAdministrador.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  /* ====== Trial vencido sin pago → bloquea el resto del dashboard ======
     Brief §4/§10: "si venció sin pago, bloquea acceso". Redirige todo menos
     /dashboard/facturacion (donde se paga) hacia esa misma página. */
  if (!pathname.startsWith("/dashboard/facturacion")) {
    const { data: suscripcion } = await supabase
      .from("suscripciones").select("estado").eq("negocio_id", negocio.id).maybeSingle();
    if (suscripcion?.estado === "vencida") {
      return NextResponse.redirect(new URL("/dashboard/facturacion", request.url));
    }
  }

  /* ====== Raíz del subdominio → /dashboard ====== */
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  /* Inyecta el tenant resuelto para que Server Components/Route Handlers no
     tengan que volver a consultarlo (la RLS igual filtra por current_tenant()
     independientemente de estos headers — son solo un atajo de lectura). */
  supabaseResponse.headers.set("x-negocio-id", negocio.id);
  supabaseResponse.headers.set("x-negocio-subdominio", subdomain);
  supabaseResponse.headers.set("x-empleado-rol", rol);

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|opengraph-image|icon|apple-icon|twitter-image|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
