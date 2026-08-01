import { describe, expect, it } from "vitest";
import { esRolSimulable } from "@/lib/simulacion-rol";

describe("esRolSimulable", () => {
  it("acepta encargado y trabajador", () => {
    expect(esRolSimulable("encargado")).toBe(true);
    expect(esRolSimulable("trabajador")).toBe(true);
  });

  it("rechaza administrador — nunca se puede simular hacia arriba", () => {
    expect(esRolSimulable("administrador")).toBe(false);
  });

  it("rechaza valores nulos, vacíos o inválidos", () => {
    expect(esRolSimulable(null)).toBe(false);
    expect(esRolSimulable(undefined)).toBe(false);
    expect(esRolSimulable("")).toBe(false);
    expect(esRolSimulable("cualquier-otra-cosa")).toBe(false);
  });
});
