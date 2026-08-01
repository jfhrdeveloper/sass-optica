"use client";

import { useState } from "react";
import { Eye, Plus, Settings2, Trash2 } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { SlideOver } from "@/components/ui/SlideOver";
import { nombreRol } from "@/lib/roles";
import { MODULOS_DELEGABLES } from "@/lib/permisos";
import { ROLES_SIMULABLES, type RolSimulable } from "@/lib/simulacion-rol";
import type { PlantillaRol } from "@/components/providers/DataProvider";

const PLANTILLA_VACIA = { nombre: "", rolBase: "trabajador" as RolSimulable, permisos: {} as Record<string, boolean> };

/* Ruta protegida a nivel de proxy (rutasSoloAdministrador) — solo
   administrador llega hasta aquí. Junta las dos piezas de "gestión de
   roles" que antes vivían repartidas: la simulación de UI (antes en
   Ajustes) y el editor de permisos por plantilla (antes checkboxes sueltos
   dentro de cada fila de Empleados) — a pedido del usuario, todo lo que es
   "definir qué ve cada rol" vive en un solo lugar. */
export default function RolesPage() {
  const { empleados, plantillasRol, addPlantillaRol, updatePlantillaRol, deletePlantillaRol } = useData();
  const { rolSimulado, iniciarSimulacion } = useSession();
  const toast = useToast();

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<PlantillaRol | null>(null);
  const [form, setForm] = useState(PLANTILLA_VACIA);
  const [guardando, setGuardando] = useState(false);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  function abrirNueva() {
    setEditando(null);
    setForm(PLANTILLA_VACIA);
    setAbierto(true);
  }
  function abrirEditar(p: PlantillaRol) {
    setEditando(p);
    setForm({ nombre: p.nombre, rolBase: p.rolBase as RolSimulable, permisos: p.permisos });
    setAbierto(true);
  }
  function toggleModulo(clave: string) {
    setForm((f) => ({ ...f, permisos: { ...f.permisos, [clave]: !f.permisos[clave] } }));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    if (editando) {
      await updatePlantillaRol(editando.id, form);
    } else {
      await addPlantillaRol(form);
    }
    setGuardando(false);
    setAbierto(false);
    toast(editando ? "Plantilla actualizada." : "Plantilla creada.");
  }

  async function eliminar(id: string) {
    await deletePlantillaRol(id);
    setConfirmandoId(null);
    toast("Plantilla eliminada. Los empleados que la tenían quedan con el acceso base de su rol.", "info");
  }

  return (
    <main>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Roles</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Previsualizá el dashboard con otro rol y armá plantillas de permisos reutilizables para tus encargados y vendedores.
      </p>

      {/* "Ver como" (simulación de UI, ver src/lib/simulacion-rol.ts). Solo
          el botón de EMPEZAR vive acá — el de SALIR sigue siendo exclusivo
          del banner (VistaSimuladaBanner.tsx), porque esta misma página
          queda bloqueada por el proxy mientras se simula un rol no-admin
          (rutasSoloAdministrador incluye /dashboard/roles), así que no
          podría depender de un botón que vive en una ruta a la que ya no se
          puede volver a entrar mientras la simulación sigue activa. */}
      {!rolSimulado && (
        <div className="card mt-4 space-y-3 p-4">
          <h2 className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
            <Eye size={16} /> Vista previa de roles
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Mirá tu dashboard como lo vería un encargado o un vendedor, antes de delegarles algo.
          </p>
          <div className="flex flex-wrap gap-2">
            {ROLES_SIMULABLES.map((rol) => (
              <button
                key={rol}
                type="button"
                onClick={() => iniciarSimulacion(rol)}
                className="btn-outline gap-1.5 text-sm"
              >
                <Eye size={15} /> Ver como {nombreRol(rol)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
          <Settings2 size={16} /> Plantillas de permisos
        </h2>
        <button onClick={abrirNueva} className="btn-primary gap-1.5 text-sm">
          <Plus size={16} /> Nueva plantilla
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Un preset con nombre propio (&quot;Cajero&quot;, &quot;Recepción&quot;) que marca qué módulos ve — asignalo a varios empleados
        desde <a href="/dashboard/empleados" className="link">Empleados</a> en vez de tildar los mismos permisos uno por uno.
      </p>

      <div className="table-card mt-3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Plantilla</th>
                <th className="table-head-cell">Rol base</th>
                <th className="table-head-cell hidden md:table-cell">Módulos activos</th>
                <th className="table-head-cell">Empleados</th>
                <th className="table-head-cell text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {plantillasRol.map((p) => {
                const modulos = MODULOS_DELEGABLES.filter((m) => p.permisos[m.clave]);
                const nEmpleados = empleados.filter((e) => e.plantillaRolId === p.id).length;
                return (
                  <tr key={p.id} className="table-row">
                    <td className="table-body-cell font-medium text-slate-900 dark:text-slate-100">{p.nombre}</td>
                    <td className="table-body-cell text-slate-600 dark:text-slate-300">{nombreRol(p.rolBase)}</td>
                    <td className="table-body-cell hidden md:table-cell text-slate-500 dark:text-slate-400">
                      {modulos.length > 0 ? modulos.map((m) => m.label).join(", ") : "Ninguno"}
                    </td>
                    <td className="table-body-cell text-slate-600 dark:text-slate-300">{nEmpleados}</td>
                    <td className="table-body-cell text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => abrirEditar(p)} title="Editar" aria-label={`Editar ${p.nombre}`} className="row-icon-btn">
                          <Settings2 size={15} />
                        </button>
                        {confirmandoId === p.id ? (
                          <span className="inline-flex items-center gap-2 whitespace-nowrap">
                            <span className="text-xs text-slate-500 dark:text-slate-400">¿Seguro?</span>
                            <button onClick={() => eliminar(p.id)} className="link-danger">Sí</button>
                            <button onClick={() => setConfirmandoId(null)} className="link-muted">No</button>
                          </span>
                        ) : (
                          <button onClick={() => setConfirmandoId(p.id)} title="Eliminar" aria-label={`Eliminar ${p.nombre}`} className="row-icon-btn row-icon-btn-danger">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {plantillasRol.length === 0 && (
                <tr><td colSpan={5}><div className="table-empty">Sin plantillas todavía.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SlideOver abierto={abierto} onClose={() => setAbierto(false)} titulo={editando ? "Editar plantilla" : "Nueva plantilla"}>
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Nombre</label>
            <input
              required placeholder="Ej. Cajero, Recepción"
              value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="input mt-1 w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Rol base</label>
            <select
              value={form.rolBase}
              onChange={(e) => setForm({ ...form, rolBase: e.target.value as RolSimulable })}
              className="select mt-1 w-full text-sm"
            >
              <option value="trabajador">{nombreRol("trabajador")}</option>
              <option value="encargado">{nombreRol("encargado")}</option>
            </select>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Módulos que ve</p>
            <div className="mt-2 space-y-2">
              {MODULOS_DELEGABLES.map((m) => (
                <label key={m.clave} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={Boolean(form.permisos[m.clave])}
                    onChange={() => toggleModulo(m.clave)}
                    className="checkbox"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
          <button type="submit" disabled={guardando || !form.nombre.trim()} className="btn-primary w-full">
            {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear plantilla"}
          </button>
        </form>
      </SlideOver>
    </main>
  );
}
