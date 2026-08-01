"use client";

import { useEffect, useState } from "react";
import { Lightbulb, ThumbsUp, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { isMockMode } from "@/lib/mock/mock-mode";
import { MOCK_MEJORAS } from "@/lib/mock/mock-data";
import { SlideOver } from "@/components/ui/SlideOver";
import { formatearFecha } from "@/lib/formato/date";

interface Mejora {
  id: string; titulo: string; descripcion: string | null; estado: string;
  createdAt: string; esMia: boolean; totalVotos: number; yoVote: boolean;
}

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente", planificado: "Planificado", en_progreso: "En progreso",
  completado: "Completado", rechazado: "Rechazado",
};
const ESTADO_BADGE: Record<string, string> = {
  pendiente: "badge-neutral", planificado: "badge-warning", en_progreso: "badge-warning",
  completado: "badge-success", rechazado: "badge-danger",
};
const ESTADOS_ACTIVOS = ["pendiente", "planificado", "en_progreso"];

/* Tablero de mejoras compartido entre TODAS las ópticas (ver
   mejoras_publicas/mejoras_sugeridas/mejoras_votos en supabase-schema.sql) —
   la única pantalla del dashboard que muestra datos cross-tenant: se lee la
   vista mejoras_publicas, que ya anonimiza qué negocio propuso o votó cada
   cosa (nunca expone negocio_id de un tercero). Solo administrador propone;
   cualquier rol puede votar — el voto es por negocio, no por persona. */
export default function MejorasPage() {
  const { negocio } = useData();
  const { empleado } = useSession();
  const toast = useToast();
  const mock = isMockMode();
  const esAdmin = empleado?.rol === "administrador";

  const [mejoras, setMejoras] = useState<Mejora[]>(
    mock ? MOCK_MEJORAS.map((m) => ({
      id: m.id, titulo: m.titulo, descripcion: m.descripcion, estado: m.estado,
      createdAt: m.createdAt, esMia: m.esMia, totalVotos: m.totalVotos, yoVote: m.yoVote,
    })) : [],
  );
  const [cargando, setCargando] = useState(!mock);
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [votandoId, setVotandoId] = useState<string | null>(null);
  // Incrementarlo fuerza al efecto de abajo a re-fetchear — evita pasar una
  // función que llama setState como dependencia del efecto (dispara la regla
  // react-hooks/set-state-in-effect), mismo motivo por el que Realtime en
  // DataProvider re-dispara `cargar` desde un callback de suscripción y no
  // desde una referencia de función en las deps.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (mock) return;
    let activo = true;
    async function cargar() {
      const supabase = createClient();
      const { data } = await supabase
        .from("mejoras_publicas")
        .select("id, titulo, descripcion, estado, created_at, es_mia, total_votos, yo_vote")
        .order("created_at", { ascending: false });
      if (!activo) return;
      setMejoras((data ?? []).map((r) => ({
        id: r.id, titulo: r.titulo, descripcion: r.descripcion, estado: r.estado,
        createdAt: r.created_at, esMia: r.es_mia, totalVotos: r.total_votos, yoVote: r.yo_vote,
      })));
      setCargando(false);
    }
    void cargar();
    return () => { activo = false; };
  }, [mock, version]);

  async function toggleVoto(m: Mejora) {
    if (!negocio || votandoId) return;
    setVotandoId(m.id);
    if (mock) {
      setMejoras((prev) => prev.map((x) => x.id === m.id
        ? { ...x, yoVote: !x.yoVote, totalVotos: x.totalVotos + (x.yoVote ? -1 : 1) }
        : x));
      setVotandoId(null);
      return;
    }
    const supabase = createClient();
    if (m.yoVote) {
      await supabase.from("mejoras_votos").delete().eq("mejora_id", m.id).eq("negocio_id", negocio.id);
    } else {
      await supabase.from("mejoras_votos").insert({ mejora_id: m.id, negocio_id: negocio.id });
    }
    setVersion((v) => v + 1);
    setVotandoId(null);
  }

  async function onSubmitProponer(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !negocio) return;
    setGuardando(true);
    if (mock) {
      setMejoras((prev) => [{
        id: crypto.randomUUID(), titulo, descripcion: descripcion || null, estado: "pendiente",
        createdAt: new Date().toISOString(), esMia: true, totalVotos: 0, yoVote: false,
      }, ...prev]);
    } else {
      const supabase = createClient();
      await supabase.from("mejoras_sugeridas").insert({ negocio_id: negocio.id, titulo, descripcion: descripcion || null });
      setVersion((v) => v + 1);
    }
    setGuardando(false);
    toast("Mejora enviada. Gracias por el aporte.");
    setTitulo("");
    setDescripcion("");
    setAbierto(false);
  }

  const activas = mejoras.filter((m) => ESTADOS_ACTIVOS.includes(m.estado)).sort((a, b) => b.totalVotos - a.totalVotos);
  const historial = mejoras.filter((m) => !ESTADOS_ACTIVOS.includes(m.estado)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function Tarjeta({ m }: { m: Mejora }) {
    return (
      <div className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-medium text-slate-900 dark:text-slate-100">{m.titulo}</h3>
              <span className={`badge ${ESTADO_BADGE[m.estado] ?? "badge-neutral"}`}>{ESTADO_LABEL[m.estado] ?? m.estado}</span>
              {m.esMia && <span className="badge badge-neutral">Propuesta por ti</span>}
            </div>
            {m.descripcion && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{m.descripcion}</p>}
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{formatearFecha(m.createdAt)}</p>
          </div>
          <button
            onClick={() => toggleVoto(m)}
            disabled={votandoId === m.id}
            title={m.yoVote ? "Quitar tu voto" : "Votar por esta mejora"}
            className={`flex shrink-0 flex-col items-center gap-0.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              m.yoVote
                ? "border-primary bg-primary-light text-primary"
                : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            <ThumbsUp size={15} />
            {m.totalVotos}
          </button>
        </div>
      </div>
    );
  }

  return (
    <main>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Mejoras</h1>
        {esAdmin && (
          <button onClick={() => setAbierto(true)} className="btn-primary gap-1.5">
            <Plus size={16} /> Proponer mejora
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Ideas que otras ópticas también usan el sistema propusieron. Vota las que más te sirvan —
        priorizamos lo que se implementa según los votos.
      </p>

      <div className="mt-6 space-y-3">
        {activas.map((m) => <Tarjeta key={m.id} m={m} />)}
        {!cargando && activas.length === 0 && (
          <div className="table-empty">
            <Lightbulb size={28} className="text-slate-300 dark:text-slate-600" />
            Sin mejoras pendientes de votar por ahora.
          </div>
        )}
      </div>

      {historial.length > 0 && (
        <details className="accordion-item mt-8">
          <summary className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Historial ({historial.length})
          </summary>
          <div className="mt-3 space-y-3">
            {historial.map((m) => <Tarjeta key={m.id} m={m} />)}
          </div>
        </details>
      )}

      <SlideOver abierto={abierto} onClose={() => setAbierto(false)} titulo="Proponer mejora">
        <form onSubmit={onSubmitProponer} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Título</label>
            <input
              required value={titulo} onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Recordatorio de citas por SMS"
              className="input mt-1 w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Descripción (opcional)</label>
            <textarea
              value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
              rows={4} placeholder="Cuéntanos el problema que resolvería"
              className="input mt-1 w-full text-sm"
            />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Se muestra a todas las ópticas para que voten, sin decir que la propusiste tú.
          </p>
          <button type="submit" disabled={guardando || !titulo.trim()} className="btn-primary w-full">
            {guardando ? "Enviando…" : "Enviar propuesta"}
          </button>
        </form>
      </SlideOver>
    </main>
  );
}
