"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useData, type Receta } from "@/components/providers/DataProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { SlideOver } from "@/components/ui/SlideOver";
import { DatePicker } from "@/components/calendario/DatePicker";
import { formatearFecha } from "@/lib/formato/date";

const RECETA_VACIA: Partial<Receta> = { tipo: "lejos" };
const TIPOS_RECETA = [
  { valor: "lejos", label: "Lejos" },
  { valor: "cerca", label: "Cerca" },
  { valor: "bifocal", label: "Bifocal" },
];

/* Grado óptico con signo explícito (+1.25 / -0.50) — mismo criterio que
   clientes/[id]/page.tsx original: sin signo, "1.25" se lee ambiguo. */
function fmtDiop(n?: number): string {
  if (n === undefined || n === null) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}`;
}

/* Pestaña "Recetas" de la ficha de cliente — antes solo se podía crear una
   receta desde un clic puntual en una cita (Lista de Citas), sin forma de
   editarla ni eliminarla, y ninguna forma de registrar una suelta (sin
   cita) desde acá. Ahora tiene su propio alta/edición/eliminación, igual
   que las otras 3 pestañas — pedido explícito del usuario. */
export default function ClienteRecetasPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const { clientes, recetas, addReceta, updateReceta, deleteReceta } = useData();
  const cliente = clientes.find((c) => c.id === params.id) ?? null;

  const recetasDelCliente = cliente
    ? [...recetas].filter((r) => r.clienteId === cliente.id).sort((a, b) => b.fecha.localeCompare(a.fecha))
    : [];

  const [abierto, setAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Receta>>(RECETA_VACIA);
  const [guardando, setGuardando] = useState(false);

  function nueva() {
    setEditandoId(null);
    setForm({ ...RECETA_VACIA, fecha: new Date().toISOString().slice(0, 10) });
    setAbierto(true);
  }
  function editar(r: Receta) {
    setEditandoId(r.id);
    setForm(r);
    setAbierto(true);
  }
  function cerrar() {
    setAbierto(false);
    setEditandoId(null);
    setForm(RECETA_VACIA);
  }
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cliente || !form.fecha) return;
    setGuardando(true);
    if (editandoId) {
      await updateReceta(editandoId, form);
      toast("Cambios guardados.");
    } else {
      await addReceta({ ...form, clienteId: cliente.id });
      toast("Receta agregada.");
    }
    setGuardando(false);
    cerrar();
  }
  async function eliminar(r: Receta) {
    await deleteReceta(r.id);
    /* Deshacer = volver a crear la receta (deleteReceta no es soft-delete)
       — mismo patrón que eliminar() en citas/page.tsx: recetaToRow ignora
       `id`, así que pasar `r` tal cual es seguro. */
    toast("Receta eliminada.", "info", { label: "Deshacer", onClick: () => { void addReceta(r); } });
  }

  if (!cliente) return null;

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recetas ({recetasDelCliente.length})</h2>
        <button onClick={nueva} className="btn-outline h-11 w-full justify-center gap-1.5 sm:h-auto sm:w-auto">
          <Plus size={14} /> Nueva receta
        </button>
      </div>
      {recetasDelCliente.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">Todavía no tiene recetas registradas.</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {recetasDelCliente.map((r) => (
            <li key={r.id} className="rounded-lg border border-slate-100 p-3 text-sm dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{formatearFecha(r.fecha)}</span>
                  <span className="text-slate-500 dark:text-slate-500">{TIPOS_RECETA.find((t) => t.valor === r.tipo)?.label ?? r.tipo}</span>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => editar(r)} title="Editar" aria-label="Editar receta" className="row-icon-btn">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => eliminar(r)} title="Eliminar" aria-label="Eliminar receta" className="row-icon-btn row-icon-btn-danger">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[320px] text-xs">
                  <thead>
                    <tr className="text-slate-500 dark:text-slate-500">
                      <th className="pb-1 pr-3 text-left font-normal"></th>
                      <th className="pb-1 pr-3 text-left font-normal">Esfera</th>
                      <th className="pb-1 pr-3 text-left font-normal">Cilindro</th>
                      <th className="pb-1 pr-3 text-left font-normal">Eje</th>
                      <th className="pb-1 text-left font-normal">Adición</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 dark:text-slate-200">
                    <tr>
                      <td className="py-0.5 pr-3 font-medium text-slate-500 dark:text-slate-400">OD</td>
                      <td className="py-0.5 pr-3">{fmtDiop(r.odEsfera)}</td>
                      <td className="py-0.5 pr-3">{fmtDiop(r.odCilindro)}</td>
                      <td className="py-0.5 pr-3">{r.odEje != null ? `${r.odEje}°` : "—"}</td>
                      <td className="py-0.5">{fmtDiop(r.odAdicion)}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 pr-3 font-medium text-slate-500 dark:text-slate-400">OI</td>
                      <td className="py-0.5 pr-3">{fmtDiop(r.oiEsfera)}</td>
                      <td className="py-0.5 pr-3">{fmtDiop(r.oiCilindro)}</td>
                      <td className="py-0.5 pr-3">{r.oiEje != null ? `${r.oiEje}°` : "—"}</td>
                      <td className="py-0.5">{fmtDiop(r.oiAdicion)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {r.dip != null && <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">DIP: {r.dip} mm</p>}
              {r.notas && (
                <p className="mt-1.5 rounded bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">{r.notas}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <SlideOver abierto={abierto} onClose={cerrar} titulo={editandoId ? "Editar receta" : "Nueva receta"}>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="form-label">Fecha <span className="text-red-500">*</span></label>
            <DatePicker etiqueta="Fecha de la receta" placeholder="Elegir fecha" valor={form.fecha ?? ""} onChange={(v) => setForm({ ...form, fecha: v })} />
          </div>
          <div>
            <label className="form-label">Tipo</label>
            <select value={form.tipo ?? "lejos"} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="select h-11 w-full sm:h-auto">
              {TIPOS_RECETA.map((t) => <option key={t.valor} value={t.valor}>{t.label}</option>)}
            </select>
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">OD (ojo derecho)</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="form-label">Esfera</label>
              <input type="number" step="0.25" value={form.odEsfera ?? ""} onChange={(e) => setForm({ ...form, odEsfera: e.target.value ? Number(e.target.value) : undefined })} className="input h-11 w-full sm:h-auto" />
            </div>
            <div>
              <label className="form-label">Cilindro</label>
              <input type="number" step="0.25" value={form.odCilindro ?? ""} onChange={(e) => setForm({ ...form, odCilindro: e.target.value ? Number(e.target.value) : undefined })} className="input h-11 w-full sm:h-auto" />
            </div>
            <div>
              <label className="form-label">Eje</label>
              <input type="number" min={0} max={180} value={form.odEje ?? ""} onChange={(e) => setForm({ ...form, odEje: e.target.value ? Number(e.target.value) : undefined })} className="input h-11 w-full sm:h-auto" />
            </div>
            <div>
              <label className="form-label">Adición</label>
              <input type="number" step="0.25" value={form.odAdicion ?? ""} onChange={(e) => setForm({ ...form, odAdicion: e.target.value ? Number(e.target.value) : undefined })} className="input h-11 w-full sm:h-auto" />
            </div>
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">OI (ojo izquierdo)</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="form-label">Esfera</label>
              <input type="number" step="0.25" value={form.oiEsfera ?? ""} onChange={(e) => setForm({ ...form, oiEsfera: e.target.value ? Number(e.target.value) : undefined })} className="input h-11 w-full sm:h-auto" />
            </div>
            <div>
              <label className="form-label">Cilindro</label>
              <input type="number" step="0.25" value={form.oiCilindro ?? ""} onChange={(e) => setForm({ ...form, oiCilindro: e.target.value ? Number(e.target.value) : undefined })} className="input h-11 w-full sm:h-auto" />
            </div>
            <div>
              <label className="form-label">Eje</label>
              <input type="number" min={0} max={180} value={form.oiEje ?? ""} onChange={(e) => setForm({ ...form, oiEje: e.target.value ? Number(e.target.value) : undefined })} className="input h-11 w-full sm:h-auto" />
            </div>
            <div>
              <label className="form-label">Adición</label>
              <input type="number" step="0.25" value={form.oiAdicion ?? ""} onChange={(e) => setForm({ ...form, oiAdicion: e.target.value ? Number(e.target.value) : undefined })} className="input h-11 w-full sm:h-auto" />
            </div>
          </div>
          <div>
            <label className="form-label">DIP (mm)</label>
            <input type="number" step="0.5" value={form.dip ?? ""} onChange={(e) => setForm({ ...form, dip: e.target.value ? Number(e.target.value) : undefined })} className="input h-11 w-full sm:h-auto" />
          </div>
          <div>
            <label className="form-label">Notas</label>
            <textarea rows={2} value={form.notas ?? ""} onChange={(e) => setForm({ ...form, notas: e.target.value || undefined })} className="input w-full" />
          </div>
          <button type="submit" disabled={guardando || !form.fecha} className="btn-primary h-11 w-full sm:h-auto">
            {editandoId ? "Guardar cambios" : "Agregar receta"}
          </button>
        </form>
      </SlideOver>
    </div>
  );
}
