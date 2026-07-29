import { describe, expect, it } from "vitest";
import { NextRequest, NextResponse } from "next/server";

/* Este test no ejercita proxy() completo (requeriría mockear el cliente de
   Supabase) — verifica, contra la API real de Next.js, el mecanismo exacto
   que causó el bug encontrado en la sesión 2026-07-29 (13): un header
   puesto con `response.headers.set(...)` DESPUÉS de construir la respuesta
   nunca llega al request que ve un Server Component vía `headers()`; solo
   los headers pasados dentro de `{ request: { headers } }` AL CONSTRUIR la
   respuesta se traducen a `x-middleware-request-*` (el mecanismo interno
   que Next.js usa para reconstruir el request downstream — ver
   next/dist/server/web/spec-extension/response.js, handleMiddlewareField).

   Sin este test, el bug solo se hubiera descubierto recién con Supabase
   real conectado (el modo mock lo enmascara usando una cookie en vez de
   este header) — exactamente el escenario que preocupa antes de
   "validar con negocios reales" (ver docs/pending-task.md). */
describe("proxy.ts — mecanismo de headers hacia el Server Component", () => {
  it("BUG (patrón viejo): setear el header en la respuesta YA construida no viaja al request downstream", () => {
    const request = new NextRequest("https://negocio.dominio.pe/dashboard");
    // Este es EXACTAMENTE el patrón que tenía proxy.ts antes del fix.
    const res = NextResponse.next({ request });
    res.headers.set("x-negocio-id", "neg-123");

    // Next.js solo reconstruye el request downstream a partir de
    // x-middleware-request-<key> — y ese header nunca se genera para algo
    // seteado DESPUÉS de construir la respuesta, sin importar qué más haya
    // en x-middleware-override-headers (que sí trae las cabeceras
    // ORIGINALES del request, reenviadas sin cambios).
    expect(res.headers.get("x-middleware-request-x-negocio-id")).toBeNull();
  });

  it("FIX: headers pasados dentro de request.headers AL CONSTRUIR sí viajan downstream", () => {
    const request = new NextRequest("https://negocio.dominio.pe/dashboard");
    const headers = new Headers(request.headers);
    headers.set("x-negocio-id", "neg-123");
    const res = NextResponse.next({ request: { headers } });

    expect(res.headers.get("x-middleware-override-headers")).toContain("x-negocio-id");
    expect(res.headers.get("x-middleware-request-x-negocio-id")).toBe("neg-123");
  });

  it("FIX: el mismo mecanismo aplica a NextResponse.rewrite (usado para admin.dominio)", () => {
    const request = new NextRequest("https://admin.dominio.pe/negocios");
    const headers = new Headers(request.headers);
    headers.set("x-super-admin", "1");
    const destino = new URL("https://admin.dominio.pe/admin-panel/negocios");
    const res = NextResponse.rewrite(destino, { request: { headers } });

    expect(res.headers.get("x-middleware-request-x-super-admin")).toBe("1");
  });
});
