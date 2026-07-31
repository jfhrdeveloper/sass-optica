import { describe, expect, it } from "vitest";
import { puedeVerSucursal } from "@/lib/sucursales";

describe("puedeVerSucursal", () => {
  it("empleado sin sede asignada ve todo (caso común, negocio de una sola sede)", () => {
    expect(puedeVerSucursal(null, "suc-1")).toBe(true);
    expect(puedeVerSucursal(undefined, "suc-2")).toBe(true);
    expect(puedeVerSucursal(null, null)).toBe(true);
  });

  it("empleado con sede X ve las filas de esa misma sede", () => {
    expect(puedeVerSucursal("suc-1", "suc-1")).toBe(true);
  });

  it("empleado con sede X ve filas sin sede asignada (dato histórico)", () => {
    expect(puedeVerSucursal("suc-1", null)).toBe(true);
    expect(puedeVerSucursal("suc-1", undefined)).toBe(true);
  });

  it("empleado con sede X NO ve filas de la sede Y", () => {
    expect(puedeVerSucursal("suc-1", "suc-2")).toBe(false);
  });
});
