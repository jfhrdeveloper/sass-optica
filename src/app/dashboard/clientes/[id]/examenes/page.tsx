"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { useData, type ExamenOptometrico } from "@/components/providers/DataProvider";
import { SlideOver } from "@/components/ui/SlideOver";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { formatearFecha } from "@/lib/formato/date";

const EXAMEN_VACIO: Partial<ExamenOptometrico> = {};

/* Pestaña "Exámenes optométricos" de la ficha de cliente — lista + el
   formulario de alta/edición (antes vivía suelto al fondo del page.tsx
   único, ahora viaja junto con la pestaña a la que pertenece). Solo
   editar, no eliminar — `deleteExamenOptometrico` no existe en
   DataProvider (mismo criterio clínico de "una vez creado, queda" que
   tenían las recetas hasta que se les agregó editar/eliminar; acá el
   usuario solo pidió editar). */
export default function ClienteExamenesPage() {
  const params = useParams<{ id: string }>();
  const { clientes, examenesOptometricos, addExamenOptometrico, updateExamenOptometrico } = useData();
  const cliente = clientes.find((c) => c.id === params.id) ?? null;

  const examenesDelCliente = cliente
    ? [...examenesOptometricos].filter((e) => e.clienteId === cliente.id).sort((a, b) => b.fecha.localeCompare(a.fecha))
    : [];
  const { pagina: paginaExamenes, setPagina: setPaginaExamenes, totalPaginas: totalPaginasExamenes, visibles: examenesVisibles } =
    usePaginado(examenesDelCliente);

  const [abiertoExamen, setAbiertoExamen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [examenForm, setExamenForm] = useState<Partial<ExamenOptometrico>>(EXAMEN_VACIO);
  const [guardandoExamen, setGuardandoExamen] = useState(false);

  function nuevo() {
    setEditandoId(null);
    setExamenForm(EXAMEN_VACIO);
    setAbiertoExamen(true);
  }
  function editar(ex: ExamenOptometrico) {
    setEditandoId(ex.id);
    setExamenForm(ex);
    setAbiertoExamen(true);
  }
  function cerrar() {
    setAbiertoExamen(false);
    setEditandoId(null);
    setExamenForm(EXAMEN_VACIO);
  }
  async function onSubmitExamen(e: React.FormEvent) {
    e.preventDefault();
    if (!cliente) return;
    setGuardandoExamen(true);
    if (editandoId) {
      await updateExamenOptometrico(editandoId, examenForm);
    } else {
      await addExamenOptometrico({ ...examenForm, clienteId: cliente.id });
    }
    setGuardandoExamen(false);
    cerrar();
  }

  if (!cliente) return null;

  return (
    <div>
      {/* Mobile: título arriba, botón debajo a todo el ancho — antes quedaba
          al costado del título, apretado contra "optométricos". Desktop
          (`sm:`) sin cambios, sigue en la misma fila. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Exámenes optométricos ({examenesDelCliente.length})</h2>
        <button onClick={nuevo} className="btn-outline h-11 w-full justify-center gap-1.5 sm:h-auto sm:w-auto">
          <Plus size={14} /> Nuevo examen
        </button>
      </div>
      {examenesDelCliente.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">Todavía no tiene exámenes registrados.</p>
      ) : (
        <>
          <ul className="mt-2 space-y-3">
            {examenesVisibles.map((ex) => (
              <li key={ex.id} className="rounded-lg border border-slate-100 p-3 text-sm dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{formatearFecha(ex.fecha)}</span>
                  <button onClick={() => editar(ex)} title="Editar" aria-label="Editar examen" className="row-icon-btn shrink-0">
                    <Pencil size={15} />
                  </button>
                </div>

                {/* Desktop: tabla comparativa OD/OI. Mobile: 2 tarjetas apiladas
                    (evita el scroll horizontal de una tabla de 6 columnas en pantallas angostas). */}
                <div className="mt-2 hidden overflow-x-auto sm:block">
                  <table className="w-full min-w-[360px] text-xs">
                    <thead>
                      <tr className="text-slate-500 dark:text-slate-500">
                        <th className="pb-1 pr-3 text-left font-normal"></th>
                        <th className="pb-1 pr-3 text-left font-normal">AV s/c</th>
                        <th className="pb-1 pr-3 text-left font-normal">AV c/c</th>
                        <th className="pb-1 pr-3 text-left font-normal">K1</th>
                        <th className="pb-1 pr-3 text-left font-normal">K2</th>
                        <th className="pb-1 text-left font-normal">Eje K</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700 dark:text-slate-200">
                      <tr>
                        <td className="py-0.5 pr-3 font-medium text-slate-500 dark:text-slate-400">OD</td>
                        <td className="py-0.5 pr-3">{ex.odAvSc ?? "—"}</td>
                        <td className="py-0.5 pr-3">{ex.odAvCc ?? "—"}</td>
                        <td className="py-0.5 pr-3">{ex.odK1 ?? "—"}</td>
                        <td className="py-0.5 pr-3">{ex.odK2 ?? "—"}</td>
                        <td className="py-0.5">{ex.odEjeK != null ? `${ex.odEjeK}°` : "—"}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 pr-3 font-medium text-slate-500 dark:text-slate-400">OI</td>
                        <td className="py-0.5 pr-3">{ex.oiAvSc ?? "—"}</td>
                        <td className="py-0.5 pr-3">{ex.oiAvCc ?? "—"}</td>
                        <td className="py-0.5 pr-3">{ex.oiK1 ?? "—"}</td>
                        <td className="py-0.5 pr-3">{ex.oiK2 ?? "—"}</td>
                        <td className="py-0.5">{ex.oiEjeK != null ? `${ex.oiEjeK}°` : "—"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
                  {([
                    { ojo: "OD", avSc: ex.odAvSc, avCc: ex.odAvCc, k1: ex.odK1, k2: ex.odK2, ejeK: ex.odEjeK },
                    { ojo: "OI", avSc: ex.oiAvSc, avCc: ex.oiAvCc, k1: ex.oiK1, k2: ex.oiK2, ejeK: ex.oiEjeK },
                  ] as const).map((o) => (
                    <div key={o.ojo} className="rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-900">
                      <p className="mb-1 font-medium text-slate-500 dark:text-slate-400">{o.ojo}</p>
                      <p className="text-slate-700 dark:text-slate-200">AV s/c: {o.avSc ?? "—"}</p>
                      <p className="text-slate-700 dark:text-slate-200">AV c/c: {o.avCc ?? "—"}</p>
                      <p className="text-slate-700 dark:text-slate-200">K1/K2: {o.k1 ?? "—"} / {o.k2 ?? "—"}</p>
                      <p className="text-slate-700 dark:text-slate-200">Eje K: {o.ejeK != null ? `${o.ejeK}°` : "—"}</p>
                    </div>
                  ))}
                </div>

                {ex.anamnesis && (
                  <p className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300"><strong>Anamnesis:</strong> {ex.anamnesis}</p>
                )}
                {ex.notas && (
                  <p className="mt-1.5 rounded bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">{ex.notas}</p>
                )}
              </li>
            ))}
          </ul>
          <Pagination pagina={paginaExamenes} totalPaginas={totalPaginasExamenes} onCambiar={setPaginaExamenes} />
        </>
      )}

      <SlideOver abierto={abiertoExamen} onClose={cerrar} titulo={editandoId ? "Editar examen optométrico" : "Nuevo examen optométrico"}>
        <form onSubmit={onSubmitExamen} className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">Agudeza visual</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">OD sin corrección</label>
              <input placeholder="20/40" value={examenForm.odAvSc ?? ""} onChange={(e) => setExamenForm({ ...examenForm, odAvSc: e.target.value || undefined })} className="input mt-1 h-11 w-full sm:h-auto" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">OD con corrección</label>
              <input placeholder="20/20" value={examenForm.odAvCc ?? ""} onChange={(e) => setExamenForm({ ...examenForm, odAvCc: e.target.value || undefined })} className="input mt-1 h-11 w-full sm:h-auto" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">OI sin corrección</label>
              <input placeholder="20/50" value={examenForm.oiAvSc ?? ""} onChange={(e) => setExamenForm({ ...examenForm, oiAvSc: e.target.value || undefined })} className="input mt-1 h-11 w-full sm:h-auto" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">OI con corrección</label>
              <input placeholder="20/20" value={examenForm.oiAvCc ?? ""} onChange={(e) => setExamenForm({ ...examenForm, oiAvCc: e.target.value || undefined })} className="input mt-1 h-11 w-full sm:h-auto" />
            </div>
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">Queratometría</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">OD K1</label>
              <input type="number" step="0.01" value={examenForm.odK1 ?? ""} onChange={(e) => setExamenForm({ ...examenForm, odK1: e.target.value ? Number(e.target.value) : undefined })} className="input mt-1 h-11 w-full sm:h-auto" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">OD K2</label>
              <input type="number" step="0.01" value={examenForm.odK2 ?? ""} onChange={(e) => setExamenForm({ ...examenForm, odK2: e.target.value ? Number(e.target.value) : undefined })} className="input mt-1 h-11 w-full sm:h-auto" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">OD eje</label>
              <input type="number" min={0} max={180} value={examenForm.odEjeK ?? ""} onChange={(e) => setExamenForm({ ...examenForm, odEjeK: e.target.value ? Number(e.target.value) : undefined })} className="input mt-1 h-11 w-full sm:h-auto" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">OI K1</label>
              <input type="number" step="0.01" value={examenForm.oiK1 ?? ""} onChange={(e) => setExamenForm({ ...examenForm, oiK1: e.target.value ? Number(e.target.value) : undefined })} className="input mt-1 h-11 w-full sm:h-auto" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">OI K2</label>
              <input type="number" step="0.01" value={examenForm.oiK2 ?? ""} onChange={(e) => setExamenForm({ ...examenForm, oiK2: e.target.value ? Number(e.target.value) : undefined })} className="input mt-1 h-11 w-full sm:h-auto" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">OI eje</label>
              <input type="number" min={0} max={180} value={examenForm.oiEjeK ?? ""} onChange={(e) => setExamenForm({ ...examenForm, oiEjeK: e.target.value ? Number(e.target.value) : undefined })} className="input mt-1 h-11 w-full sm:h-auto" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Anamnesis</label>
            <textarea rows={3} value={examenForm.anamnesis ?? ""} onChange={(e) => setExamenForm({ ...examenForm, anamnesis: e.target.value || undefined })} className="input mt-1 w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Notas (opcional)</label>
            <textarea rows={2} value={examenForm.notas ?? ""} onChange={(e) => setExamenForm({ ...examenForm, notas: e.target.value || undefined })} className="input mt-1 w-full" />
          </div>
          <button type="submit" disabled={guardandoExamen} className="btn-primary h-11 w-full sm:h-auto">
            {guardandoExamen ? "Guardando…" : editandoId ? "Guardar cambios" : "Guardar examen"}
          </button>
        </form>
      </SlideOver>
    </div>
  );
}
