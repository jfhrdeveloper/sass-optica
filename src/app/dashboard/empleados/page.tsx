"use client";

import { Fragment, useState } from "react";
import { Plus, Trash2, UserRound, Pencil } from "lucide-react";
import { Skeleton } from "boneyard-js/react";
import { useData, type Empleado, type TipoPeriodoPago } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { SlideOver } from "@/components/ui/SlideOver";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { TimePicker } from "@/components/calendario/TimePicker";
import { nombreRol } from "@/lib/roles";

const TIPOS_PERIODO: TipoPeriodoPago[] = ["diario", "semanal", "quincenal", "mensual"];
const TIPO_PERIODO_LABEL: Record<TipoPeriodoPago, string> = {
  diario: "Diario", semanal: "Semanal", quincenal: "Quincenal", mensual: "Mensual",
};

/* Ruta protegida a nivel de proxy y de RLS. El alta/baja NUNCA llama a
   Supabase directo desde aquí — siempre vía /api/empleados/* con
   service_role (ver invariante en docs/architecture.md).

   Qué módulos ve cada rol personalizado ya NO se edita acá — se mudó
   entero a /dashboard/roles (a pedido del usuario: esta página es
   alta/baja/datos de la PERSONA, no la definición de qué ve cada rol
   personalizado). Acá solo queda elegir CUÁL rol personalizado tiene
   asignado cada empleado (updateEmpleado → RLS empleados_admin_update, ya
   exige is_administrador()). Sin rol personalizado asignado, el empleado
   sigue con el acceso base de su rol principal (puede_gestionar() para
   encargado, mínimo para trabajador) — mismo comportamiento que siempre
   tuvo. Cualquier rol personalizado aplica igual a un encargado que a un
   trabajador (sin distinción de "para quién fue pensado"), así que cambiar
   el rol principal de alguien nunca invalida el rol personalizado que ya
   tenía asignado.

   Ascender/degradar entre Encargado ↔ Trabajador SÍ se edita acá (RLS ya lo
   permitía — empleados_admin_update no restringe columnas, el trigger
   bloquear_autoescalada_empleado solo bloquea auto-edición — solo faltaba
   el control). Deliberadamente NO se puede tocar `administrador` desde este
   selector: ni ascender a alguien a administrador ni degradarlo — es una
   operación de mayor riesgo (podría dejar el negocio sin ningún
   administrador) que merece su propio flujo con más resguardos, no un
   <select> más en esta tabla.

   Rol principal y rol personalizado viven en UN SOLO <select> (antes eran
   dos columnas separadas, a pedido del usuario se unificaron): un
   <optgroup> con Encargado/Trabajador y otro con los roles personalizados
   del negocio. Elegir un rol personalizado solo toca `rolPersonalizadoId`
   (el `rol` principal de fondo queda como estaba — es inerte mientras haya
   un rol personalizado asignado, ver permisos.ts); elegir Encargado o
   Trabajador SIEMPRE limpia `rolPersonalizadoId` y vuelve al piso base de
   ese rol. Contrapartida real de unificarlo: ya no se puede cambiar
   Encargado↔Trabajador sin soltar el rol personalizado que tenía asignado
   (antes sí, porque eran columnas independientes) — hay que volver a
   elegirlo después si hace falta. */
export default function EmpleadosPage() {
  const { empleados, rolesPersonalizados, updateEmpleado, ready } = useData();
  const { empleado: yo } = useSession();
  const toast = useToast();
  const { pagina, setPagina, totalPaginas, visibles } = usePaginado(empleados);
  const [email, setEmail] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [rol, setRol] = useState<"encargado" | "trabajador">("trabajador");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  /* Antes: window.confirm()/window.alert() — diálogos nativos del navegador,
     sin estilo y bloqueantes. Reemplazados por confirmación inline (mismo
     patrón que la Zona de Peligro de Ajustes) + mensaje de error en la fila.
     `errorEliminar` es un solo estado compartido (no un mapa por id) porque
     solo puede haber una fila en modo "confirmando" a la vez — se limpia
     explícitamente en cada click de Eliminar/No para que un error viejo no
     se quede pegado si el admin cancela y confirma otra fila distinta. */
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);

  /* Config de asistencia/sueldo — editable SOLO por administrador, y NUNCA
     sobre la propia fila (el trigger bloquear_autoescalada_empleado() en
     supabase-schema.sql rechaza ese self-edit, igual que ya rechazaba
     rol/permisos) — por eso el botón "Editar" se oculta en la fila propia,
     mismo criterio que ya aplica "Eliminar" un poco más abajo. */
  const [editandoConfig, setEditandoConfig] = useState<Empleado | null>(null);
  const [formConfig, setFormConfig] = useState<Partial<Empleado>>({});
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  function abrirEditarConfig(e: Empleado) {
    setEditandoConfig(e);
    setFormConfig(e);
  }
  async function guardarConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!editandoConfig) return;
    setGuardandoConfig(true);
    await updateEmpleado(editandoConfig.id, {
      horaEntradaEsperada: formConfig.horaEntradaEsperada,
      horaSalidaEsperada: formConfig.horaSalidaEsperada,
      toleranciaTardanzaMin: formConfig.toleranciaTardanzaMin,
      tipoPago: formConfig.tipoPago,
      montoPagoBase: formConfig.montoPagoBase,
    });
    setGuardandoConfig(false);
    setEditandoConfig(null);
    toast("Configuración actualizada.");
  }

  async function invitar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setMensaje(null);
    const res = await fetch("/api/empleados/invitar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, nombres, apellidos, rol }),
    });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) {
      setMensaje(data.error ?? "No se pudo invitar.");
      return;
    }
    setMensaje(`Invitación enviada a ${email}.`);
    setEmail(""); setNombres(""); setApellidos("");
    setAbierto(false);
    toast(`Invitación enviada a ${email}.`);
  }

  async function cambiarRol(emp: Empleado, valor: string) {
    if (valor === "encargado" || valor === "trabajador") {
      // "" (no undefined) para que empleadoToRow sí incluya el campo en el patch — ver mappers.ts.
      await updateEmpleado(emp.id, { rol: valor, rolPersonalizadoId: "" });
      toast(`${emp.nombres} ahora es ${nombreRol(valor)}.`);
      return;
    }
    const rolPersonalizado = rolesPersonalizados.find((r) => r.id === valor);
    await updateEmpleado(emp.id, { rolPersonalizadoId: valor });
    toast(`${emp.nombres} ahora tiene el rol personalizado "${rolPersonalizado?.nombre ?? ""}".`);
  }

  async function eliminar(id: string) {
    setEliminando(true);
    setErrorEliminar(null);
    const res = await fetch("/api/empleados/eliminar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setEliminando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorEliminar(data.error ?? "No se pudo eliminar.");
      return;
    }
    setConfirmandoId(null);
    toast("Empleado eliminado.", "info");
  }

  return (
    <main>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Empleados</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Qué módulos ve cada uno se define en{" "}
        <a href="/dashboard/roles" className="link">Roles</a> — acá elegís qué rol (principal o personalizado) le corresponde a cada persona.
      </p>

      <div className="table-card mt-4">
        <div className="table-filter-bar justify-end">
          <button onClick={() => setAbierto(true)} className="btn-primary h-11 gap-1.5 sm:h-auto">
            <Plus size={16} /> Invitar empleado
          </button>
        </div>

        <Skeleton name="empleados-tabla" loading={!ready}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Nombre</th>
                <th className="table-head-cell">Rol</th>
                <th className="table-head-cell text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((e) => {
                return (
                  <Fragment key={e.id}>
                    <tr className="table-row">
                      <td className="table-body-cell">
                        <div className="flex items-center gap-3">
                          <span className="row-avatar"><UserRound size={16} /></span>
                          <span>
                            <span className="block font-medium text-slate-900 dark:text-slate-100">{e.nombres} {e.apellidos}</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-500">{e.email ?? "—"}</span>
                          </span>
                        </div>
                      </td>
                      <td className="table-body-cell text-slate-600 dark:text-slate-300">
                        {e.rol === "administrador" ? (
                          nombreRol(e.rol)
                        ) : (
                          <select
                            value={e.rolPersonalizadoId || e.rol}
                            onChange={(ev) => cambiarRol(e, ev.target.value)}
                            className="select h-11 sm:h-auto"
                          >
                            <optgroup label="Rol principal">
                              <option value="trabajador">{nombreRol("trabajador")}</option>
                              <option value="encargado">{nombreRol("encargado")}</option>
                            </optgroup>
                            {rolesPersonalizados.length > 0 && (
                              <optgroup label="Roles personalizados">
                                {rolesPersonalizados.map((r) => (
                                  <option key={r.id} value={r.id}>{r.nombre}</option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                        )}
                      </td>
                      <td className="table-body-cell text-right">
                        <div className="inline-flex items-center gap-1 whitespace-nowrap">
                          {/* Config de asistencia/sueldo — nunca sobre la propia
                              fila, el trigger de la DB rechazaría el self-edit
                              (ver comentario junto a editandoConfig arriba). */}
                          {e.id !== yo?.id && (
                            <button onClick={() => abrirEditarConfig(e)} title="Asistencia y sueldo" aria-label={`Configurar asistencia y sueldo de ${e.nombres} ${e.apellidos}`} className="row-icon-btn">
                              <Pencil size={15} />
                            </button>
                          )}
                          {e.rol !== "administrador" && e.id !== yo?.id && (
                            confirmandoId === e.id ? (
                              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                                <span className="text-xs text-slate-500 dark:text-slate-400">¿Seguro?</span>
                                <button onClick={() => eliminar(e.id)} disabled={eliminando} className="link-danger">
                                  {eliminando ? "Eliminando…" : "Sí"}
                                </button>
                                <button onClick={() => { setConfirmandoId(null); setErrorEliminar(null); }} className="link-muted">No</button>
                              </span>
                            ) : (
                              <button onClick={() => { setConfirmandoId(e.id); setErrorEliminar(null); }} title="Eliminar" aria-label={`Eliminar a ${e.nombres} ${e.apellidos}`} className="row-icon-btn row-icon-btn-danger">
                                <Trash2 size={15} />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                    {confirmandoId === e.id && errorEliminar && (
                      <tr className="table-row">
                        <td colSpan={3} className="px-4 py-2 text-sm text-red-600 dark:text-red-400">{errorEliminar}</td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        </Skeleton>
        <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
      </div>

      <SlideOver abierto={abierto} onClose={() => setAbierto(false)} titulo="Invitar empleado">
        <form onSubmit={invitar} className="space-y-3">
          <div>
            <label className="form-label">Nombres <span className="text-red-500">*</span></label>
            <input placeholder="Ej. María" required value={nombres} onChange={(e) => setNombres(e.target.value)} className="input h-11 w-full sm:h-auto" />
          </div>
          <div>
            <label className="form-label">Apellidos</label>
            <input placeholder="Ej. Gonzáles" value={apellidos} onChange={(e) => setApellidos(e.target.value)} className="input h-11 w-full sm:h-auto" />
          </div>
          <div>
            <label className="form-label">Email <span className="text-red-500">*</span></label>
            <input placeholder="Ej. maria@correo.com" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input h-11 w-full sm:h-auto" />
          </div>
          <div>
            <label className="form-label">Rol</label>
            <select value={rol} onChange={(e) => setRol(e.target.value as "encargado" | "trabajador")} className="select h-11 w-full sm:h-auto">
              <option value="trabajador">{nombreRol("trabajador")}</option>
              <option value="encargado">{nombreRol("encargado")}</option>
            </select>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-500"><span className="text-red-500">*</span> Campos obligatorios</p>
          <button type="submit" disabled={enviando} className="btn-primary h-11 w-full sm:h-auto">
            {enviando ? "Enviando…" : "Invitar empleado"}
          </button>
          {mensaje && <p className="text-sm text-slate-600 dark:text-slate-300">{mensaje}</p>}
        </form>
      </SlideOver>

      <SlideOver
        abierto={!!editandoConfig}
        onClose={() => setEditandoConfig(null)}
        titulo={editandoConfig ? `Asistencia y sueldo — ${editandoConfig.nombres} ${editandoConfig.apellidos}` : ""}
      >
        <form onSubmit={guardarConfig} className="space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Todo opcional — un negocio puede no usar asistencia/sueldos todavía.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="form-label">Hora de entrada esperada</label>
              <TimePicker etiqueta="Hora de entrada esperada" placeholder="Sin definir" valor={formConfig.horaEntradaEsperada ?? ""} onChange={(v) => setFormConfig({ ...formConfig, horaEntradaEsperada: v || undefined })} />
            </div>
            <div>
              <label className="form-label">Hora de salida esperada</label>
              <TimePicker etiqueta="Hora de salida esperada" placeholder="Sin definir" valor={formConfig.horaSalidaEsperada ?? ""} onChange={(v) => setFormConfig({ ...formConfig, horaSalidaEsperada: v || undefined })} />
            </div>
          </div>
          <div>
            <label className="form-label">Tolerancia de tardanza (minutos)</label>
            <input
              placeholder="Ej. 10" type="number" min={0}
              value={formConfig.toleranciaTardanzaMin ?? ""}
              onChange={(e) => setFormConfig({ ...formConfig, toleranciaTardanzaMin: Number(e.target.value) })}
              className="input h-11 w-full sm:h-auto"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="form-label">Tipo de pago</label>
              <select value={formConfig.tipoPago ?? ""} onChange={(e) => setFormConfig({ ...formConfig, tipoPago: (e.target.value || undefined) as TipoPeriodoPago | undefined })} className="select h-11 w-full sm:h-auto">
                <option value="">Sin definir</option>
                {TIPOS_PERIODO.map((t) => <option key={t} value={t}>{TIPO_PERIODO_LABEL[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Monto base (S/)</label>
              <input
                placeholder="Ej. 1200.00" type="number" step="0.01" min={0}
                value={formConfig.montoPagoBase ?? ""}
                onChange={(e) => setFormConfig({ ...formConfig, montoPagoBase: e.target.value ? Number(e.target.value) : undefined })}
                className="input h-11 w-full sm:h-auto"
              />
            </div>
          </div>
          <button type="submit" disabled={guardandoConfig} className="btn-primary h-11 w-full sm:h-auto">
            {guardandoConfig ? "Guardando…" : "Guardar configuración"}
          </button>
        </form>
      </SlideOver>
    </main>
  );
}
