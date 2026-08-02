/* ================= "VER COMO" — SIMULACIÓN DE ROL (SOLO UI) =================
   Deja que un `administrador` vea su propio dashboard como lo vería un
   encargado/trabajador, para probar qué gating de rol le está aplicando antes
   de delegarle algo. Es EXCLUSIVAMENTE una simulación de interfaz: la sesión
   real de Supabase sigue siendo la del administrador, así que cualquier
   escritura real (INSERT/UPDATE) sigue autorizada por su rol verdadero — RLS
   nunca se entera de esto. No hay sesión impersonada ni token nuevo.

   Por eso mismo esto NUNCA puede escalar privilegios: tanto proxy.ts como
   SessionProvider.tsx solo aplican el rol de la cookie cuando el rol REAL
   (recién leído de la tabla empleados, no de la propia cookie) es
   "administrador" — un encargado/trabajador que fuerce esta cookie a mano
   no gana nada, en ambos lados se ignora igual. */
export const VISTA_ROL_COOKIE = "vista_rol_simulado";

export type RolSimulable = "encargado" | "trabajador";

export const ROLES_SIMULABLES: RolSimulable[] = ["encargado", "trabajador"];

export function esRolSimulable(valor: string | null | undefined): valor is RolSimulable {
  return valor === "encargado" || valor === "trabajador";
}
