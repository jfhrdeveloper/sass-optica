/* ================= MODO MOCK (SOLO VERIFICACIÓN LOCAL) =================
   Se activa con NEXT_PUBLIC_MOCK_MODE=true en .env.local. Permite entrar al
   dashboard con un correo/contraseña fijos y datos falsos, SIN tocar
   Supabase — sirve para revisar el diseño/flujo mientras no hay un proyecto
   real conectado. NUNCA activar en producción (no hay ninguna verificación
   real detrás: cualquiera con la contraseña de abajo "entra").

   TEMPORAL: pensado para borrarse (este archivo + las ramas `isMockMode()`
   en SessionProvider/DataProvider/login/dashboard-layout) en cuanto haya un
   proyecto Supabase real — ver docs/pending-task.md. */
export function isMockMode(): boolean {
  return process.env.NEXT_PUBLIC_MOCK_MODE === "true";
}

export const MOCK_EMAIL = "demo@optica.pe";
export const MOCK_PASSWORD = "demo1234";
/* El valor de esta cookie ahora es el id del empleado mock elegido (ver el
   selector rápido de perfil en AuthPage.tsx), no un flag fijo "1" — permite
   entrar como administrador/encargado/trabajador sin 3 cuentas reales. */
export const MOCK_COOKIE = "mock_session";

/** Lee una cookie por nombre desde `document.cookie` — `null` en SSR (no hay
 *  `document`) o si no existe. Un solo lugar para este parseo manual, en vez
 *  de sumar una librería de cookies para algo que solo usa el modo mock. */
export function leerCookie(nombre: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${nombre}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/* Credenciales/cookie del panel admin del SaaS — separadas de las de arriba
   porque en producción son espacios de auth distintos (ver docs/architecture.md
   §3): un super_admin no es un empleado de ningún negocio. */
export const MOCK_ADMIN_EMAIL = "admin@saas.pe";
export const MOCK_ADMIN_PASSWORD = "admin1234";
export const MOCK_ADMIN_COOKIE = "mock_admin_session";

/* Guarda los toggles de suspender/reactivar negocio (ver
   mock-admin-overrides.ts) — NO mutar MOCK_ADMIN_NEGOCIOS directamente:
   Turbopack no garantiza que el route handler y el Server Component que
   renderiza la página compartan la misma instancia de módulo en dev, así
   que una mutación en memoria del array no siempre se ve reflejada. Una
   cookie sí es un estado real y compartido entre ambas requests. */
export const MOCK_NEGOCIOS_OVERRIDE_COOKIE = "mock_negocios_override";

/* Mismo criterio que la de arriba, para marcar un reclamo "atendido" +
   respuesta en modo mock (ver /admin-panel/reclamos y mock-admin-overrides.ts). */
export const MOCK_RECLAMOS_OVERRIDE_COOKIE = "mock_reclamos_override";

/* Notas internas de soporte agregadas en modo mock (ver
   /admin-panel/negocios/[id] y mock-admin-overrides.ts) — a diferencia de
   los overrides de arriba (mapa por id que REEMPLAZA un campo), esta cookie
   guarda un ARRAY que se acumula: cada nota nueva se agrega, nunca reemplaza
   a la anterior. */
export const MOCK_NOTAS_SOPORTE_COOKIE = "mock_notas_soporte";

/* Cambio de estado de una mejora sugerida en modo mock (ver
   /admin-panel/mejoras) — mapa id→estado, mismo criterio que
   MOCK_NEGOCIOS_OVERRIDE_COOKIE (Server Component, necesita cookie para
   persistir entre requests). El lado del dashboard (proponer/votar, un
   componente cliente) NO necesita cookie: usa estado local de React, igual
   que las ramas mock de DataProvider.tsx. */
export const MOCK_MEJORAS_ESTADO_COOKIE = "mock_mejoras_estado";
