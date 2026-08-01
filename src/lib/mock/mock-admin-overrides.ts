import { cookies } from "next/headers";
import {
  MOCK_NEGOCIOS_OVERRIDE_COOKIE, MOCK_RECLAMOS_OVERRIDE_COOKIE, MOCK_NOTAS_SOPORTE_COOKIE,
  MOCK_MEJORAS_ESTADO_COOKIE,
} from "@/lib/mock/mock-mode";

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

type OverrideReclamo = { estado: string; respuesta: string | null };

export async function leerOverridesReclamos(): Promise<Record<string, OverrideReclamo>> {
  const c = await cookies();
  const raw = c.get(MOCK_RECLAMOS_OVERRIDE_COOKIE)?.value;
  if (!raw) return {};
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return {};
  }
}

export function aplicarOverridesReclamos<T extends { id: string; estado: string; respuesta: string | null }>(
  reclamos: T[],
  overrides: Record<string, OverrideReclamo>,
): T[] {
  return reclamos.map((r) => (r.id in overrides ? { ...r, ...overrides[r.id] } : r));
}

export type NotaSoporteMock = { id: string; negocio_id: string; autor: string; texto: string; created_at: string };

/* A diferencia de leerOverridesActivo/leerOverridesReclamos (un mapa que
   REEMPLAZA campos existentes), acá la cookie guarda un array que se
   acumula: cada nota nueva se agrega vía POST /api/admin/negocios/notas,
   nunca reemplaza a las anteriores (ver MOCK_NOTAS_SOPORTE_COOKIE). */
export async function leerNotasSoporteMock(): Promise<NotaSoporteMock[]> {
  const c = await cookies();
  const raw = c.get(MOCK_NOTAS_SOPORTE_COOKIE)?.value;
  if (!raw) return [];
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return [];
  }
}

/* ================= BUZÓN DE MEJORAS (mock) ================= */

/** Mapa id→estado — mismo criterio que leerOverridesActivo (reemplaza un
 *  campo), usado por /api/admin/mejoras/actualizar. */
export async function leerOverridesMejoras(): Promise<Record<string, string>> {
  const c = await cookies();
  const raw = c.get(MOCK_MEJORAS_ESTADO_COOKIE)?.value;
  if (!raw) return {};
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return {};
  }
}

