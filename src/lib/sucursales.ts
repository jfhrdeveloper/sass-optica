/* ================= MULTISEDES =================
   Réplica en JS de la misma condición que la policy RLS de `citas`/`ventas`
   en supabase-schema.sql — sirve para filtrar arrays ya cargados por
   Realtime antes de pintarlos (ej. el selector de sede del topbar, que es
   solo un filtro de conveniencia sobre datos que RLS ya aprobó, nunca un
   reemplazo de ese chequeo). Mantener esta función y la policy SQL en
   sincronía si la regla cambia. */

/** `empleadoSucursalId` es la sede fija asignada al empleado (NULL/undefined
 *  = ve todas). `filaSucursalId` es la sede de la fila en cuestión (NULL =
 *  "sede única implícita", visible siempre). */
export function puedeVerSucursal(
  empleadoSucursalId: string | null | undefined,
  filaSucursalId: string | null | undefined,
): boolean {
  if (!empleadoSucursalId) return true;
  if (!filaSucursalId) return true;
  return filaSucursalId === empleadoSucursalId;
}
