/* Fuente única de los módulos delegables por permiso granular — mismas
   claves que `tiene_permiso(clave)` en supabase-schema.sql. Un `trabajador`
   no tiene acceso de escritura a ninguno de estos por defecto (un
   `encargado` sí, vía puede_gestionar(), salvo 'gastos'/'descuentos' que
   exigen delegación incluso para encargado) — delegar uno de estos módulos
   se lo habilita puntualmente, sin ascenderlo de rol.

   Usado tanto por el editor de plantillas (/dashboard/roles) como por el
   selector "sin plantilla" que queda en Empleados para el caso puntual.
   Sucursales y Empleados NUNCA aparecen acá — son estructurales, exclusivas
   de `administrador` sin excepción (ver el comentario en supabase-schema.sql
   junto a `sucursales_write`). */
export const MODULOS_DELEGABLES = [
  { clave: "ventas", label: "Ventas" },
  { clave: "citas", label: "Citas" },
  { clave: "clientes", label: "Clientes (fichas, recetas, exámenes)" },
  { clave: "cotizaciones", label: "Cotizaciones" },
  { clave: "laboratorio", label: "Órdenes de laboratorio" },
  { clave: "productos", label: "Stock (productos e inventario)" },
  { clave: "proveedores", label: "Proveedores" },
  { clave: "gastos", label: "Gastos, caja, informes y comisiones" },
  { clave: "descuentos", label: "Descuentos y cupones" },
] as const;

export type ClaveModuloDelegable = (typeof MODULOS_DELEGABLES)[number]["clave"];

/* Resuelve los permisos EFECTIVOS de un empleado del lado del cliente —
   misma regla que tiene_permiso() en supabase-schema.sql: si tiene una
   plantilla asignada, sus permisos reemplazan a los propios (nunca se
   combinan); si no, se usan los del propio empleado. Cualquier gate de UI
   que hoy lea `empleado.permisos` directo (en vez de esto) rompe en cuanto
   ese empleado tenga una plantilla asignada — la escritura en la DB
   funciona igual (RLS ya resuelve bien), pero el botón se queda oculto. */
export function permisosEfectivos(
  empleado: { permisos: Record<string, boolean>; plantillaRolId?: string } | null | undefined,
  plantillasRol: { id: string; permisos: Record<string, boolean> }[],
): Record<string, boolean> {
  if (!empleado) return {};
  if (empleado.plantillaRolId) {
    return plantillasRol.find((p) => p.id === empleado.plantillaRolId)?.permisos ?? {};
  }
  return empleado.permisos ?? {};
}
