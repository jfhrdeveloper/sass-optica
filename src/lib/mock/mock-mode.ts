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
export const MOCK_COOKIE = "mock_session";

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
