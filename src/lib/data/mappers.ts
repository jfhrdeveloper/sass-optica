/* ================= MAPPERS Supabase ↔ TS =================
   Convierte filas de Supabase (snake_case) ↔ shapes de la app (camelCase).
   UN par rowToX()/xToRow() por entidad. Regla: campo nuevo de DB ⇒ añadirlo AQUÍ
   en AMBOS sentidos (+ tipo en DataProvider + tabla/RLS en supabase-schema.sql).

   En *ToRow se escriben solo las claves presentes (Partial) → sirve igual para
   insert que para update parcial sin pisar columnas no enviadas. */

import type { Empleado, Negocio, Rol, Suscripcion } from "@/components/providers/DataProvider";

/* ====== Empleados ====== */
export function rowToEmpleado(r: Record<string, unknown>): Empleado {
  return {
    id:            String(r.id),
    negocioId:     r.negocio_id ? String(r.negocio_id) : null,
    nombres:       String(r.nombres ?? ""),
    apellidos:     String(r.apellidos ?? ""),
    rol:           (r.rol as Rol) ?? "trabajador",
    email:         r.email ? String(r.email) : undefined,
    telefono:      r.telefono ? String(r.telefono) : undefined,
    avatarBase64:  r.avatar_base64 ? String(r.avatar_base64) : undefined,
    activo:        Boolean(r.activo ?? true),
  };
}
export function empleadoToRow(e: Partial<Empleado>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (e.nombres      !== undefined) out.nombres       = e.nombres;
  if (e.apellidos     !== undefined) out.apellidos      = e.apellidos;
  if (e.rol           !== undefined) out.rol            = e.rol;
  if (e.email          !== undefined) out.email           = e.email;
  if (e.telefono       !== undefined) out.telefono        = e.telefono;
  if (e.avatarBase64  !== undefined) out.avatar_base64   = e.avatarBase64;
  if (e.activo         !== undefined) out.activo          = e.activo;
  return out;
}

/* ====== Negocio (tenant propio) ====== */
export function rowToNegocio(r: Record<string, unknown>): Negocio {
  return {
    id:          String(r.id),
    nombre:      String(r.nombre ?? ""),
    subdominio:  String(r.subdominio ?? ""),
    ruc:         r.ruc ? String(r.ruc) : undefined,
    telefono:    r.telefono ? String(r.telefono) : undefined,
    direccion:   r.direccion ? String(r.direccion) : undefined,
    logoUrl:     r.logo_url ? String(r.logo_url) : undefined,
    activo:      Boolean(r.activo ?? true),
  };
}
export function negocioToRow(n: Partial<Negocio>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (n.nombre    !== undefined) out.nombre    = n.nombre;
  if (n.ruc       !== undefined) out.ruc       = n.ruc;
  if (n.telefono  !== undefined) out.telefono  = n.telefono;
  if (n.direccion !== undefined) out.direccion = n.direccion;
  if (n.logoUrl   !== undefined) out.logo_url  = n.logoUrl;
  return out;
}

/* ====== Suscripción (solo lectura desde el cliente — ver RLS) ====== */
export function rowToSuscripcion(r: Record<string, unknown>): Suscripcion {
  return {
    id:                  String(r.id),
    negocioId:           String(r.negocio_id),
    plan:                String(r.plan ?? "trial"),
    estado:              String(r.estado ?? "trial"),
    trialInicio:         String(r.trial_inicio ?? ""),
    trialFin:            String(r.trial_fin ?? ""),
    fechaPagoUltimo:     r.fecha_pago_ultimo ? String(r.fecha_pago_ultimo) : undefined,
    proximoCobro:        r.proximo_cobro ? String(r.proximo_cobro) : undefined,
  };
}
