import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { sharedCookieDomain } from "@/lib/supabase/cookie-domain";
import { VISTA_ROL_COOKIE, esRolSimulable } from "@/lib/simulacion-rol";

/* ================= MIDDLEWARE — LANDING / DASHBOARD / ADMIN =================
   Backend único: Supabase. Lee el hostname de cada request y decide a qué
   "espacio" pertenece (ver docs/architecture.md §3 y §9):

     - dominio raíz (o www → redirige al raíz)  → landing pública, sin auth
     - [negocio].dominio                        → dashboard: exige sesión,
       resuelve el tenant por el subdominio, valida que el empleado
       pertenezca a ESE negocio, protege rutas admin-only por rol, bloquea
       si el trial venció sin pago
     - admin.dominio                            → panel del dueño del SaaS
       (cross-tenant), rewrite transparente a src/app/admin-panel/*

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

  /* getUser() puede refrescar el access token y encolar cookies nuevas en
     supabaseResponse (vía setAll de arriba) — toda respuesta que NO sea la
     propia supabaseResponse (redirect/rewrite a otra URL) debe copiarlas, o
     una sesión a punto de expirar se pierde silenciosamente en ese salto. */
  const { data: { user } } = await supabase.auth.getUser();

  function conCookiesDeSesion(res: NextResponse): NextResponse {
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  }
  function redirigir(url: URL): NextResponse {
    return conCookiesDeSesion(NextResponse.redirect(url));
  }
  /* `headersExtra` viaja SIEMPRE dentro de `request.headers` en el momento
     de construir la respuesta — es el único punto donde Next.js las toma en
     cuenta para reconstruir el request que ven los Server Components (ver
     `handleMiddlewareField` en next/dist/.../response.js). Poner un header
     con `res.headers.set(...)` DESPUÉS de crear la respuesta (como hacía
     antes esta función) solo lo agrega a la respuesta HTTP saliente —
     nunca llega a `headers()` del lado del Server Component. Bug real
     encontrado en la sesión 2026-07-28 (13): x-negocio-id/x-super-admin
     nunca llegaban a destino, así que dashboard/layout.tsx y
     admin-panel/(protegido)/layout.tsx redirigían a /login SIEMPRE que se
     conectara Supabase real (enmascarado en dev porque el modo mock usa
     una cookie en su lugar, no este header). */
  function reescribir(url: URL, headersExtra?: Record<string, string>): NextResponse {
    const headers = new Headers(request.headers);
    for (const [k, v] of Object.entries(headersExtra ?? {})) headers.set(k, v);
    return conCookiesDeSesion(NextResponse.rewrite(url, { request: { headers } }));
  }
  function continuar(headersExtra: Record<string, string>): NextResponse {
    const headers = new Headers(request.headers);
    for (const [k, v] of Object.entries(headersExtra)) headers.set(k, v);
    return conCookiesDeSesion(NextResponse.next({ request: { headers } }));
  }

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
          return redirigir(url);
        }
      } else if (empleado) {
        /* Sesión válida sin negocio todavía — típicamente una cuenta de
           Google recién creada (ver /auth/callback/route.ts: handle_new_user()
           ya insertó esta fila mínima). Termina el alta en vez de mostrarle
           el form de login de nuevo. */
        return redirigir(new URL("/registro/completar", request.url));
      }
    }

    return supabaseResponse;
  }

  /* ================= SUBDOMINIO admin: panel del dueño del SaaS =================
     Las páginas reales viven en src/app/admin-panel/* (namespace interno)
     para no chocar con las rutas /login, /dashboard, etc. que ya existen
     para el dominio raíz y los subdominios de negocio — el rewrite es
     transparente, el navegador sigue viendo admin.dominio/login,
     admin.dominio/ tal como se documentó en docs/architecture.md §3. */
  if (subdomain === "admin") {
    const destino = request.nextUrl.clone();
    destino.pathname = pathname === "/" ? "/admin-panel" : `/admin-panel${pathname}`;

    if (pathname.startsWith("/login")) {
      return reescribir(destino);
    }

    /* Google "Iniciar sesión" del admin-panel (ver admin-panel/login/page.tsx)
       redirige a admin.dominio/auth/callback?code=... — esa ruta real vive
       en src/app/auth/callback/*, no en admin-panel/. En ese punto de la
       request la sesión TODAVÍA no existe (el exchange de código pasa
       dentro del propio route handler): sin este bypass, el `if (!user)`
       de abajo la mandaría a /login antes de completar el login. Mismo
       criterio que /auth/confirm para el dominio raíz, más arriba. */
    if (pathname.startsWith("/auth/callback")) {
      return supabaseResponse;
    }

    if (!user) {
      return redirigir(new URL("/login", request.url));
    }
    const { data: esSuperAdmin } = await supabase
      .from("super_admins").select("id").eq("id", user.id).maybeSingle();
    if (!esSuperAdmin) {
      return redirigir(new URL("/login", request.url));
    }

    /* Header de defensa en profundidad, mismo patrón que x-negocio-id para
       el dashboard de negocio — src/app/admin-panel/layout.tsx lo exige. */
    return reescribir(destino, { "x-super-admin": "1" });
  }

  /* ================= SUBDOMINIO de negocio: dashboard =================
     Exige sesión + resuelve el tenant por el subdominio + valida que el
     empleado pertenezca a ESE negocio (no basta con estar logueado en
     cualquier negocio: el subdominio y el negocio del empleado deben calzar). */
  const irALogin = () => {
    const url = request.nextUrl.clone();
    url.hostname = rootDomain;
    url.pathname = "/login";
    return redirigir(url);
  };

  if (!user) {
    return irALogin();
  }

  const { data: negocio } = await supabase
    .from("negocios").select("id, activo").eq("subdominio", subdomain).maybeSingle();
  if (!negocio || !negocio.activo) {
    const url = request.nextUrl.clone();
    url.hostname = rootDomain;
    url.pathname = "/";
    return redirigir(url);
  }

  const { data: empleado } = await supabase
    .from("empleados").select("negocio_id, rol, activo, permisos").eq("id", user.id).maybeSingle();
  if (!empleado || !empleado.activo || empleado.negocio_id !== negocio.id) {
    return irALogin();
  }

  const rolReal = empleado.rol as string;
  const permisosReal = (empleado.permisos as Record<string, boolean> | null) ?? {};

  /* ====== "Ver como" (simulación de UI, ver src/lib/simulacion-rol.ts) ======
     Solo se aplica si el rol REAL (recién leído arriba de la tabla
     empleados, no de esta cookie) es administrador — así una cookie forzada
     a mano por un encargado/trabajador nunca surte efecto. Nunca escala,
     solo puede degradar admin → encargado/trabajador. `permisos` se resetea
     a {} al simular: se está probando el rol base, no una delegación
     puntual que ese administrador ya le haya dado a alguien. */
  const rolSimulado = request.cookies.get(VISTA_ROL_COOKIE)?.value ?? null;
  const simulando = rolReal === "administrador" && esRolSimulable(rolSimulado);
  const rol = simulando ? rolSimulado! : rolReal;
  const permisos = simulando ? {} : permisosReal;

  /* ====== Rutas exclusivas de `administrador` (nunca delegables) ======
     /dashboard/facturacion NO está aquí a propósito: todos los roles deben
     poder verla (para saber que hay que renovar), aunque solo el
     administrador vea el botón de pago — esa distinción se hace dentro de
     la página, no en el proxy. */
  const rutasSoloAdministrador = ["/dashboard/empleados", "/dashboard/ajustes", "/dashboard/config"];
  if (rol !== "administrador" && rutasSoloAdministrador.some((r) => pathname.startsWith(r))) {
    return redirigir(new URL("/dashboard", request.url));
  }

  /* ====== Rutas con permiso granular delegable (empleados.permisos) ======
     Administrador siempre pasa; encargado/trabajador solo si el admin les
     activó la clave correspondiente — ver tiene_permiso() en el schema
     (misma regla, replicada aquí porque el proxy no puede llamar RPC de
     Postgres sin una consulta adicional). */
  const rutasConPermiso: Record<string, string> = {
    "/dashboard/gastos": "gastos",
    "/dashboard/informes": "gastos",
    "/dashboard/comisiones": "gastos",
    "/dashboard/descuentos": "descuentos",
  };
  for (const [ruta, clave] of Object.entries(rutasConPermiso)) {
    if (pathname.startsWith(ruta) && rol !== "administrador" && permisos[clave] !== true) {
      return redirigir(new URL("/dashboard", request.url));
    }
  }

  /* ====== Trial vencido sin pago → bloquea el resto del dashboard ======
     Brief §4/§10: "si venció sin pago, bloquea acceso". Redirige todo menos
     /dashboard/facturacion (donde se paga) hacia esa misma página. */
  if (!pathname.startsWith("/dashboard/facturacion")) {
    const { data: suscripcion } = await supabase
      .from("suscripciones").select("estado").eq("negocio_id", negocio.id).maybeSingle();
    if (suscripcion?.estado === "vencida") {
      return redirigir(new URL("/dashboard/facturacion", request.url));
    }
  }

  /* ====== Raíz del subdominio → /dashboard ====== */
  if (pathname === "/") {
    return redirigir(new URL("/dashboard", request.url));
  }

  /* Inyecta el tenant resuelto para que Server Components/Route Handlers no
     tengan que volver a consultarlo (la RLS igual filtra por current_tenant()
     independientemente de estos headers — son solo un atajo de lectura). */
  return continuar({
    "x-negocio-id": negocio.id,
    "x-negocio-subdominio": subdomain,
    "x-empleado-rol": rol,
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|opengraph-image|icon|apple-icon|twitter-image|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
