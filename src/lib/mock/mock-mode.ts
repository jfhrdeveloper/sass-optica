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
