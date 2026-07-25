import { cookies } from "next/headers";
import { MOCK_NEGOCIOS_OVERRIDE_COOKIE } from "@/lib/mock/mock-mode";

/* Server-only a propósito (usa next/headers) — nunca importar desde un
   componente "use client" como AdminNav.tsx, por eso vive separado de
   mock-mode.ts. Ver el comentario de MOCK_NEGOCIOS_OVERRIDE_COOKIE. */
export async function leerOverridesActivo(): Promise<Record<string, boolean>> {
  const c = await cookies();
  const raw = c.get(MOCK_NEGOCIOS_OVERRIDE_COOKIE)?.value;
  if (!raw) return {};
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return {};
  }
}

export function aplicarOverridesActivo<T extends { id: string; activo: boolean }>(
  negocios: T[],
  overrides: Record<string, boolean>,
): T[] {
  return negocios.map((n) => (n.id in overrides ? { ...n, activo: overrides[n.id] } : n));
}
