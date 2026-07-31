import type { Venta, Empleado } from "@/components/providers/DataProvider";

/* ================= COMISIONES POR VENDEDOR =================
   Aritmética pura sobre Venta[]/Empleado[] ya en DataProvider — mismo
   criterio que lib/informes.ts. % único por empleado (empleados.comision_pct),
   no por categoría de producto: no confirmado como necesario, se puede
   evolucionar sin romper esta función si hace falta después. */

export interface ComisionEmpleado {
  empleadoId: string;
  nombre: string;
  totalVendido: number;
  comisionPct: number;
  comision: number;
}

/** Comisión de cada empleado sobre sus propias ventas no anuladas, en el
 *  período ya filtrado por quien llama (ventas[] recibe el rango deseado).
 *  Ventas sin `empleadoId` (atribución faltante, ej. convertidas desde una
 *  cotización) se ignoran — no hay a quién atribuirlas. Empleados sin
 *  ninguna venta en el período no aparecen en el resultado. */
export function calcularComisiones(ventas: Venta[], empleados: Empleado[]): ComisionEmpleado[] {
  const totalPorEmpleado = new Map<string, number>();
  for (const v of ventas) {
    if (v.estado === "anulada" || !v.empleadoId) continue;
    totalPorEmpleado.set(v.empleadoId, (totalPorEmpleado.get(v.empleadoId) ?? 0) + v.total);
  }

  const resultado: ComisionEmpleado[] = [];
  for (const [empleadoId, totalVendido] of totalPorEmpleado) {
    const empleado = empleados.find((e) => e.id === empleadoId);
    if (!empleado) continue;
    const comisionPct = empleado.comisionPct;
    resultado.push({
      empleadoId,
      nombre: `${empleado.nombres} ${empleado.apellidos}`.trim(),
      totalVendido: Math.round(totalVendido * 100) / 100,
      comisionPct,
      comision: Math.round(totalVendido * (comisionPct / 100) * 100) / 100,
    });
  }
  return resultado.sort((a, b) => b.comision - a.comision);
}
