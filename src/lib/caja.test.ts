import { describe, expect, it } from "vitest";
import { calcularCuadreCaja } from "@/lib/caja";
import type { Venta } from "@/components/providers/DataProvider";

function venta(patch: Partial<Venta> = {}): Venta {
  return {
    id: "v1", negocioId: "n1", fecha: "2026-07-15T10:00:00.000Z",
    subtotal: 100, igv: 18, total: 118, metodoPago: "efectivo",
    estado: "pagada", montoPagado: 118, ...patch,
  };
}

describe("calcularCuadreCaja", () => {
  it("sin ventas, el esperado es solo el monto inicial", () => {
    const r = calcularCuadreCaja([], 50, "2026-07-01", "2026-07-31");
    expect(r.montoEfectivoEsperado).toBe(50);
    expect(r.totalEfectivo).toBe(0);
  });

  it("excluye ventas anuladas", () => {
    const ventas = [
      venta({ id: "v1", metodoPago: "efectivo", total: 100, estado: "pagada" }),
      venta({ id: "v2", metodoPago: "efectivo", total: 999, estado: "anulada" }),
    ];
    const r = calcularCuadreCaja(ventas, 0, "2026-07-01", "2026-07-31");
    expect(r.totalEfectivo).toBe(100);
  });

  it("respeta el rango de fechas", () => {
    const ventas = [
      venta({ id: "v1", fecha: "2026-06-30T23:00:00.000Z", total: 100 }),
      venta({ id: "v2", fecha: "2026-07-15T10:00:00.000Z", total: 200 }),
      venta({ id: "v3", fecha: "2026-08-01T00:00:00.000Z", total: 300 }),
    ];
    const r = calcularCuadreCaja(ventas, 0, "2026-07-01", "2026-07-31");
    expect(r.totalEfectivo).toBe(200);
  });

  it("agrupa correctamente por método de pago", () => {
    const ventas = [
      venta({ id: "v1", metodoPago: "efectivo", total: 100 }),
      venta({ id: "v2", metodoPago: "tarjeta", total: 200 }),
      venta({ id: "v3", metodoPago: "yape", total: 50 }),
      venta({ id: "v4", metodoPago: "plin", total: 30 }),
      venta({ id: "v5", metodoPago: "transferencia", total: 70 }),
    ];
    const r = calcularCuadreCaja(ventas, 0, "2026-07-01", "2026-07-31");
    expect(r.totalEfectivo).toBe(100);
    expect(r.totalTarjeta).toBe(200);
    expect(r.totalYape).toBe(50);
    expect(r.totalPlin).toBe(30);
    expect(r.totalTransferencia).toBe(70);
  });

  it("el efectivo esperado suma el monto inicial + ventas en efectivo (otros métodos no afectan el efectivo)", () => {
    const ventas = [
      venta({ id: "v1", metodoPago: "efectivo", total: 80 }),
      venta({ id: "v2", metodoPago: "tarjeta", total: 500 }),
    ];
    const r = calcularCuadreCaja(ventas, 100, "2026-07-01", "2026-07-31");
    expect(r.montoEfectivoEsperado).toBe(180);
  });

  it("filtra por sede cuando se pasa sucursalId, incluyendo ventas sin sede asignada", () => {
    const ventas = [
      venta({ id: "v1", metodoPago: "efectivo", total: 100, sucursalId: "suc-1" }),
      venta({ id: "v2", metodoPago: "efectivo", total: 200, sucursalId: "suc-2" }),
      venta({ id: "v3", metodoPago: "efectivo", total: 50, sucursalId: undefined }),
    ];
    const r = calcularCuadreCaja(ventas, 0, "2026-07-01", "2026-07-31", "suc-1");
    expect(r.totalEfectivo).toBe(150);
  });
});
