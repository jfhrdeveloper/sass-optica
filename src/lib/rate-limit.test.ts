import { describe, expect, it } from "vitest";
import { limiteExcedido, ipDelRequest } from "@/lib/rate-limit";

describe("limiteExcedido", () => {
  it("no excede dentro del límite", () => {
    const clave = `test-${Math.random()}`;
    expect(limiteExcedido(clave, 3, 60_000)).toBe(false);
    expect(limiteExcedido(clave, 3, 60_000)).toBe(false);
    expect(limiteExcedido(clave, 3, 60_000)).toBe(false);
  });

  it("excede al superar maxIntentos dentro de la ventana", () => {
    const clave = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) limiteExcedido(clave, 3, 60_000);
    expect(limiteExcedido(clave, 3, 60_000)).toBe(true);
  });

  it("claves distintas no comparten contador", () => {
    const a = `test-a-${Math.random()}`;
    const b = `test-b-${Math.random()}`;
    for (let i = 0; i < 5; i++) limiteExcedido(a, 3, 60_000);
    expect(limiteExcedido(b, 3, 60_000)).toBe(false);
  });

  it("resetea el contador una vez que vence la ventana", async () => {
    const clave = `test-${Math.random()}`;
    limiteExcedido(clave, 1, 10);
    expect(limiteExcedido(clave, 1, 10)).toBe(true);
    await new Promise((r) => setTimeout(r, 20));
    expect(limiteExcedido(clave, 1, 10)).toBe(false);
  });
});

describe("ipDelRequest", () => {
  it("toma la primera IP de x-forwarded-for (la del cliente real)", () => {
    const req = new Request("https://x.test", { headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" } });
    expect(ipDelRequest(req)).toBe("1.2.3.4");
  });

  it("cae a x-real-ip si no hay x-forwarded-for", () => {
    const req = new Request("https://x.test", { headers: { "x-real-ip": "9.9.9.9" } });
    expect(ipDelRequest(req)).toBe("9.9.9.9");
  });

  it("nunca revienta si no hay ningún header de IP", () => {
    const req = new Request("https://x.test");
    expect(ipDelRequest(req)).toBe("desconocido");
  });
});
