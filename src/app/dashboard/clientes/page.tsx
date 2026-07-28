"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, User, Search, Pencil, Trash2, Users, RotateCcw, XCircle } from "lucide-react";
import { useData, type Cliente } from "@/components/providers/DataProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ClienteFormSlideOver } from "@/components/clientes/ClienteFormSlideOver";
import { BotonWhatsApp } from "@/components/clientes/BotonWhatsApp";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { useClienteForm } from "@/lib/hooks/useClienteForm";
import { coincideBusqueda } from "@/lib/formato/texto";
import { formatearFecha } from "@/lib/formato/date";

const DIAS_RIESGO = 180;

export default function ClientesPage() {
  const { clientes, citas, deleteCliente, restaurarCliente, purgarCliente } = useData();
  const toast = useToast();
  const router = useRouter();
  const formEstado = useClienteForm();
  const [busqueda, setBusqueda] = useState("");
  const [filtroRiesgo, setFiltroRiesgo] = useState<"todos" | "riesgo" | "al_dia">("todos");
  const [verPapelera, setVerPapelera] = useState(false);
  /* Capturado una sola vez (lazy initializer) en vez de Date.now() directo
     en el render — el render debe ser puro/idempotente (regla del proyecto,
     react-hooks/purity). Suficiente para "en riesgo": no necesita ser
     al-segundo exacto dentro de una misma sesión. */
  const [ahora] = useState(() => Date.now());

  /* Historial por cliente (idea de UX pedida por el usuario: "no se nota si
     ha venido, si es su primera vez, etc."): se deriva de `citas` sin campo
     nuevo en la DB — cuántas citas tiene en total, cuántas terminó atendido
     de verdad, y cuál fue la más reciente. Sin useMemo: recorre `citas` una
     vez por render, imperceptible para el tamaño típico de esta tabla. */
  const historialPorCliente = new Map<string, { total: number; atendidas: number; ultima: string | null }>();
  for (const c of citas) {
    const actual = historialPorCliente.get(c.clienteId) ?? { total: 0, atendidas: 0, ultima: null };
    actual.total += 1;
    if (c.estado === "atendida") actual.atendidas += 1;
    if (!actual.ultima || c.fechaHora > actual.ultima) actual.ultima = c.fechaHora;
    historialPorCliente.set(c.clienteId, actual);
  }
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

  const clientesPapelera = clientes.filter((c) => c.eliminadoEn);
  const filtrados = clientes
    .filter((c) => Boolean(c.eliminadoEn) === verPapelera)
    .filter((c) => coincideBusqueda(`${c.nombres} ${c.apellidos} ${c.documentoNumero ?? ""}`, busqueda))
    .filter((c) => {
      if (verPapelera || filtroRiesgo === "todos") return true;
      const riesgo = enRiesgo(c.id);
      return filtroRiesgo === "riesgo" ? riesgo : !riesgo;
    });
  const { pagina, setPagina, totalPaginas, visibles } = usePaginado(filtrados);

  const [confirmarEliminar, setConfirmarEliminar] = useState<Cliente | null>(null);
  const [confirmarPurgar, setConfirmarPurgar] = useState<Cliente | null>(null);

  async function confirmarEliminarAccion() {
    const c = confirmarEliminar;
    if (!c) return;
    setConfirmarEliminar(null);
    await deleteCliente(c.id);
    toast(`${c.nombres} eliminado. Puedes recuperarlo desde la papelera.`, "info");
  }

  async function restaurar(c: Cliente) {
    await restaurarCliente(c.id);
    toast(`${c.nombres} restaurado.`);
  }

  async function confirmarPurgarAccion() {
    const c = confirmarPurgar;
    if (!c) return;
    setConfirmarPurgar(null);
    await purgarCliente(c.id);
    toast(`${c.nombres} eliminado definitivamente.`, "info");
  }

  return (
    <main>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Clientes</h1>

      <div className="table-card mt-4">
        <div className="table-filter-bar">
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Buscar por nombre o documento…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              className="input w-full pl-9 text-sm"
            />
          </div>
          {!verPapelera && (
            <select value={filtroRiesgo} onChange={(e) => setFiltroRiesgo(e.target.value as typeof filtroRiesgo)} className="select text-sm">
              <option value="todos">Todos</option>
              <option value="riesgo">En riesgo</option>
              <option value="al_dia">Al día</option>
            </select>
          )}
          <button
            onClick={() => setVerPapelera((v) => !v)}
            className={verPapelera ? "btn-primary gap-1.5" : "btn-outline gap-1.5"}
          >
            <Trash2 size={16} /> {verPapelera ? "Volver a clientes" : "Papelera"}
            {!verPapelera && clientesPapelera.length > 0 && (
              <span className="badge badge-neutral">{clientesPapelera.length}</span>
            )}
          </button>
          {!verPapelera && (
            <button onClick={formEstado.nuevo} className="btn-primary ml-auto gap-1.5">
              <Plus size={16} /> Nuevo cliente
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Cliente</th>
                <th className="table-head-cell">Teléfono</th>
                <th className="table-head-cell">{verPapelera ? "Eliminado" : "Historial"}</th>
                <th className="table-head-cell text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((c) => {
                const h = historialDe(c.id);
                return (
                  <tr
                    key={c.id}
                    onClick={verPapelera ? undefined : () => router.push(`/dashboard/clientes/${c.id}`)}
                    className={verPapelera ? "table-row" : "table-row cursor-pointer"}
                  >
                    <td className="table-cell">
                      <span className="flex items-center gap-3">
                        <span className="row-avatar"><User size={16} /></span>
                        <span>
                          <span className={`block font-medium text-slate-900 dark:text-slate-100 ${verPapelera ? "" : "transition-colors hover:text-primary"}`}>
                            {c.nombres} {c.apellidos}
                          </span>
                          <span className="block text-xs text-slate-400 dark:text-slate-500">
                            {c.documentoTipo} {c.documentoNumero ?? "—"}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="table-cell text-slate-600 dark:text-slate-300">
                      {c.telefono ? (
                        <span className="flex items-center gap-2">
                          {c.telefono}
                          <BotonWhatsApp telefono={c.telefono} />
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="table-cell">
                      {verPapelera ? (
                        <span className="text-slate-500 dark:text-slate-400">
                          {formatearFecha(c.eliminadoEn!)} · se purga en {Math.max(0, 30 - Math.ceil((ahora - new Date(c.eliminadoEn!).getTime()) / 86400000))} días
                        </span>
                      ) : h.total === 0 ? (
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
                        {verPapelera ? (
                          <>
                            <button onClick={() => restaurar(c)} title="Restaurar" className="row-icon-btn">
                              <RotateCcw size={15} />
                            </button>
                            <button onClick={() => setConfirmarPurgar(c)} title="Eliminar definitivamente" className="row-icon-btn row-icon-btn-danger">
                              <XCircle size={15} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); formEstado.editar(c); }} title="Editar" className="row-icon-btn">
                              <Pencil size={15} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setConfirmarEliminar(c); }} title="Eliminar" className="row-icon-btn row-icon-btn-danger">
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
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
                      {verPapelera ? "Papelera vacía." : "Sin clientes todavía."}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
      </div>

      <ClienteFormSlideOver estado={formEstado} />

      <ConfirmDialog
        abierto={Boolean(confirmarEliminar)}
        titulo="¿Eliminar cliente?"
        mensaje={
          confirmarEliminar
            ? `${confirmarEliminar.nombres} ${confirmarEliminar.apellidos} pasará a la papelera: podrás restaurarlo durante 30 días, después se elimina definitivamente (junto con sus citas y recetas).`
            : ""
        }
        confirmarTexto="Eliminar"
        onConfirmar={confirmarEliminarAccion}
        onCancelar={() => setConfirmarEliminar(null)}
      />
      <ConfirmDialog
        abierto={Boolean(confirmarPurgar)}
        titulo="¿Eliminar definitivamente?"
        mensaje={
          confirmarPurgar
            ? `${confirmarPurgar.nombres} ${confirmarPurgar.apellidos} ya no se podrá recuperar. A diferencia de "Eliminar", esto no se puede deshacer.`
            : ""
        }
        confirmarTexto="Eliminar definitivamente"
        onConfirmar={confirmarPurgarAccion}
        onCancelar={() => setConfirmarPurgar(null)}
      />
    </main>
  );
}
