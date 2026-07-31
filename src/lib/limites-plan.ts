import type { Empleado, Venta } from "@/components/providers/DataProvider";
import { LIMITE_EMPLEADOS_GRATIS, LIMITE_VENTAS_MES_GRATIS } from "@/lib/precios";

/* Lógica pura de los límites del plan Gratis (freemium) — separada de
   precios.ts porque ahí viven las CONSTANTES (compartidas con el schema/
   backend), acá el CONTEO sobre datos ya cargados en el dashboard. Mismo
   idioma que informes.ts: bucket por mes vía `fecha.slice(0, 7)` y reloj
   inyectable (`ahora`) para que los tests no dependan de la fecha real. */

export function contarEmpleadosActivos(empleados: Empleado[]): number {
  return empleados.filter((e) => e.activo).length;
}

export function contarVentasDelMes(ventas: Venta[], ahora: Date = new Date()): number {
  const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
  return ventas.filter((v) => v.estado !== "anulada" && v.fecha.slice(0, 7) === mesActual).length;
}

export function puedeAgregarEmpleado(plan: string, empleadosActivosCount: number): boolean {
  return plan !== "gratis" || empleadosActivosCount < LIMITE_EMPLEADOS_GRATIS;
}

export function puedeRegistrarVenta(plan: string, ventasDelMesCount: number): boolean {
  return plan !== "gratis" || ventasDelMesCount < LIMITE_VENTAS_MES_GRATIS;
}
