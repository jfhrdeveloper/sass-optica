"use client";

import { useState } from "react";
import { CalendarDays, List, Plus, User, FileText, Pencil, Trash2 } from "lucide-react";
import { useData, type Cita } from "@/components/providers/DataProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { SlideOver } from "@/components/SlideOver";
import { CalendarioMes } from "@/components/CalendarioMes";
import { Pagination } from "@/components/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { DateRangePicker } from "@/components/DateRangePicker";

const ESTADOS = ["programada", "atendida", "cancelada", "no_asistio"] as const;
const VACIO: Partial<Cita> = { estado: "programada" };

/* Convierte el día clickeado en el calendario al formato que espera el
   input `datetime-local` (YYYY-MM-DDTHH:mm), con 9:00 a. m. como hora por
   defecto — el usuario ajusta la hora exacta en el propio formulario, esto
   solo evita que tenga que escribir la fecha completa desde cero. Se arma
   a mano con los componentes LOCALES de la fecha (no toISOString, que usa
   UTC) para no correrse de día según la zona horaria del navegador. */
function aInputLocal(fecha: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T09:00`;
}

export default function CitasPage() {
  const { citas, clientes, addCita, updateCita, deleteCita, addReceta } = useData();
  const toast = useToast();
  const [form, setForm] = useState<Partial<Cita>>(VACIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [recetaAbierta, setRecetaAbierta] = useState<string | null>(null);
  const [receta, setReceta] = useState<Record<string, string>>({});

  /* Calendario por defecto (más útil de un vistazo para agendar) — Lista
     sigue disponible para cuando hace falta buscar por estado o rango de
     fechas, algo que un calendario mensual no resuelve bien. Los filtros
     de estado/fecha solo aplican a Lista: el calendario ya se navega mes a
     mes y mostrar TODAS las citas del mes es justamente el punto. */
  const [vista, setVista] = useState<"lista" | "calendario">("calendario");
  const [mesActual, setMesActual] = useState(() => new Date());
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const nombreCliente = (id: string) => {
    const c = clientes.find((c) => c.id === id);
    return c ? `${c.nombres} ${c.apellidos}` : "—";
  };

  /* `fechaHora` opcional: viene prellenada cuando se abre desde un click en
     un día del calendario (ver aInputLocal más arriba); el botón "Agendar
     cita" de la cabecera llama a nueva() sin argumento y arranca vacío. */
  function nueva(fechaHora?: string) {
    setEditandoId(null);
    setForm(fechaHora ? { ...VACIO, fechaHora } : VACIO);
    setAbierto(true);
  }
  function editar(c: Cita) {
    setEditandoId(c.id);
    setForm(c);
    setAbierto(true);
  }
  function cerrar() {
    setAbierto(false);
    setEditandoId(null);
    setForm(VACIO);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clienteId || !form.fechaHora) return;
    setGuardando(true);
    if (editandoId) {
      await updateCita(editandoId, form);
      toast("Cambios guardados.");
    } else {
      await addCita(form);
      toast("Cita agendada.");
    }
    setGuardando(false);
    cerrar();
  }

  async function eliminar(c: Cita) {
    await deleteCita(c.id);
    toast("Cita eliminada.", "info");
  }

  async function guardarReceta(citaId: string, clienteId: string) {
    await addReceta({
      clienteId, citaId, tipo: "lejos",
      odEsfera: receta.odEsfera ? Number(receta.odEsfera) : undefined,
      odCilindro: receta.odCilindro ? Number(receta.odCilindro) : undefined,
      odEje: receta.odEje ? Number(receta.odEje) : undefined,
      oiEsfera: receta.oiEsfera ? Number(receta.oiEsfera) : undefined,
      oiCilindro: receta.oiCilindro ? Number(receta.oiCilindro) : undefined,
      oiEje: receta.oiEje ? Number(receta.oiEje) : undefined,
      dip: receta.dip ? Number(receta.dip) : undefined,
    });
    setRecetaAbierta(null);
    setReceta({});
    toast("Receta guardada.");
  }

  const filtradas = citas
    .filter((c) => filtroEstado === "todos" || c.estado === filtroEstado)
    .filter((c) => !desde || c.fechaHora.slice(0, 10) >= desde)
    .filter((c) => !hasta || c.fechaHora.slice(0, 10) <= hasta)
    .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
  const { pagina, setPagina, totalPaginas, visibles } = usePaginado(filtradas);

  return (
    <main>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Citas</h1>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-800">
          <button
            onClick={() => setVista("calendario")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              vista === "calendario" ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <CalendarDays size={15} /> Calendario
          </button>
          <button
            onClick={() => setVista("lista")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              vista === "lista" ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <List size={15} /> Lista
          </button>
        </div>

        {vista === "lista" && (
          <>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="select text-sm">
              <option value="todos">Todos los estados</option>
              {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <DateRangePicker desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); }} />
          </>
        )}
        <button onClick={() => nueva()} className="btn-primary ml-auto gap-1.5">
          <Plus size={16} /> Agendar cita
        </button>
      </div>

      {vista === "calendario" ? (
        <div className="mt-4">
          <CalendarioMes
            mesActual={mesActual}
            onCambiarMes={(delta) => setMesActual((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))}
            onIrAHoy={() => setMesActual(new Date())}
            citas={citas}
            nombreCliente={nombreCliente}
            onClickDia={(fecha) => nueva(aInputLocal(fecha))}
            onClickCita={(cita) => editar(cita)}
          />
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {visibles.map((c) => (
            <div key={c.id} className="card p-3 text-sm transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="row-avatar shrink-0"><User size={16} /></span>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">{nombreCliente(c.clienteId)}</div>
                    <div className="text-slate-500 dark:text-slate-400">
                      {/* suppressHydrationWarning: Intl puede formatear con espacios Unicode
                          distintos entre el ICU de Node (SSR) y el del navegador (mismo texto
                          visible, whitespace interno distinto) — falso positivo conocido de
                          React, no un bug real. */}
                      <span suppressHydrationWarning>{new Date(c.fechaHora).toLocaleString("es-PE", { timeZone: "America/Lima" })}</span> · {c.estado} {c.motivo ? `· ${c.motivo}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => setRecetaAbierta(recetaAbierta === c.id ? null : c.id)} title="Receta" className="row-icon-btn">
                    <FileText size={15} />
                  </button>
                  <button onClick={() => editar(c)} title="Editar" className="row-icon-btn">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => eliminar(c)} title="Eliminar" className="row-icon-btn row-icon-btn-danger">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {recetaAbierta === c.id && (
                <div className="mt-3 grid grid-cols-4 gap-2 border-t pt-3 text-xs">
                  <span className="col-span-full font-medium">OD (ojo derecho)</span>
                  <input placeholder="Esfera" onChange={(e) => setReceta({ ...receta, odEsfera: e.target.value })} className="input text-sm" />
                  <input placeholder="Cilindro" onChange={(e) => setReceta({ ...receta, odCilindro: e.target.value })} className="input text-sm" />
                  <input placeholder="Eje" onChange={(e) => setReceta({ ...receta, odEje: e.target.value })} className="input text-sm" />
                  <span className="col-span-full mt-1 font-medium">OI (ojo izquierdo)</span>
                  <input placeholder="Esfera" onChange={(e) => setReceta({ ...receta, oiEsfera: e.target.value })} className="input text-sm" />
                  <input placeholder="Cilindro" onChange={(e) => setReceta({ ...receta, oiCilindro: e.target.value })} className="input text-sm" />
                  <input placeholder="Eje" onChange={(e) => setReceta({ ...receta, oiEje: e.target.value })} className="input text-sm" />
                  <input placeholder="DIP (mm)" onChange={(e) => setReceta({ ...receta, dip: e.target.value })} className="input text-sm" />
                  <button onClick={() => guardarReceta(c.id, c.clienteId)} className="btn-primary col-span-full text-sm">
                    Guardar receta
                  </button>
                </div>
              )}
            </div>
          ))}
          {filtradas.length === 0 && <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Sin citas para este filtro.</p>}
          <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
        </div>
      )}

      <SlideOver abierto={abierto} onClose={cerrar} titulo={editandoId ? "Editar cita" : "Agendar cita"}>
        <form onSubmit={onSubmit} className="space-y-3">
          <select required value={form.clienteId ?? ""} onChange={(e) => setForm({ ...form, clienteId: e.target.value })} className="select w-full text-sm">
            <option value="">Cliente…</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>)}
          </select>
          <input type="datetime-local" required value={form.fechaHora?.slice(0, 16) ?? ""} onChange={(e) => setForm({ ...form, fechaHora: e.target.value })} className="input w-full text-sm" />
          <input placeholder="Motivo" value={form.motivo ?? ""} onChange={(e) => setForm({ ...form, motivo: e.target.value })} className="input w-full text-sm" />
          <select value={form.estado ?? "programada"} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="select w-full text-sm">
            {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="submit" disabled={guardando} className="btn-primary w-full">
            {editandoId ? "Guardar cambios" : "Agendar cita"}
          </button>
        </form>
      </SlideOver>
    </main>
  );
}
