import { describe, expect, it } from "vitest";
import { calcularComisiones } from "@/lib/comisiones";
import type { Venta, Empleado } from "@/components/providers/DataProvider";

function venta(patch: Partial<Venta> = {}): Venta {
  return {
    id: "v1", negocioId: "n1", fecha: "2026-07-01T10:00:00.000Z",
    subtotal: 100, igv: 18, total: 118, metodoPago: "efectivo",
    estado: "pagada", montoPagado: 118, ...patch,
  };
}
function empleado(patch: Partial<Empleado> = {}): Empleado {
  return {
    id: "e1", negocioId: "n1", nombres: "Ana", apellidos: "Gómez",
    rol: "trabajador", permisos: {}, comisionPct: 5, activo: true, ...patch,
  };
}

describe("calcularComisiones", () => {
  it("sin ventas no devuelve ningún empleado", () => {
    expect(calcularComisiones([], [empleado()])).toEqual([]);
  });

  it("excluye ventas anuladas", () => {
    const ventas = [
      venta({ id: "v1", empleadoId: "e1", total: 100, estado: "pagada" }),
      venta({ id: "v2", empleadoId: "e1", total: 999, estado: "anulada" }),
    ];
    const [resultado] = calcularComisiones(ventas, [empleado({ comisionPct: 10 })]);
    expect(resultado.totalVendido).toBe(100);
    expect(resultado.comision).toBe(10);
  });

  it("ignora ventas sin empleadoId (sin atribución posible)", () => {
    const ventas = [venta({ id: "v1", empleadoId: undefined, total: 100 })];
    expect(calcularComisiones(ventas, [empleado()])).toEqual([]);
  });

  it("empleado con comisionPct 0 da comisión 0", () => {
    const ventas = [venta({ id: "v1", empleadoId: "e1", total: 500 })];
    const [resultado] = calcularComisiones(ventas, [empleado({ comisionPct: 0 })]);
    expect(resultado.comision).toBe(0);
    expect(resultado.totalVendido).toBe(500);
  });

  it("suma varias ventas del mismo empleado y redondea a 2 decimales", () => {
    const ventas = [
      venta({ id: "v1", empleadoId: "e1", total: 33.33 }),
      venta({ id: "v2", empleadoId: "e1", total: 33.33 }),
    ];
    const [resultado] = calcularComisiones(ventas, [empleado({ comisionPct: 5 })]);
    expect(resultado.totalVendido).toBe(66.66);
    expect(resultado.comision).toBe(3.33);
  });

  it("separa el total por empleado y ordena de mayor a menor comisión", () => {
    const ventas = [
      venta({ id: "v1", empleadoId: "e1", total: 100 }),
      venta({ id: "v2", empleadoId: "e2", total: 1000 }),
    ];
    const empleados = [
      empleado({ id: "e1", nombres: "Ana", comisionPct: 5 }),
      empleado({ id: "e2", nombres: "Luis", comisionPct: 5 }),
    ];
    const resultado = calcularComisiones(ventas, empleados);
    expect(resultado.map((r) => r.empleadoId)).toEqual(["e2", "e1"]);
  });

  it("ignora ventas de un empleado que ya no está en la lista", () => {
    const ventas = [venta({ id: "v1", empleadoId: "e-borrado", total: 100 })];
    expect(calcularComisiones(ventas, [empleado()])).toEqual([]);
  });
});
