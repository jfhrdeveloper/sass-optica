"use client";

import { useState } from "react";
import { Camera, Check, Clock, ImageIcon, Pencil } from "lucide-react";
import { Skeleton } from "boneyard-js/react";
import { useData, type Asistencia, type EstadoAsistencia } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { SlideOver } from "@/components/ui/SlideOver";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { DateRangePicker } from "@/components/calendario/DateRangePicker";
import { TimePicker } from "@/components/calendario/TimePicker";
import { formatearFechaPE } from "@/lib/formato/date";
import { puedeLeerModulo, puedeEscribirModulo } from "@/lib/permisos";
import { MarcarEntradaForm } from "@/components/dashboard/MarcarEntradaForm";
import { archivoABase64 } from "@/lib/archivo";

const ESTADOS: EstadoAsistencia[] = ["presente", "tarde", "falta", "permiso"];
const ESTADO_LABEL: Record<EstadoAsistencia, string> = {
  presente: "Presente", tarde: "Tarde", falta: "Falta", permiso: "Permiso",
};
const ESTADO_BADGE: Record<EstadoAsistencia, string> = {
  presente: "badge-success", tarde: "badge-warning", falta: "badge-danger", permiso: "badge-neutral",
};

function horaActual(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* Marcar la PROPIA asistencia es self-registro de cualquier empleado (sin
   gate de permiso, ver policy asistencias_self en supabase-schema.sql) —
   por eso la ruta de nav no lleva `permiso` (lib/dashboard-nav.ts). Ver/
   gestionar la del EQUIPO sí está gateado acá dentro con el permiso
   delegable 'asistencia' (mismo criterio que Caja/Laboratorio).

   Verificación SEPARADA por evento (entrada/salida) — no un solo booleano
   de día, mismo criterio que tramys-rrhh: cada marca se aprueba
   independiente, puede llegar en momentos distintos. */
export default function AsistenciaPage() {
  const { asistencias, asistenciaFotos, empleados, sucursales, rolesPersonalizados, marcarAsistencia, updateAsistencia, verificarAsistencia, ready } = useData();
  const { empleado } = useSession();
  const toast = useToast();
  const puedeVerEquipo = puedeLeerModulo(empleado, rolesPersonalizados, "asistencia");
  const puedeEditarEquipo = puedeEscribirModulo(empleado, rolesPersonalizados, "asistencia");

  const hoy = new Date().toISOString().slice(0, 10);
  const miAsistenciaHoy = empleado ? asistencias.find((a) => a.empleadoId === empleado.id && a.fecha === hoy) : undefined;
  const sedeHoy = miAsistenciaHoy?.sucursalId ? sucursales.find((s) => s.id === miAsistenciaHoy.sucursalId) : undefined;

  const [fotoSalida, setFotoSalida] = useState<string | null>(null);
  const [procesandoFotoSalida, setProcesandoFotoSalida] = useState(false);
  const [marcandoSalida, setMarcandoSalida] = useState(false);

  async function onFotoSalida(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcesandoFotoSalida(true);
    try { setFotoSalida(await archivoABase64(file)); }
    catch { toast("No se pudo procesar la foto.", "error"); }
    finally { setProcesandoFotoSalida(false); }
  }
  async function onMarcarSalida() {
    if (!empleado) return;
    setMarcandoSalida(true);
    await marcarAsistencia({
      empleadoId: empleado.id, fecha: hoy, horaSalida: horaActual(), marcadoPor: "empleado",
      ...(fotoSalida ? { fotoBase64: fotoSalida } : {}),
    });
    setMarcandoSalida(false);
    toast("Salida marcada.");
  }

  function nombreEmpleado(id: string): string {
    const e = empleados.find((x) => x.id === id);
    return e ? `${e.nombres} ${e.apellidos}` : "—";
  }

  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const delEquipo = [...asistencias]
    .filter((a) => !desde || a.fecha >= desde)
    .filter((a) => !hasta || a.fecha <= hasta)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const { pagina, setPagina, totalPaginas, visibles } = usePaginado(delEquipo);

  const [editando, setEditando] = useState<Asistencia | null>(null);
  const [formEdit, setFormEdit] = useState<Partial<Asistencia>>({});
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  function abrirEditar(a: Asistencia) {
    setEditando(a);
    setFormEdit(a);
  }
  async function guardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!editando) return;
    setGuardandoEdit(true);
    await updateAsistencia(editando.id, formEdit);
    setGuardandoEdit(false);
    setEditando(null);
    toast("Asistencia actualizada.");
  }

  async function onVerificar(a: Asistencia, evt: "entrada" | "salida") {
    if (!empleado) return;
    await verificarAsistencia(a.id, evt, empleado.id);
    toast(`${evt === "entrada" ? "Entrada" : "Salida"} verificada.`);
  }

  const [fotoViendo, setFotoViendo] = useState<{ asistenciaId: string; tipo: "entrada" | "salida" } | null>(null);
  const fotoAVer = fotoViendo
    ? asistenciaFotos.find((f) => f.asistenciaId === fotoViendo.asistenciaId && f.tipo === fotoViendo.tipo)
    : undefined;

  return (
    <main>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Asistencia</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Marca tu entrada y salida del día.</p>

      <div className="card mt-4 p-4">
        {!miAsistenciaHoy?.horaEntrada ? (
          <MarcarEntradaForm />
        ) : !miAsistenciaHoy.horaSalida ? (
          <div className="space-y-3">
            <div>
              <span className={`badge ${ESTADO_BADGE[miAsistenciaHoy.estado]}`}>{ESTADO_LABEL[miAsistenciaHoy.estado]}</span>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Entrada: {miAsistenciaHoy.horaEntrada}{sedeHoy ? ` · Sede: ${sedeHoy.nombre}` : ""}
              </p>
            </div>
            {fotoSalida ? (
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URI en memoria */}
                <img src={fotoSalida} alt="" className="h-11 w-11 rounded-lg object-cover" />
                <button type="button" onClick={() => setFotoSalida(null)} className="h-11 text-xs text-red-600 underline dark:text-red-400">
                  Quitar foto
                </button>
              </div>
            ) : (
              <label className={`flex h-11 w-fit items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 ${procesandoFotoSalida ? "opacity-60" : "cursor-pointer"}`}>
                <Camera size={14} />
                {procesandoFotoSalida ? "Procesando foto…" : "+ Adjuntar foto (opcional)"}
                <input type="file" accept="image/*" capture="environment" disabled={procesandoFotoSalida} onChange={onFotoSalida} className="hidden" />
              </label>
            )}
            <button onClick={onMarcarSalida} disabled={marcandoSalida} className="btn-primary h-11 w-full gap-1.5 sm:h-auto">
              <Clock size={16} /> {marcandoSalida ? "Marcando…" : "Marcar salida"}
            </button>
          </div>
        ) : (
          <div>
            <span className={`badge ${ESTADO_BADGE[miAsistenciaHoy.estado]}`}>{ESTADO_LABEL[miAsistenciaHoy.estado]}</span>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Entrada: {miAsistenciaHoy.horaEntrada} · Salida: {miAsistenciaHoy.horaSalida}
              {sedeHoy ? ` · Sede: ${sedeHoy.nombre}` : ""}
            </p>
          </div>
        )}
      </div>

      {puedeVerEquipo && (
        <>
          <h2 className="mt-8 text-sm font-semibold text-slate-700 dark:text-slate-200">Asistencia del equipo</h2>
          <div className="table-card mt-2">
            <div className="table-filter-bar justify-end">
              <DateRangePicker desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); }} />
            </div>
            <Skeleton name="asistencia-equipo-tabla" loading={!ready}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="table-head-cell">Empleado</th>
                    <th className="table-head-cell">Fecha</th>
                    <th className="table-head-cell hidden md:table-cell">Entrada</th>
                    <th className="table-head-cell hidden md:table-cell">Salida</th>
                    <th className="table-head-cell">Estado</th>
                    <th className="table-head-cell hidden md:table-cell">Verificación</th>
                    {puedeEditarEquipo && <th className="table-head-cell text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((a) => (
                    <tr key={a.id} className="table-row">
                      <td className="table-body-cell font-medium text-slate-900 dark:text-slate-100">{nombreEmpleado(a.empleadoId)}</td>
                      <td className="table-body-cell text-slate-600 dark:text-slate-300">{formatearFechaPE(a.fecha)}</td>
                      <td className="table-body-cell hidden md:table-cell text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          {a.horaEntrada ?? "—"}
                          {a.fotoEntrada && (
                            <button onClick={() => setFotoViendo({ asistenciaId: a.id, tipo: "entrada" })} aria-label="Ver foto de entrada" title="Ver foto de entrada" className="row-icon-btn h-6 w-6">
                              <ImageIcon size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="table-body-cell hidden md:table-cell text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          {a.horaSalida ?? "—"}
                          {a.fotoSalida && (
                            <button onClick={() => setFotoViendo({ asistenciaId: a.id, tipo: "salida" })} aria-label="Ver foto de salida" title="Ver foto de salida" className="row-icon-btn h-6 w-6">
                              <ImageIcon size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="table-body-cell"><span className={`badge ${ESTADO_BADGE[a.estado]}`}>{ESTADO_LABEL[a.estado]}</span></td>
                      <td className="table-body-cell hidden md:table-cell">
                        <div className="flex flex-col gap-1 text-xs">
                          <span className={a.verificadoEntradaPor ? "text-accent" : "text-slate-400 dark:text-slate-500"}>
                            Entrada {a.verificadoEntradaPor ? <Check size={12} className="inline" /> : "· pendiente"}
                          </span>
                          <span className={a.verificadoSalidaPor ? "text-accent" : "text-slate-400 dark:text-slate-500"}>
                            Salida {a.verificadoSalidaPor ? <Check size={12} className="inline" /> : "· pendiente"}
                          </span>
                        </div>
                      </td>
                      {puedeEditarEquipo && (
                        <td className="table-body-cell">
                          <div className="flex items-center justify-end gap-1">
                            {a.horaEntrada && !a.verificadoEntradaPor && (
                              <button onClick={() => onVerificar(a, "entrada")} className="btn-outline h-11 px-2 text-xs">Verif. entrada</button>
                            )}
                            {a.horaSalida && !a.verificadoSalidaPor && (
                              <button onClick={() => onVerificar(a, "salida")} className="btn-outline h-11 px-2 text-xs">Verif. salida</button>
                            )}
                            <button onClick={() => abrirEditar(a)} title="Editar" aria-label={`Editar asistencia de ${nombreEmpleado(a.empleadoId)}`} className="row-icon-btn">
                              <Pencil size={15} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {delEquipo.length === 0 && (
                    <tr>
                      <td colSpan={puedeEditarEquipo ? 7 : 6}>
                        <div className="table-empty">Sin registros de asistencia todavía.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </Skeleton>
            <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
          </div>
        </>
      )}

      <SlideOver abierto={!!editando} onClose={() => setEditando(null)} titulo={editando ? `Editar asistencia — ${nombreEmpleado(editando.empleadoId)}` : ""}>
        <form onSubmit={guardarEdicion} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="form-label">Hora de entrada</label>
              <TimePicker etiqueta="Hora de entrada" placeholder="Sin marcar" valor={formEdit.horaEntrada ?? ""} onChange={(v) => setFormEdit({ ...formEdit, horaEntrada: v || undefined })} />
            </div>
            <div>
              <label className="form-label">Hora de salida</label>
              <TimePicker etiqueta="Hora de salida" placeholder="Sin marcar" valor={formEdit.horaSalida ?? ""} onChange={(v) => setFormEdit({ ...formEdit, horaSalida: v || undefined })} />
            </div>
          </div>
          <div>
            <label className="form-label">Estado</label>
            <select value={formEdit.estado ?? "presente"} onChange={(e) => setFormEdit({ ...formEdit, estado: e.target.value as EstadoAsistencia })} className="select h-11 w-full sm:h-auto">
              {ESTADOS.map((s) => <option key={s} value={s}>{ESTADO_LABEL[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Notas</label>
            <textarea placeholder="Cualquier detalle adicional" value={formEdit.notas ?? ""} onChange={(e) => setFormEdit({ ...formEdit, notas: e.target.value })} className="input w-full" rows={3} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-500">
            La verificación de entrada/salida se hace desde los botones de la tabla, no acá — cada evento se aprueba por separado.
          </p>
          <button type="submit" disabled={guardandoEdit} className="btn-primary h-11 w-full sm:h-auto">
            {guardandoEdit ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      </SlideOver>

      <SlideOver abierto={!!fotoViendo} onClose={() => setFotoViendo(null)} titulo={`Foto de ${fotoViendo?.tipo === "entrada" ? "entrada" : "salida"}`}>
        {fotoAVer ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URI en memoria, no un asset de next/image
          <img src={fotoAVer.fotoBase64} alt="" className="w-full rounded-lg object-contain" />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No se encontró la foto (puede haberse purgado por antigüedad).</p>
        )}
      </SlideOver>
    </main>
  );
}
