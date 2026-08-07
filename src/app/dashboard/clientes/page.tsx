"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, User, Search, Eye, Trash2, Users, RotateCcw, XCircle, ArrowLeft } from "lucide-react";
import { Skeleton } from "boneyard-js/react";
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
  const { clientes, citas, restaurarCliente, purgarCliente, ready } = useData();
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

  const [confirmarPurgar, setConfirmarPurgar] = useState<Cliente | null>(null);

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
          {/* Mobile: 2 columnas fijas por fila (buscador + "al día" / papelera + nuevo
              cliente); sm:contents devuelve el layout de flex-wrap original en desktop. */}
          <div className="grid w-full grid-cols-2 gap-2 sm:contents">
            <div className={`relative sm:max-w-xs sm:flex-1 ${verPapelera ? "col-span-2" : ""}`}>
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Buscar por nombre o documento…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                className="input h-11 w-full pl-9 sm:h-auto"
              />
            </div>
            {!verPapelera && (
              <select value={filtroRiesgo} onChange={(e) => setFiltroRiesgo(e.target.value as typeof filtroRiesgo)} className="select h-11 w-full sm:h-auto sm:w-auto">
                <option value="todos">Todos</option>
                <option value="riesgo">En riesgo</option>
                <option value="al_dia">Al día</option>
              </select>
            )}
          </div>
          {/* Papelera/Nuevo cliente en una sola línea, mitad y mitad en mobile —
              whitespace-nowrap + padding más chico para que el texto no se parta
              en 2 líneas dentro de esa mitad; en desktop (sm:contents) vuelven al
              flex-wrap original con su padding normal. */}
          <div className="grid w-full grid-cols-2 gap-2 sm:contents">
            <button
              onClick={() => setVerPapelera((v) => !v)}
              className={`h-11 w-full justify-center gap-1.5 whitespace-nowrap px-2 sm:h-auto sm:w-auto sm:px-4 ${verPapelera ? "btn-primary col-span-2" : "btn-outline"}`}
            >
              {verPapelera ? <ArrowLeft size={16} /> : <Trash2 size={16} />} {verPapelera ? "Volver a clientes" : "Papelera"}
              {!verPapelera && clientesPapelera.length > 0 && (
                <span className="badge badge-neutral">{clientesPapelera.length}</span>
              )}
            </button>
            {!verPapelera && (
              <button onClick={formEstado.nuevo} className="btn-primary h-11 w-full justify-center gap-1.5 whitespace-nowrap px-2 sm:ml-auto sm:h-auto sm:w-auto sm:px-4">
                <Plus size={16} /> Nuevo cliente
              </button>
            )}
          </div>
        </div>

        <Skeleton name="clientes-tabla" loading={!ready}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Cliente</th>
                <th className="table-head-cell hidden md:table-cell">Teléfono</th>
                {/* lg (1024px), no md (768px): un teléfono grande en horizontal puede
                    superar los 768px — con lg queda oculta en cualquier orientación
                    de celular, solo se ve en pantallas de verdad tipo laptop/desktop. */}
                <th className="table-head-cell hidden lg:table-cell">{verPapelera ? "Eliminado" : "Historial"}</th>
                <th className="table-head-cell">Acciones</th>
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
                    <td className="table-body-cell">
                      <span className="flex items-center gap-3">
                        <span className="row-avatar"><User size={16} /></span>
                        <span>
                          <span className={`block font-medium text-slate-900 dark:text-slate-100 ${verPapelera ? "" : "transition-colors hover:text-primary"}`}>
                            {c.nombres} {c.apellidos}
                          </span>
                          <span className="block text-xs text-slate-500 dark:text-slate-500">
                            {c.documentoTipo} {c.documentoNumero ?? "—"}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="table-body-cell hidden md:table-cell text-slate-600 dark:text-slate-300">
                      {c.telefono ? (
                        <span className="flex items-center gap-2">
                          {c.telefono}
                          <BotonWhatsApp telefono={c.telefono} />
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="table-body-cell hidden lg:table-cell">
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
                    <td className="table-body-cell text-right">
                      {/* Papelera: 2 íconos, alineados al borde igual que el encabezado
                          "Acciones" (text-right). Ver más: alineado a la IZQUIERDA de la
                          celda (pedido explícito), con texto — no solo el ícono. */}
                      <div className={verPapelera ? "flex justify-end gap-1" : "flex justify-start"}>
                        {verPapelera ? (
                          <>
                            <button onClick={() => restaurar(c)} title="Restaurar" aria-label={`Restaurar a ${c.nombres} ${c.apellidos}`} className="row-icon-btn">
                              <RotateCcw size={15} />
                            </button>
                            <button onClick={() => setConfirmarPurgar(c)} title="Eliminar definitivamente" aria-label={`Eliminar definitivamente a ${c.nombres} ${c.apellidos}`} className="row-icon-btn row-icon-btn-danger">
                              <XCircle size={15} />
                            </button>
                          </>
                        ) : (
                          /* Editar y Eliminar ya NO viven en esta fila — se mueven
                             dentro de la ficha del cliente (clientes/[id]/page.tsx).
                             Acá solo queda "Ver más" (la fila también navega al hacer
                             click completo, este botón es el punto de entrada
                             explícito/accesible). */
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/clientes/${c.id}`); }}
                            aria-label={`Ver más de ${c.nombres} ${c.apellidos}`}
                            className="flex h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <Eye size={15} /> Ver más
                          </button>
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
        </Skeleton>
        <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
      </div>

      <ClienteFormSlideOver estado={formEstado} />

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
