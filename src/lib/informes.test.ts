import { describe, expect, it } from "vitest";
import { ticketPromedio, clienteMasFrecuente, topProductosVendidos, comparativaMensual } from "@/lib/informes";
import type { Venta, VentaItem, Cliente, Producto, Gasto } from "@/components/providers/DataProvider";

function venta(patch: Partial<Venta> = {}): Venta {
  return {
    id: "v1", negocioId: "n1", fecha: "2026-07-01T10:00:00.000Z",
    subtotal: 100, igv: 18, total: 118, metodoPago: "efectivo",
    estado: "pagada", montoPagado: 118, ...patch,
  };
}
function cliente(patch: Partial<Cliente> = {}): Cliente {
  return { id: "c1", negocioId: "n1", nombres: "Juan", apellidos: "Pérez", documentoTipo: "DNI", ...patch };
}
function producto(patch: Partial<Producto> = {}): Producto {
  return { id: "p1", negocioId: "n1", nombre: "Lente A", categoria: "luna", precioVenta: 100, precioCosto: 50, activo: true, stockActual: 10, stockMinimo: 2, ...patch };
}
function item(patch: Partial<VentaItem> = {}): VentaItem {
  return { id: "i1", ventaId: "v1", descripcion: "Lente A", cantidad: 1, precioUnitario: 100, subtotal: 100, ...patch };
}
function gasto(patch: Partial<Gasto> = {}): Gasto {
  return { id: "g1", negocioId: "n1", categoria: "otro", monto: 50, fecha: "2026-07-05", ...patch };
}

describe("ticketPromedio", () => {
  it("null si no hay ventas", () => {
    expect(ticketPromedio([])).toBeNull();
  });

  it("promedia solo las ventas no anuladas", () => {
    const ventas = [venta({ id: "1", total: 100 }), venta({ id: "2", total: 200 }), venta({ id: "3", total: 900, estado: "anulada" })];
    expect(ticketPromedio(ventas)).toBe(150);
  });
});

describe("clienteMasFrecuente", () => {
  it("null sin ventas con cliente asociado", () => {
    expect(clienteMasFrecuente([venta({ clienteId: undefined })], [])).toBeNull();
  });

  it("devuelve el cliente con más ventas pagadas", () => {
    const clientes = [cliente({ id: "c1", nombres: "Ana", apellidos: "Ruiz" }), cliente({ id: "c2", nombres: "Luis", apellidos: "Soto" })];
    const ventas = [
      venta({ id: "1", clienteId: "c1" }), venta({ id: "2", clienteId: "c1" }), venta({ id: "3", clienteId: "c2" }),
    ];
    expect(clienteMasFrecuente(ventas, clientes)).toEqual({ clienteId: "c1", nombre: "Ana Ruiz", cantidad: 2 });
  });

  it("ignora ventas anuladas en el conteo", () => {
    const clientes = [cliente({ id: "c1" })];
    const ventas = [venta({ id: "1", clienteId: "c1", estado: "anulada" })];
    expect(clienteMasFrecuente(ventas, clientes)).toBeNull();
  });
});

describe("topProductosVendidos", () => {
  it("agrega cantidad y monto por producto, ordenado por monto descendente", () => {
    const productos = [producto({ id: "p1", nombre: "Lente A" }), producto({ id: "p2", nombre: "Montura B" })];
    const ventas = [venta({ id: "v1" })];
    const items = [
      item({ ventaId: "v1", productoId: "p1", cantidad: 2, subtotal: 50 }),
      item({ ventaId: "v1", productoId: "p2", cantidad: 1, subtotal: 200 }),
    ];
    const top = topProductosVendidos(ventas, items, productos);
    expect(top[0]).toEqual({ productoId: "p2", nombre: "Montura B", cantidad: 1, monto: 200 });
    expect(top[1]).toEqual({ productoId: "p1", nombre: "Lente A", cantidad: 2, monto: 50 });
  });

  it("excluye ítems de ventas anuladas", () => {
    const ventas = [venta({ id: "v1", estado: "anulada" })];
    const items = [item({ ventaId: "v1", productoId: "p1", subtotal: 100 })];
    expect(topProductosVendidos(ventas, items, [])).toHaveLength(0);
  });

  it("excluye ítems manuales sin productoId", () => {
    const ventas = [venta({ id: "v1" })];
    const items = [item({ ventaId: "v1", productoId: undefined, subtotal: 100 })];
    expect(topProductosVendidos(ventas, items, [])).toHaveLength(0);
  });

  it("respeta el límite pedido", () => {
    const ventas = [venta({ id: "v1" })];
    const items = Array.from({ length: 10 }, (_, i) => item({ ventaId: "v1", productoId: `p${i}`, subtotal: i + 1 }));
    expect(topProductosVendidos(ventas, items, [], 3)).toHaveLength(3);
  });
});

describe("comparativaMensual", () => {
  it("devuelve exactamente N meses, en orden ascendente, terminando en el mes de referencia", () => {
    const ahora = new Date(2026, 6, 15); // 15 de julio de 2026
    const puntos = comparativaMensual([], [], 3, ahora);
    expect(puntos.map((p) => p.mes)).toEqual(["2026-05", "2026-06", "2026-07"]);
  });

  it("sin movimientos, todos los meses quedan en 0 (sin huecos)", () => {
    const puntos = comparativaMensual([], [], 3, new Date(2026, 6, 15));
    expect(puntos.every((p) => p.ingresos === 0 && p.egresos === 0 && p.balance === 0)).toBe(true);
  });

  it("acumula ventas (no anuladas) y gastos en el mes correcto", () => {
    const ventas = [venta({ fecha: "2026-07-01T00:00:00.000Z", total: 100 }), venta({ id: "2", fecha: "2026-06-01T00:00:00.000Z", total: 999, estado: "anulada" })];
    const gastos = [gasto({ fecha: "2026-07-10", monto: 30 })];
    const puntos = comparativaMensual(ventas, gastos, 2, new Date(2026, 6, 15));
    const julio = puntos.find((p) => p.mes === "2026-07")!;
    expect(julio.ingresos).toBe(100);
    expect(julio.egresos).toBe(30);
    expect(julio.balance).toBe(70);
    const junio = puntos.find((p) => p.mes === "2026-06")!;
    expect(junio.ingresos).toBe(0);
  });
});
