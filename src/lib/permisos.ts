/* Fuente única de los módulos delegables por permiso granular — mismas
   claves que `nivel_permiso(clave)` en supabase-schema.sql.

   Sin rol personalizado asignado, el comportamiento de siempre no cambia:
   - Módulos OPERATIVOS (`operativo: true`): lectura abierta a cualquier rol
     (incluido trabajador — sin_rol_personalizado() en el schema), escritura
     abierta solo a encargado/administrador (puede_gestionar()).
   - Módulos SENSIBLES (`operativo: false`, hoy Gastos y Descuentos): SIN
     piso para nadie salvo administrador — ni lectura ni escritura gratis,
     ni para encargado (brief §5: "sin reportes financieros").

   Un rol personalizado asignado REEMPLAZA por completo ese piso — para el
   módulo que sea 'ninguno', ni lectura tiene, aunque por rol le tocara
   gratis (esto es lo que permite RESTRINGIR a un encargado, no solo
   sumarle cosas a un trabajador).

   Usado por el editor de roles personalizados (/dashboard/roles), por el
   selector de Empleados, por el filtro de qué módulos aparecen en el
   sidebar (DashboardNav/BottomTabBar/CommandPalette), y por cualquier
   página que necesite un gate de escritura (Caja, Laboratorio, Gastos,
   Descuentos...). Sucursales y Empleados NUNCA aparecen acá — son
   estructurales, exclusivas de `administrador` sin excepción (ver el
   comentario en supabase-schema.sql junto a `sucursales_write`). */
export const MODULOS_DELEGABLES = [
  { clave: "ventas", label: "Ventas", operativo: true },
  { clave: "citas", label: "Citas", operativo: true },
  { clave: "clientes", label: "Clientes (fichas, recetas, exámenes)", operativo: true },
  { clave: "cotizaciones", label: "Cotizaciones", operativo: true },
  { clave: "laboratorio", label: "Órdenes de laboratorio", operativo: true },
  { clave: "productos", label: "Stock (productos e inventario)", operativo: true },
  { clave: "proveedores", label: "Proveedores", operativo: true },
  { clave: "caja", label: "Caja (abrir/cerrar)", operativo: true },
  { clave: "gastos", label: "Gastos, informes y comisiones", operativo: false },
  { clave: "descuentos", label: "Descuentos y cupones", operativo: false },
  /* 'asistencia' acá es SOLO para ver/gestionar la del EQUIPO (las de otros
     empleados) — marcar la PROPIA no pasa por este permiso, es self-registro
     siempre permitido (ver policy asistencias_self en supabase-schema.sql,
     y /dashboard/asistencia.tsx). */
  { clave: "asistencia", label: "Asistencia del equipo", operativo: true },
  { clave: "sueldos", label: "Sueldos", operativo: false },
] as const;

export type ClaveModuloDelegable = (typeof MODULOS_DELEGABLES)[number]["clave"];

/** 'ninguno' nunca se persiste como valor — es la ausencia de la clave en
 *  el jsonb `permisos` (ver nivel_permiso() en el schema). Se usa igual acá
 *  como estado explícito de UI (el tercer botón del selector de 3 vías). */
export type NivelPermiso = "ninguno" | "lectura" | "escritura";

type EmpleadoParaPermisos = { rol: string; permisos: Record<string, string>; rolPersonalizadoId?: string };
type RolConPermisos = { id: string; permisos: Record<string, string> };

function esOperativo(clave: string): boolean {
  return MODULOS_DELEGABLES.find((m) => m.clave === clave)?.operativo ?? false;
}

/* Resuelve los permisos CRUDOS de un empleado (o de un rol personalizado
   puntual) del lado del cliente — misma regla que nivel_permiso() en
   supabase-schema.sql: si tiene un rol personalizado asignado, sus permisos
   reemplazan a los propios (nunca se combinan); si no, se usan los del
   propio empleado. Es un bloque de construcción de bajo nivel — para gatear
   una pantalla usá puedeLeerModulo()/puedeEscribirModulo() más abajo, que sí
   replican el piso por defecto (sin_rol_personalizado()/puede_gestionar()). */
export function permisosEfectivos(
  empleado: { permisos: Record<string, string>; rolPersonalizadoId?: string } | null | undefined,
  rolesPersonalizados: RolConPermisos[],
): Record<string, string> {
  if (!empleado) return {};
  if (empleado.rolPersonalizadoId) {
    return rolesPersonalizados.find((r) => r.id === empleado.rolPersonalizadoId)?.permisos ?? {};
  }
  return empleado.permisos ?? {};
}

export function nivelDe(permisos: Record<string, string>, clave: string): NivelPermiso {
  const v = permisos[clave];
  return v === "lectura" || v === "escritura" ? v : "ninguno";
}

export function puedeLeer(permisos: Record<string, string>, clave: string): boolean {
  return nivelDe(permisos, clave) !== "ninguno";
}

export function puedeEscribir(permisos: Record<string, string>, clave: string): boolean {
  return nivelDe(permisos, clave) === "escritura";
}

/* ================= Gates de pantalla (equivalentes a la RLS) =================
   Estas dos son las que hay que usar para mostrar/ocultar un link de nav o
   un botón de escritura — replican exactamente sin_rol_personalizado()/
   puede_gestionar()/tiene_permiso_lectura()/tiene_permiso_escritura() del
   schema, piso por defecto incluido. */
export function puedeLeerModulo(
  empleado: EmpleadoParaPermisos | null | undefined,
  rolesPersonalizados: RolConPermisos[],
  clave: string,
): boolean {
  if (!empleado) return false;
  if (empleado.rol === "administrador") return true;
  if (!empleado.rolPersonalizadoId) return esOperativo(clave);
  return puedeLeer(permisosEfectivos(empleado, rolesPersonalizados), clave);
}

export function puedeEscribirModulo(
  empleado: EmpleadoParaPermisos | null | undefined,
  rolesPersonalizados: RolConPermisos[],
  clave: string,
): boolean {
  if (!empleado) return false;
  if (empleado.rol === "administrador") return true;
  if (!empleado.rolPersonalizadoId) return esOperativo(clave) && empleado.rol === "encargado";
  return puedeEscribir(permisosEfectivos(empleado, rolesPersonalizados), clave);
}

/* Nivel de acceso "de fábrica" de un rol PRINCIPAL (sin rol personalizado
   asignado) sobre un módulo puntual — reusa puedeLeerModulo/puedeEscribirModulo
   con un empleado ficticio en vez de reimplementar la matriz de reglas, para
   que nunca se desincronice si esas dos cambian. Usado por la vista de
   referencia "Roles principales" en /dashboard/roles (solo lectura, no
   editable — el acceso de administrador/encargado/trabajador es fijo, no se
   configura). */
export function nivelBaseDeRol(rol: string, clave: string): NivelPermiso {
  const empleadoFalso = { rol, permisos: {} };
  if (puedeEscribirModulo(empleadoFalso, [], clave)) return "escritura";
  if (puedeLeerModulo(empleadoFalso, [], clave)) return "lectura";
  return "ninguno";
}

export function modulosDeRolPrincipal(rol: string): { clave: string; label: string; nivel: NivelPermiso }[] {
  return MODULOS_DELEGABLES.map((m) => ({ clave: m.clave, label: m.label, nivel: nivelBaseDeRol(rol, m.clave) }));
}
