import { describe, expect, it } from "vitest";
import type { Empleado, Venta } from "@/components/providers/DataProvider";
import {
  contarEmpleadosActivos, contarVentasDelMes, puedeAgregarEmpleado, puedeRegistrarVenta,
} from "@/lib/limites-plan";

function empleado(activo: boolean): Empleado {
  return { id: crypto.randomUUID(), negocioId: "n1", nombres: "A", apellidos: "B", rol: "trabajador", permisos: {}, comisionPct: 0, activo };
}

function venta(fecha: string, estado = "pagada"): Venta {
  return { id: crypto.randomUUID(), negocioId: "n1", fecha, subtotal: 0, igv: 0, total: 0, metodoPago: "efectivo", estado, montoPagado: 0 };
}

describe("contarEmpleadosActivos", () => {
  it("cuenta solo los activos", () => {
    expect(contarEmpleadosActivos([empleado(true), empleado(true), empleado(false)])).toBe(2);
  });

  it("array vacío da 0", () => {
    expect(contarEmpleadosActivos([])).toBe(0);
  });
});

describe("contarVentasDelMes", () => {
  const ahora = new Date("2026-07-15T12:00:00.000Z");

  it("cuenta solo las ventas del mes de `ahora`", () => {
    const ventas = [
      venta("2026-07-05T10:00:00.000Z"),
      venta("2026-07-25T10:00:00.000Z"),
      venta("2026-06-15T10:00:00.000Z"),
      venta("2026-08-15T10:00:00.000Z"),
    ];
    expect(contarVentasDelMes(ventas, ahora)).toBe(2);
  });

  it("excluye ventas anuladas", () => {
    const ventas = [venta("2026-07-10T10:00:00.000Z", "anulada"), venta("2026-07-11T10:00:00.000Z")];
    expect(contarVentasDelMes(ventas, ahora)).toBe(1);
  });

  it("sin ventas da 0", () => {
    expect(contarVentasDelMes([], ahora)).toBe(0);
  });
});

describe("puedeAgregarEmpleado", () => {
  it("plan gratis: bloquea al llegar al límite, no antes", () => {
    expect(puedeAgregarEmpleado("gratis", 0)).toBe(true);
    expect(puedeAgregarEmpleado("gratis", 1)).toBe(true);
    expect(puedeAgregarEmpleado("gratis", 2)).toBe(false);
    expect(puedeAgregarEmpleado("gratis", 5)).toBe(false);
  });

  it("planes pagos nunca bloquean", () => {
    expect(puedeAgregarEmpleado("basico", 999)).toBe(true);
    expect(puedeAgregarEmpleado("premium", 999)).toBe(true);
  });
});

describe("puedeRegistrarVenta", () => {
  it("plan gratis: bloquea al llegar al límite, no antes", () => {
    expect(puedeRegistrarVenta("gratis", 28)).toBe(true);
    expect(puedeRegistrarVenta("gratis", 29)).toBe(true);
    expect(puedeRegistrarVenta("gratis", 30)).toBe(false);
    expect(puedeRegistrarVenta("gratis", 40)).toBe(false);
  });

  it("planes pagos nunca bloquean", () => {
    expect(puedeRegistrarVenta("basico", 999)).toBe(true);
    expect(puedeRegistrarVenta("premium", 999)).toBe(true);
  });
});
