"use client";

/* ================= SESSION PROVIDER =================
   Sesión basada en auth.uid() de Supabase. El empleado activo se busca dentro
   del store (DataProvider) por el id autenticado. Sin impersonación/delegación
   (no aplica a este proyecto — ver docs/architecture.md). */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useData, type Empleado } from "@/components/providers/DataProvider";

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
  const supabase = useMemo(() => createClient(), []);
  const d = useData();
  const [authId, setAuthId] = useState<string | null>(null);
  const [ready, setReady]   = useState(false);

  /* ====== Carga sesión + suscripción a auth state ====== */
  useEffect(() => {
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
  }, [supabase]);

  const empleado = useMemo(
    () => authId ? d.empleados.find((e) => e.id === authId) ?? null : null,
    [authId, d.empleados],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? window.location.hostname;
      window.location.href = `${window.location.protocol}//${rootDomain}${
        window.location.port ? `:${window.location.port}` : ""
      }/login`;
    }
  }, [supabase]);

  const value: SessionCtx = { empleado, signOut, ready };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ================= HOOK ================= */
export function useSession(): SessionCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return v;
}
