"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, User, Search, Pencil, Trash2, Users } from "lucide-react";
import { useData, type Cliente } from "@/components/providers/DataProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { SlideOver } from "@/components/SlideOver";
import { Stepper } from "@/components/Stepper";
import { Pagination } from "@/components/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";

const VACIO: Partial<Cliente> = { nombres: "", apellidos: "", documentoTipo: "DNI" };
const DIAS_RIESGO = 180;

const ESTADO_LABEL: Record<string, string> = {
  programada: "Programada", atendida: "Atendida", cancelada: "Cancelada", no_asistio: "No asistió",
};
const ESTADO_BADGE: Record<string, string> = {
  programada: "badge-warning", atendida: "badge-success", cancelada: "badge-neutral", no_asistio: "badge-danger",
};

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ClientesPage() {
  const { clientes, citas, recetas, ventas, addCliente, updateCliente, deleteCliente } = useData();
  const toast = useToast();
  const [form, setForm] = useState<Partial<Cliente>>(VACIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRiesgo, setFiltroRiesgo] = useState<"todos" | "riesgo" | "al_dia">("todos");
  const [guardando, setGuardando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState(1);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  /* Capturado una sola vez (lazy initializer) en vez de Date.now() directo
     en el render — el render debe ser puro/idempotente (regla del proyecto,
     react-hooks/purity). Suficiente para "en riesgo": no necesita ser
     al-segundo exacto dentro de una misma sesión. */
  const [ahora] = useState(() => Date.now());

  /* Historial por cliente (idea de UX pedida por el usuario: "no se nota si
     ha venido, si es su primera vez, etc."): se deriva de `citas` sin campo
     nuevo en la DB — cuántas citas tiene en total, cuántas terminó atendido
     de verdad, y cuál fue la más reciente. */
  const historialPorCliente = useMemo(() => {
    const mapa = new Map<string, { total: number; atendidas: number; ultima: string | null }>();
    for (const c of citas) {
      const actual = mapa.get(c.clienteId) ?? { total: 0, atendidas: 0, ultima: null };
      actual.total += 1;
      if (c.estado === "atendida") actual.atendidas += 1;
      if (!actual.ultima || c.fechaHora > actual.ultima) actual.ultima = c.fechaHora;
      mapa.set(c.clienteId, actual);
    }
    return mapa;
  }, [citas]);

  function historialDe(clienteId: string) {
    return historialPorCliente.get(clienteId) ?? { total: 0, atendidas: 0, ultima: null };
  }

  /* "En riesgo" (idea de UX #8 del research de competencia, adaptada a
     óptica: paciente sin control hace X meses) — solo se marca si el
     cliente TIENE historial de citas y la más reciente ya pasó el umbral;
     un cliente sin citas todavía no se marca (no hay línea base para
     comparar, y marcarlo penalizaría a los recién creados). */
  function enRiesgo(clienteId: string): boolean {
    const ultima = historialDe(clienteId).ultima;
    if (!ultima) return false;
    const dias = (ahora - new Date(ultima).getTime()) / 86400000;
    return dias > DIAS_RIESGO;
  }

  const filtrados = clientes
    .filter((c) => `${c.nombres} ${c.apellidos} ${c.documentoNumero ?? ""}`.toLowerCase().includes(busqueda.toLowerCase()))
    .filter((c) => {
      if (filtroRiesgo === "todos") return true;
      const riesgo = enRiesgo(c.id);
      return filtroRiesgo === "riesgo" ? riesgo : !riesgo;
    });
  const { pagina, setPagina, totalPaginas, visibles } = usePaginado(filtrados);

  function nuevo() {
    setEditandoId(null);
    setForm(VACIO);
    setPaso(1);
    setAbierto(true);
  }
  function editar(c: Cliente) {
    setDetalleId(null); // cierra el panel de historial si se edita desde ahí (evita dos SlideOver abiertos a la vez)
    setEditandoId(c.id);
    setForm(c);
    setPaso(1);
    setAbierto(true);
  }
  function cerrar() {
    setAbierto(false);
    setEditandoId(null);
    setForm(VACIO);
    setPaso(1);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombres) return;
    setGuardando(true);
    if (editandoId) {
      await updateCliente(editandoId, form);
      toast("Cambios guardados.");
    } else {
      await addCliente(form);
      toast("Cliente agregado.");
    }
    setGuardando(false);
    cerrar();
  }

  async function eliminar(c: Cliente) {
    await deleteCliente(c.id);
    toast(`${c.nombres} eliminado.`, "info");
  }

  /* Sin useMemo a propósito: el panel de historial solo se abre por click
     manual (no en cada tecla de un input como el filtro de arriba), así
     que recalcular estos 3 arrays en cada render es imperceptible — no
     vale la pena la complejidad extra de memoizarlos. */
  const clienteDetalle = clientes.find((c) => c.id === detalleId) ?? null;
  const citasDelDetalle = clienteDetalle
    ? [...citas].filter((c) => c.clienteId === clienteDetalle.id).sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))
    : [];
  const recetasDelDetalle = clienteDetalle
    ? [...recetas].filter((r) => r.clienteId === clienteDetalle.id).sort((a, b) => b.fecha.localeCompare(a.fecha))
    : [];
  const ventasDelDetalle = clienteDetalle
    ? [...ventas].filter((v) => v.clienteId === clienteDetalle.id).sort((a, b) => b.fecha.localeCompare(a.fecha))
    : [];

  return (
    <main>
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm font-medium link">← Inicio</Link>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Clientes</h1>
      </div>

      <div className="table-card mt-4">
        <div className="table-filter-bar">
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Buscar por nombre o documento…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              className="input w-full pl-9 text-sm"
            />
          </div>
          <select value={filtroRiesgo} onChange={(e) => setFiltroRiesgo(e.target.value as typeof filtroRiesgo)} className="select text-sm">
            <option value="todos">Todos</option>
            <option value="riesgo">En riesgo</option>
            <option value="al_dia">Al día</option>
          </select>
          <button onClick={nuevo} className="btn-primary ml-auto gap-1.5">
            <Plus size={16} /> Nuevo cliente
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Cliente</th>
                <th className="table-head-cell">Teléfono</th>
                <th className="table-head-cell">Historial</th>
                <th className="table-head-cell text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((c) => {
                const h = historialDe(c.id);
                return (
                  <tr key={c.id} className="table-row">
                    <td className="table-cell">
                      <button onClick={() => setDetalleId(c.id)} className="flex items-center gap-3 text-left">
                        <span className="row-avatar"><User size={16} /></span>
                        <span>
                          <span className="block font-medium text-slate-900 transition-colors hover:text-primary dark:text-slate-100">
                            {c.nombres} {c.apellidos}
                          </span>
                          <span className="block text-xs text-slate-400 dark:text-slate-500">
                            {c.documentoTipo} {c.documentoNumero ?? "—"}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="table-cell text-slate-600 dark:text-slate-300">{c.telefono ?? "—"}</td>
                    <td className="table-cell">
                      {h.total === 0 ? (
                        <span className="badge badge-neutral">Primera vez</span>
                      ) : (
                        <span className="flex flex-wrap items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          {h.atendidas} {h.atendidas === 1 ? "visita" : "visitas"} · última {formatearFecha(h.ultima!)}
                          {enRiesgo(c.id) && <span className="badge badge-warning">En riesgo</span>}
                        </span>
                      )}
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => editar(c)} title="Editar" className="row-icon-btn">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => eliminar(c)} title="Eliminar" className="row-icon-btn row-icon-btn-danger">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="table-empty">
                      <Users size={28} className="text-slate-300 dark:text-slate-600" />
                      Sin clientes todavía.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
      </div>

      {/* ====== Panel de historial (solo lectura) — abre al click en el nombre ====== */}
      <SlideOver abierto={Boolean(clienteDetalle)} onClose={() => setDetalleId(null)} titulo="Historial del cliente">
        {clienteDetalle && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                  <User size={18} />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{clienteDetalle.nombres} {clienteDetalle.apellidos}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {clienteDetalle.documentoTipo} {clienteDetalle.documentoNumero ?? "—"}
                  </p>
                </div>
              </div>
              <button onClick={() => editar(clienteDetalle)} className="btn-outline shrink-0 px-3 py-1.5 text-xs">Editar</button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <p className="text-slate-500 dark:text-slate-400">Teléfono: <span className="text-slate-700 dark:text-slate-200">{clienteDetalle.telefono ?? "—"}</span></p>
              <p className="text-slate-500 dark:text-slate-400">Email: <span className="text-slate-700 dark:text-slate-200">{clienteDetalle.email ?? "—"}</span></p>
            </div>
            {clienteDetalle.notas && (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">{clienteDetalle.notas}</p>
            )}

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Citas ({citasDelDetalle.length})
              </p>
              {citasDelDetalle.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">Primera vez — todavía no tiene citas registradas.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {citasDelDetalle.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
                      <div>
                        <p className="text-slate-700 dark:text-slate-200">{formatearFecha(c.fechaHora)}</p>
                        {c.motivo && <p className="text-xs text-slate-400 dark:text-slate-500">{c.motivo}</p>}
                      </div>
                      <span className={`badge ${ESTADO_BADGE[c.estado] ?? "badge-neutral"}`}>{ESTADO_LABEL[c.estado] ?? c.estado}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {recetasDelDetalle.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Recetas ({recetasDelDetalle.length})
                </p>
                <ul className="mt-2 space-y-1.5">
                  {recetasDelDetalle.map((r) => (
                    <li key={r.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 dark:text-slate-200">{formatearFecha(r.fecha)}</span>
                      <span className="text-slate-400 dark:text-slate-500">{r.tipo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {ventasDelDetalle.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Compras ({ventasDelDetalle.length})
                </p>
                <ul className="mt-2 space-y-1.5">
                  {ventasDelDetalle.map((v) => (
                    <li key={v.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 dark:text-slate-200">{formatearFecha(v.fecha)}</span>
                      <span className="text-slate-400 dark:text-slate-500">S/ {v.total.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </SlideOver>

      <SlideOver abierto={abierto} onClose={cerrar} titulo={editandoId ? "Editar cliente" : "Nuevo cliente"}>
        <Stepper paso={paso} total={2} />
        <form onSubmit={onSubmit} className="flex h-full flex-col">
          {paso === 1 ? (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Datos básicos</p>
              <input placeholder="Nombres" required value={form.nombres ?? ""} onChange={(e) => setForm({ ...form, nombres: e.target.value })} className="input w-full text-sm" />
              <input placeholder="Apellidos" value={form.apellidos ?? ""} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} className="input w-full text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <select value={form.documentoTipo ?? "DNI"} onChange={(e) => setForm({ ...form, documentoTipo: e.target.value })} className="select text-sm">
                  <option value="DNI">DNI</option>
                  <option value="CE">CE</option>
                  <option value="RUC">RUC</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>
                <input placeholder="N.º de documento" value={form.documentoNumero ?? ""} onChange={(e) => setForm({ ...form, documentoNumero: e.target.value })} className="input text-sm" />
              </div>
              <button type="button" disabled={!form.nombres} onClick={() => setPaso(2)} className="btn-primary mt-2 w-full">
                Siguiente
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Contacto y notas</p>
              <input placeholder="Teléfono" value={form.telefono ?? ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="input w-full text-sm" />
              <input placeholder="Email" type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input w-full text-sm" />
              <input placeholder="Fecha de nacimiento" type="date" value={form.fechaNacimiento ?? ""} onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })} className="input w-full text-sm" />
              <input placeholder="Dirección" value={form.direccion ?? ""} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="input w-full text-sm" />
              <textarea placeholder="Notas" value={form.notas ?? ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} className="input w-full text-sm" rows={3} />
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => setPaso(1)} className="btn-outline flex-1">Atrás</button>
                <button type="submit" disabled={guardando} className="btn-primary flex-1">
                  {editandoId ? "Guardar cambios" : "Agregar cliente"}
                </button>
              </div>
            </div>
          )}
        </form>
      </SlideOver>
    </main>
  );
}
