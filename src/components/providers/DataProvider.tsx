"use client";

/* ================= DATA PROVIDER — FUENTE ÚNICA DE VERDAD =================
   Store global compartido por TODOS los roles dentro de un mismo negocio. El
   navegador nunca mantiene estado paralelo por rol: toda lectura sale de
   aquí y toda escritura va por add()/update()/delete(). `cargar()` fetchea las
   tablas en paralelo y se suscribe a postgres_changes → cualquier cambio
   re-fetchea y todos los useData() consumidores se re-renderizan.

   Entidades de la capa de auth/tenant: `empleados` (equipo del negocio),
   `negocio` (el propio tenant), `suscripcion` (solo visible para
   administrador, por RLS — para otros roles queda null, no es un error).
   Las tablas de dominio de la óptica (clientes, citas, productos...) se
   añaden en una fase posterior replicando este mismo patrón. Recuerda:
   campo nuevo de DB ⇒ tipo aquí + mappers (ambos sentidos) + supabase-schema.sql. */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rowToEmpleado, empleadoToRow, rowToNegocio, negocioToRow, rowToSuscripcion } from "@/lib/data/mappers";

/* ================= TIPOS ================= */
export type Rol = "administrador" | "encargado" | "trabajador";

export interface Empleado {
  id:            string;
  negocioId:     string | null;
  nombres:       string;
  apellidos:     string;
  rol:           Rol;
  email?:        string;
  telefono?:     string;
  avatarBase64?: string;
  activo:        boolean;
}

export interface Negocio {
  id:         string;
  nombre:     string;
  subdominio: string;
  ruc?:       string;
  telefono?:  string;
  direccion?: string;
  logoUrl?:   string;
  activo:     boolean;
}

export interface Suscripcion {
  id:               string;
  negocioId:        string;
  plan:             string;
  estado:           string;
  trialInicio:      string;
  trialFin:         string;
  fechaPagoUltimo?: string;
  proximoCobro?:    string;
}

interface DataCtx {
  empleados:   Empleado[];
  negocio:     Negocio | null;
  suscripcion: Suscripcion | null;
  ready:       boolean;
  /* CRUD (la mutación va a Supabase; Realtime re-fetchea). */
  updateEmpleado: (id: string, patch: Partial<Empleado>) => Promise<void>;
  updateNegocio:  (patch: Partial<Negocio>) => Promise<void>;
}

const Ctx = createContext<DataCtx | null>(null);

/* ================= PROVIDER ================= */
export function DataProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [empleados, setEmpleados]     = useState<Empleado[]>([]);
  const [negocio, setNegocio]         = useState<Negocio | null>(null);
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null);
  const [ready, setReady]             = useState(false);

  /* ====== Carga inicial (todas las tablas en paralelo) + Realtime ======
     `cargar` vive DENTRO del efecto (no como useCallback externo) para que
     el fetch se dispare como reacción al montaje, no como una llamada a
     setState "suelta" en el cuerpo del efecto. `activo` evita setState tras
     desmontar si la respuesta llega después del cleanup. */
  useEffect(() => {
    let activo = true;

    async function cargar() {
      const [e, n, s] = await Promise.all([
        supabase.from("empleados").select("*"),
        supabase.from("negocios").select("*"),
        supabase.from("suscripciones").select("*"),
      ]);
      if (!activo) return;
      setEmpleados((e.data ?? []).map(rowToEmpleado));
      setNegocio((n.data ?? []).map(rowToNegocio)[0] ?? null);
      setSuscripcion((s.data ?? []).map(rowToSuscripcion)[0] ?? null);
      setReady(true);
    }

    void cargar();
    const ch = supabase
      .channel("tenant:auth-layer")
      .on("postgres_changes", { event: "*", schema: "public", table: "empleados" }, () => void cargar())
      .on("postgres_changes", { event: "*", schema: "public", table: "negocios" }, () => void cargar())
      .on("postgres_changes", { event: "*", schema: "public", table: "suscripciones" }, () => void cargar())
      .subscribe();
    return () => { activo = false; void supabase.removeChannel(ch); };
  }, [supabase]);

  /* ====== Mutaciones (Realtime refresca; no setState optimista) ====== */
  const updateEmpleado = useCallback(async (id: string, patch: Partial<Empleado>) => {
    await supabase.from("empleados").update(empleadoToRow(patch)).eq("id", id);
  }, [supabase]);

  const updateNegocio = useCallback(async (patch: Partial<Negocio>) => {
    if (!negocio) return;
    await supabase.from("negocios").update(negocioToRow(patch)).eq("id", negocio.id);
  }, [supabase, negocio]);

  const value: DataCtx = { empleados, negocio, suscripcion, ready, updateEmpleado, updateNegocio };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ================= HOOK ================= */
export function useData(): DataCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useData debe usarse dentro de <DataProvider>");
  return v;
}
