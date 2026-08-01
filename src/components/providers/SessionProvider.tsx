"use client";

/* ================= SESSION PROVIDER =================
   Sesión basada en auth.uid() de Supabase. El empleado activo se busca dentro
   del store (DataProvider) por el id autenticado. Sin impersonación/delegación
   (no aplica a este proyecto — ver docs/architecture.md). */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useData, type Empleado } from "@/components/providers/DataProvider";
import { isMockMode, MOCK_COOKIE, leerCookie } from "@/lib/mock/mock-mode";
import { MOCK_EMPLEADO } from "@/lib/mock/mock-data";

/* ================= TIPOS ================= */
export interface SessionCtx {
  empleado: Empleado | null;
  signOut:  () => void;
  ready:    boolean;
}

const Ctx = createContext<SessionCtx | null>(null);
export const SessionContext = Ctx;

/* ================= PROVIDER ================= */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const mock = isMockMode();
  const supabase = useMemo(() => createClient(), []);
  const d = useData();
  /* En SSR no hay `document.cookie` — arranca con el admin por defecto
     (MOCK_EMPLEADO) y, si el cookie elegía otro rol, se corrige apenas monta
     en el cliente (ver el useEffect de abajo). Evita un mismatch de
     hidratación: el servidor siempre renderiza el mismo empleado por defecto. */
  const [authId, setAuthId] = useState<string | null>(mock ? MOCK_EMPLEADO.id : null);
  const [ready, setReady]   = useState(mock);

  /* ====== Carga sesión + suscripción a auth state ======
     En modo mock (ver mock-mode.ts) no hay auth.getUser() real — el "id
     autenticado" es el empleado mock que se eligió en el selector rápido de
     /login (cookie MOCK_COOKIE), leído recién en el cliente. */
  useEffect(() => {
    if (!mock) return;
    const idElegido = leerCookie(MOCK_COOKIE);
    if (idElegido && idElegido !== authId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- la cookie solo se puede leer en el cliente
      setAuthId(idElegido);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- corre una sola vez al montar, no en cada cambio de authId
  }, [mock]);
  useEffect(() => {
    if (mock) return;
    let active = true;
    async function bootstrap() {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setAuthId(data.user?.id ?? null);
      setReady(true);
    }
    void bootstrap();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setAuthId(sess?.user?.id ?? null);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [supabase, mock]);

  const empleado = useMemo(
    () => authId ? d.empleados.find((e) => e.id === authId) ?? null : null,
    [authId, d.empleados],
  );

  const signOut = useCallback(async () => {
    if (mock) {
      document.cookie = `${MOCK_COOKIE}=; path=/; max-age=0`;
      window.location.href = "/login";
      return;
    }
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? window.location.hostname;
      window.location.href = `${window.location.protocol}//${rootDomain}${
        window.location.port ? `:${window.location.port}` : ""
      }/login`;
    }
  }, [supabase, mock]);

  const value: SessionCtx = { empleado, signOut, ready };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ================= HOOK ================= */
export function useSession(): SessionCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return v;
}
