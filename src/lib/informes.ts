import type { Venta, VentaItem, Cliente, Producto, Gasto } from "@/components/providers/DataProvider";

/* ================= ANÁLISIS DE VENTAS/GASTOS =================
   Aritmética pura sobre lo que ya vive en DataProvider — separada de la UI
   para poder testearla sin renderizar (mismo criterio que lib/uso.ts y
   lib/precios.ts). Las ventas ANULADAS se excluyen de toda esta capa: no
   son ingreso real, igual que ya las excluye el balance del libro de
   ingresos/egresos en /dashboard/informes. */

const MESES_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
] as const;

/** Ticket promedio (venta pagada promedio) — `null` si no hay ventas
 *  pagadas todavía, para no mostrar "S/ 0.00" como si fuera un dato real. */
export function ticketPromedio(ventas: Venta[]): number | null {
  const pagadas = ventas.filter((v) => v.estado !== "anulada");
  if (pagadas.length === 0) return null;
  return pagadas.reduce((acc, v) => acc + v.total, 0) / pagadas.length;
}

export interface ClienteFrecuente { clienteId: string; nombre: string; cantidad: number }

/** Cliente con más ventas pagadas — `null` sin datos suficientes (sin
 *  ventas, o todas sin cliente asociado). */
export function clienteMasFrecuente(ventas: Venta[], clientes: Cliente[]): ClienteFrecuente | null {
  const conteo = new Map<string, number>();
  for (const v of ventas) {
    if (v.estado === "anulada" || !v.clienteId) continue;
    conteo.set(v.clienteId, (conteo.get(v.clienteId) ?? 0) + 1);
  }
  let top: ClienteFrecuente | null = null;
  for (const [clienteId, cantidad] of conteo) {
    if (!top || cantidad > top.cantidad) {
      const c = clientes.find((cl) => cl.id === clienteId);
      top = { clienteId, nombre: c ? `${c.nombres} ${c.apellidos}` : "Cliente eliminado", cantidad };
    }
  }
  return top;
}

export interface ProductoVendido { productoId: string; nombre: string; cantidad: number; monto: number }

/** Top productos vendidos por monto (no por cantidad: un producto caro
 *  vendido una vez pesa más para el negocio que uno barato vendido varias),
 *  de ventas pagadas. Ítems sin `productoId` (línea manual del ticket) se
 *  excluyen — no hay con qué agregarlos. */
export function topProductosVendidos(
  ventas: Venta[], ventaItems: VentaItem[], productos: Producto[], limite = 5,
): ProductoVendido[] {
  const idsValidos = new Set(ventas.filter((v) => v.estado !== "anulada").map((v) => v.id));
  const agregado = new Map<string, { cantidad: number; monto: number }>();
  for (const it of ventaItems) {
    if (!it.productoId || !idsValidos.has(it.ventaId)) continue;
    const actual = agregado.get(it.productoId) ?? { cantidad: 0, monto: 0 };
    actual.cantidad += it.cantidad;
    actual.monto += it.subtotal;
    agregado.set(it.productoId, actual);
  }
  return [...agregado.entries()]
    .map(([productoId, v]) => ({
      productoId, nombre: productos.find((p) => p.id === productoId)?.nombre ?? "Producto eliminado",
      ...v,
    }))
    .sort((a, b) => b.monto - a.monto)
    .slice(0, limite);
}

export interface MesComparativo { mes: string; label: string; ingresos: number; egresos: number; balance: number }

/** Últimos `meses` meses (incluido el actual) con ingresos/egresos/balance,
 *  siempre en orden cronológico ascendente y sin huecos (meses sin
 *  movimientos entran en 0, igual que la serie diaria de lib/uso.ts). */
export function comparativaMensual(
  ventas: Venta[], gastos: Gasto[], meses = 6, ahora: Date = new Date(),
): MesComparativo[] {
  const puntos: MesComparativo[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    puntos.push({ mes, label: `${MESES_ES[d.getMonth()]} ${d.getFullYear()}`, ingresos: 0, egresos: 0, balance: 0 });
  }
  const porMes = new Map(puntos.map((p) => [p.mes, p]));
  for (const v of ventas) {
    if (v.estado === "anulada") continue;
    const p = porMes.get(v.fecha.slice(0, 7));
    if (p) p.ingresos += v.total;
  }
  for (const g of gastos) {
    const p = porMes.get(g.fecha.slice(0, 7));
    if (p) p.egresos += g.monto;
  }
  for (const p of puntos) p.balance = p.ingresos - p.egresos;
  return puntos;
}
