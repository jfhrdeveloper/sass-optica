"use client";

import { useState } from "react";
import { CheckCheck, Eye, Plus, Settings2, ShieldCheck, Trash2 } from "lucide-react";
import { Skeleton } from "boneyard-js/react";
import { useData, type RolPersonalizado } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { SlideOver } from "@/components/ui/SlideOver";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { nombreRol } from "@/lib/roles";
import { MODULOS_DELEGABLES, nivelDe, modulosDeRolPrincipal, type NivelPermiso } from "@/lib/permisos";
import { ROLES_SIMULABLES } from "@/lib/simulacion-rol";

const ROL_VACIO = { nombre: "", permisos: {} as Record<string, string> };

/* "Escritura" siempre incluye lectura (ver tiene_permiso_escritura() en
   supabase-schema.sql: "'escritura' implica lectura, no hay forma de dar
   escritura sin lectura") — no es un cuarto nivel "ambos" separado, el
   label solo lo deja explícito para no depender de que quien lo lea sepa
   ese detalle de memoria. */
const NIVELES: { valor: NivelPermiso; label: string }[] = [
  { valor: "ninguno", label: "Ninguno" },
  { valor: "lectura", label: "Lectura" },
  { valor: "escritura", label: "Lectura y escritura" },
];

const ROLES_PRINCIPALES = ["administrador", "encargado", "trabajador"] as const;

function etiquetaNivel(nivel: NivelPermiso): string {
  return nivel === "escritura" ? "lectura y escritura" : "lectura";
}

/* Ruta protegida a nivel de proxy (rutasSoloAdministrador) — solo
   administrador llega hasta aquí. Junta las dos piezas de "gestión de
   roles" que antes vivían repartidas: la simulación de UI (antes en
   Ajustes) y el editor de roles personalizados (antes checkboxes sueltos
   dentro de cada fila de Empleados) — a pedido del usuario, todo lo que es
   "definir qué ve cada rol" vive en un solo lugar. */
export default function RolesPage() {
  const { empleados, rolesPersonalizados, addRolPersonalizado, updateRolPersonalizado, deleteRolPersonalizado, ready } = useData();
  const { rolSimulado, iniciarSimulacion } = useSession();
  const toast = useToast();

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<RolPersonalizado | null>(null);
  const [form, setForm] = useState(ROL_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  function abrirNueva() {
    setEditando(null);
    setForm(ROL_VACIO);
    setAbierto(true);
  }
  function abrirEditar(r: RolPersonalizado) {
    setEditando(r);
    setForm({ nombre: r.nombre, permisos: r.permisos });
    setAbierto(true);
  }
  function cambiarNivel(clave: string, nivel: NivelPermiso) {
    setForm((f) => {
      const permisos = { ...f.permisos };
      if (nivel === "ninguno") delete permisos[clave];
      else permisos[clave] = nivel;
      return { ...f, permisos };
    });
  }
  /* Atajo pensado para el caso que describió el usuario: partir de "todo en
     escritura" (equivalente al piso que ya tiene un encargado sin rol
     personalizado) e ir bajando de nivel solo lo que se quiere restringir,
     en vez de tildar los 9 módulos uno por uno. */
  function marcarTodos(nivel: NivelPermiso) {
    setForm((f) => ({
      ...f,
      permisos: nivel === "ninguno" ? {} : Object.fromEntries(MODULOS_DELEGABLES.map((m) => [m.clave, nivel])),
    }));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    if (editando) {
      await updateRolPersonalizado(editando.id, form);
    } else {
      await addRolPersonalizado(form);
    }
    setGuardando(false);
    setAbierto(false);
    toast(editando ? "Rol actualizado." : "Rol creado.");
  }

  async function eliminar(id: string) {
    await deleteRolPersonalizado(id);
    setConfirmandoId(null);
    toast("Rol eliminado. Los empleados que lo tenían quedan con el acceso base de su rol principal.", "info");
  }

  return (
    <main>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Roles</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Previsualizá el dashboard con otro rol y armá roles personalizados reutilizables para tus encargados y trabajadores.
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
            Mirá tu dashboard como lo vería un encargado o un trabajador, antes de delegarles algo.
          </p>
          <div className="flex flex-wrap gap-2">
            {ROLES_SIMULABLES.map((rol) => (
              <button
                key={rol}
                type="button"
                onClick={() => iniciarSimulacion(rol)}
                className="btn-outline h-11 gap-1.5 text-sm sm:h-auto"
              >
                <Eye size={15} /> Ver como {nombreRol(rol)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Referencia de solo lectura — el acceso de los 3 roles principales es
         fijo (ver puede_gestionar()/sin_rol_personalizado() en el schema),
         nada acá se edita. Sirve para saber de un vistazo a dónde llega cada
         uno ANTES de asignarle un rol personalizado, que reemplaza este piso
         por completo (ver el aviso en el formulario de abajo). */}
      <h2 className="mt-6 flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
        <ShieldCheck size={16} /> Roles principales
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        El acceso de base de cada rol, sin ningún rol personalizado asignado — de referencia, no se edita acá.
      </p>
      <div className="table-card mt-3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Rol</th>
                <th className="table-head-cell hidden md:table-cell">Módulos</th>
              </tr>
            </thead>
            <tbody>
              {ROLES_PRINCIPALES.map((rol) => {
                const modulos = modulosDeRolPrincipal(rol).filter((m) => m.nivel !== "ninguno");
                return (
                  <tr key={rol} className="table-row">
                    <td className="table-body-cell font-medium text-slate-900 dark:text-slate-100">{nombreRol(rol)}</td>
                    <td className="table-body-cell hidden md:table-cell text-slate-500 dark:text-slate-400">
                      {rol === "administrador"
                        ? "Todos los módulos (lectura y escritura)."
                        : modulos.length > 0
                          ? modulos.map((m) => `${m.label} (${etiquetaNivel(m.nivel)})`).join(", ")
                          : "Ninguno."}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
          <Settings2 size={16} /> Roles personalizados
        </h2>
        <button onClick={abrirNueva} className="btn-primary h-11 gap-1.5 text-sm sm:h-auto">
          <Plus size={16} /> Nuevo rol
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Un preset con nombre propio (&quot;Cajero&quot;, &quot;Recepción&quot;) que define, módulo por módulo, si ve
        solo lectura, lectura y escritura, o nada — asignalo a varios empleados desde{" "}
        <a href="/dashboard/empleados" className="link">Empleados</a> en vez de configurar persona por persona.
      </p>

      <div className="table-card mt-3">
        <Skeleton name="roles-tabla" loading={!ready}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Rol personalizado</th>
                <th className="table-head-cell hidden md:table-cell">Módulos</th>
                <th className="table-head-cell">Empleados</th>
                <th className="table-head-cell text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rolesPersonalizados.map((r) => {
                const modulos = MODULOS_DELEGABLES
                  .map((m) => ({ ...m, nivel: nivelDe(r.permisos, m.clave) }))
                  .filter((m) => m.nivel !== "ninguno");
                const empleadosDelRol = empleados.filter((e) => e.rolPersonalizadoId === r.id);
                return (
                  <tr key={r.id} className="table-row">
                    <td className="table-body-cell font-medium text-slate-900 dark:text-slate-100">{r.nombre}</td>
                    <td className="table-body-cell hidden md:table-cell text-slate-500 dark:text-slate-400">
                      {modulos.length > 0
                        ? modulos.map((m) => `${m.label} (${etiquetaNivel(m.nivel)})`).join(", ")
                        : "Ninguno"}
                    </td>
                    <td className="table-body-cell text-slate-600 dark:text-slate-300">
                      {empleadosDelRol.length > 0
                        ? `${empleadosDelRol.slice(0, 3).map((e) => `${e.nombres} ${e.apellidos}`).join(", ")}${
                            empleadosDelRol.length > 3 ? ` y ${empleadosDelRol.length - 3} más` : ""
                          }`
                        : "Nadie"}
                    </td>
                    <td className="table-body-cell text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => abrirEditar(r)} title="Editar" aria-label={`Editar ${r.nombre}`} className="row-icon-btn">
                          <Settings2 size={15} />
                        </button>
                        {confirmandoId === r.id ? (
                          <span className="inline-flex items-center gap-2 whitespace-nowrap">
                            <span className="text-xs text-slate-500 dark:text-slate-400">¿Seguro?</span>
                            <button onClick={() => eliminar(r.id)} className="link-danger">Sí</button>
                            <button onClick={() => setConfirmandoId(null)} className="link-muted">No</button>
                          </span>
                        ) : (
                          <button onClick={() => setConfirmandoId(r.id)} title="Eliminar" aria-label={`Eliminar ${r.nombre}`} className="row-icon-btn row-icon-btn-danger">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rolesPersonalizados.length === 0 && (
                <tr><td colSpan={4}><div className="table-empty">Sin roles personalizados todavía.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
        </Skeleton>
      </div>

      <SlideOver abierto={abierto} onClose={() => setAbierto(false)} titulo={editando ? "Editar rol" : "Nuevo rol"}>
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="form-label">Nombre <span className="text-red-500">*</span></label>
            <input
              required placeholder="Ej. Cajero, Recepción"
              value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="input h-11 w-full sm:h-auto"
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-500"><span className="text-red-500">*</span> Campo obligatorio</p>
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Acceso por módulo</p>
              <button
                type="button"
                onClick={() => marcarTodos("escritura")}
                className="inline-flex items-center gap-1 text-xs font-medium link"
              >
                <CheckCheck size={13} /> Marcar todos con escritura
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
              Un módulo en &quot;Ninguno&quot; queda oculto para quien tenga este rol, aunque por su rol principal
              (Encargado) le tocara gratis — este rol define su acceso por completo, no solo lo suma.
            </p>
            <div className="mt-3 space-y-3">
              {MODULOS_DELEGABLES.map((m) => (
                <div key={m.clave} className="flex flex-col gap-1.5 border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-slate-800">
                  <span className="text-sm text-slate-600 dark:text-slate-300">{m.label}</span>
                  <SegmentedControl
                    aria-label={`Acceso a ${m.label}`}
                    variante="opciones"
                    valor={nivelDe(form.permisos, m.clave)}
                    onChange={(v) => cambiarNivel(m.clave, v as NivelPermiso)}
                    opciones={NIVELES.map((n) => ({ valor: n.valor, label: n.label }))}
                  />
                </div>
              ))}
            </div>
          </div>
          <button type="submit" disabled={guardando || !form.nombre.trim()} className="btn-primary h-11 w-full sm:h-auto">
            {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear rol"}
          </button>
        </form>
      </SlideOver>
    </main>
  );
}
