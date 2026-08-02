import { describe, expect, it } from "vitest";
import { nivelDe, puedeLeer, puedeEscribir, puedeLeerModulo, puedeEscribirModulo, nivelBaseDeRol, modulosDeRolPrincipal } from "@/lib/permisos";

describe("nivelDe / puedeLeer / puedeEscribir", () => {
  it("resuelve 'ninguno' cuando la clave no está presente", () => {
    expect(nivelDe({}, "ventas")).toBe("ninguno");
    expect(puedeLeer({}, "ventas")).toBe(false);
    expect(puedeEscribir({}, "ventas")).toBe(false);
  });

  it("'escritura' implica lectura", () => {
    const permisos = { ventas: "escritura" };
    expect(nivelDe(permisos, "ventas")).toBe("escritura");
    expect(puedeLeer(permisos, "ventas")).toBe(true);
    expect(puedeEscribir(permisos, "ventas")).toBe(true);
  });

  it("'lectura' no da escritura", () => {
    const permisos = { ventas: "lectura" };
    expect(puedeLeer(permisos, "ventas")).toBe(true);
    expect(puedeEscribir(permisos, "ventas")).toBe(false);
  });

  it("ignora valores basura (nunca boolean legado)", () => {
    const permisos = { ventas: "true" };
    expect(nivelDe(permisos, "ventas")).toBe("ninguno");
  });
});

describe("puedeLeerModulo / puedeEscribirModulo — piso por defecto (sin rol personalizado)", () => {
  it("administrador siempre puede, en cualquier módulo", () => {
    const admin = { rol: "administrador", permisos: {} };
    expect(puedeLeerModulo(admin, [], "gastos")).toBe(true);
    expect(puedeEscribirModulo(admin, [], "gastos")).toBe(true);
  });

  it("encargado sin rol personalizado: lectura y escritura libres en módulos operativos", () => {
    const encargado = { rol: "encargado", permisos: {} };
    expect(puedeLeerModulo(encargado, [], "ventas")).toBe(true);
    expect(puedeEscribirModulo(encargado, [], "ventas")).toBe(true);
  });

  it("encargado sin rol personalizado: SIN piso en módulos sensibles (gastos/descuentos)", () => {
    const encargado = { rol: "encargado", permisos: {} };
    expect(puedeLeerModulo(encargado, [], "gastos")).toBe(false);
    expect(puedeEscribirModulo(encargado, [], "gastos")).toBe(false);
  });

  it("trabajador sin rol personalizado: lectura libre en operativos, pero NUNCA escritura", () => {
    const trabajador = { rol: "trabajador", permisos: {} };
    expect(puedeLeerModulo(trabajador, [], "ventas")).toBe(true);
    expect(puedeEscribirModulo(trabajador, [], "ventas")).toBe(false);
  });

  it("trabajador sin rol personalizado: sin piso en módulos sensibles", () => {
    const trabajador = { rol: "trabajador", permisos: {} };
    expect(puedeLeerModulo(trabajador, [], "descuentos")).toBe(false);
  });
});

describe("puedeLeerModulo / puedeEscribirModulo — con rol personalizado asignado", () => {
  const roles = [{ id: "r1", permisos: { ventas: "lectura", proveedores: "escritura" } }];

  it("reemplaza el piso por defecto: un módulo en 'ninguno' queda oculto aunque fuera gratis por rol", () => {
    // "clientes" no aparece en el rol -> ninguno, aunque encargado lo tendría gratis sin rol asignado
    const encargado = { rol: "encargado", permisos: {}, rolPersonalizadoId: "r1" };
    expect(puedeLeerModulo(encargado, roles, "clientes")).toBe(false);
  });

  it("da exactamente el nivel configurado, sea cual sea el rol principal", () => {
    const encargado = { rol: "encargado", permisos: {}, rolPersonalizadoId: "r1" };
    const trabajador = { rol: "trabajador", permisos: {}, rolPersonalizadoId: "r1" };
    for (const empleado of [encargado, trabajador]) {
      expect(puedeLeerModulo(empleado, roles, "ventas")).toBe(true);
      expect(puedeEscribirModulo(empleado, roles, "ventas")).toBe(false); // solo lectura
      expect(puedeEscribirModulo(empleado, roles, "proveedores")).toBe(true);
    }
  });

  it("un rol personalizado puede habilitar un módulo sensible (gastos) que por defecto no tenía nadie", () => {
    const conGastos = [{ id: "r2", permisos: { gastos: "lectura" } }];
    const encargado = { rol: "encargado", permisos: {}, rolPersonalizadoId: "r2" };
    expect(puedeLeerModulo(encargado, conGastos, "gastos")).toBe(true);
    expect(puedeEscribirModulo(encargado, conGastos, "gastos")).toBe(false);
  });
});

describe("nivelBaseDeRol / modulosDeRolPrincipal — vista de referencia de Roles principales", () => {
  it("administrador: escritura en todo, incluidos los módulos sensibles", () => {
    expect(nivelBaseDeRol("administrador", "ventas")).toBe("escritura");
    expect(nivelBaseDeRol("administrador", "gastos")).toBe("escritura");
  });

  it("encargado: escritura en operativos, ninguno en sensibles", () => {
    expect(nivelBaseDeRol("encargado", "ventas")).toBe("escritura");
    expect(nivelBaseDeRol("encargado", "gastos")).toBe("ninguno");
  });

  it("trabajador: solo lectura en operativos, ninguno en sensibles", () => {
    expect(nivelBaseDeRol("trabajador", "ventas")).toBe("lectura");
    expect(nivelBaseDeRol("trabajador", "gastos")).toBe("ninguno");
  });

  it("modulosDeRolPrincipal devuelve un nivel por cada módulo delegable", () => {
    const modulos = modulosDeRolPrincipal("trabajador");
    expect(modulos.length).toBeGreaterThan(0);
    expect(modulos.every((m) => ["ninguno", "lectura", "escritura"].includes(m.nivel))).toBe(true);
  });
});
