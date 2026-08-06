"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { useData, type Cita } from "@/components/providers/DataProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { SlideOver } from "@/components/ui/SlideOver";
import { Pagination } from "@/components/ui/Pagination";
import { DatePicker } from "@/components/calendario/DatePicker";
import { TimePicker } from "@/components/calendario/TimePicker";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { formatearFecha } from "@/lib/formato/date";
import { EstadoCitaBadge } from "@/components/citas/EstadoCitaBadge";
import { ESTADOS_CITA, ESTADO_CITA_LABEL, DURACION_CITA_DEFECTO_MIN, sumarMinutosHora, diferenciaMinutos } from "@/lib/citas";

/* Pestaña "Citas" de la ficha de cliente (ruta base /dashboard/clientes/[id]
   — el resto del shell, header/contacto/notas/pestañas, vive en layout.tsx
   de esta misma carpeta). Solo editar/eliminar acá, no "Nueva cita" — crear
   ya vive en la página principal de Citas ("Agendar cita"), no tiene
   sentido duplicar ese botón acá. */
export default function ClienteCitasPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const { clientes, citas, sucursales, empleados, addCita, updateCita, deleteCita } = useData();
  const cliente = clientes.find((c) => c.id === params.id) ?? null;

  const citasDelCliente = cliente
    ? [...citas].filter((c) => c.clienteId === cliente.id).sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))
    : [];
  const { pagina: paginaCitas, setPagina: setPaginaCitas, totalPaginas: totalPaginasCitas, visibles: citasVisibles } =
    usePaginado(citasDelCliente);

  const [abierto, setAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Cita>>({});
  const [fechaCita, setFechaCita] = useState("");
  const [horaCita, setHoraCita] = useState("");
  const [horaFinCita, setHoraFinCita] = useState("");
  const [guardando, setGuardando] = useState(false);

  /* Mismo criterio que citas/page.tsx: al mover la hora de inicio, la de
     fin la sigue para mantener la misma duración que ya tenía. */
  function cambiarHoraInicio(hora: string) {
    const duracionPrevia = horaCita && horaFinCita ? Math.max(diferenciaMinutos(horaCita, horaFinCita), DURACION_CITA_DEFECTO_MIN) : DURACION_CITA_DEFECTO_MIN;
    setHoraCita(hora);
    setHoraFinCita(hora ? sumarMinutosHora(hora, duracionPrevia) : "");
  }

  function editar(c: Cita) {
    setEditandoId(c.id);
    setForm(c);
    const hInicio = c.fechaHora.slice(11, 16);
    setFechaCita(c.fechaHora.slice(0, 10));
    setHoraCita(hInicio);
    setHoraFinCita(sumarMinutosHora(hInicio, c.duracionMin ?? DURACION_CITA_DEFECTO_MIN));
    setAbierto(true);
  }
  function cerrar() {
    setAbierto(false);
    setEditandoId(null);
    setForm({});
    setFechaCita("");
    setHoraCita("");
    setHoraFinCita("");
  }
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fechaHora = fechaCita && horaCita ? `${fechaCita}T${horaCita}` : undefined;
    const duracionMin = horaCita && horaFinCita ? diferenciaMinutos(horaCita, horaFinCita) : undefined;
    if (!editandoId || !fechaHora || !duracionMin || duracionMin <= 0) return;
    setGuardando(true);
    await updateCita(editandoId, { ...form, fechaHora, duracionMin });
    toast("Cambios guardados.");
    setGuardando(false);
    cerrar();
  }
  async function eliminar(c: Cita) {
    await deleteCita(c.id);
    /* Deshacer = volver a crear la cita — mismo patrón que citas/page.tsx. */
    toast("Cita eliminada.", "info", { label: "Deshacer", onClick: () => { void addCita(c); } });
  }

  if (!cliente) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Citas ({citasDelCliente.length})</h2>
      {citasDelCliente.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">Primera vez — todavía no tiene citas registradas.</p>
      ) : (
        <>
          <ul className="mt-2 space-y-2">
            {citasVisibles.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
                <div>
                  <p className="text-slate-700 dark:text-slate-200">{formatearFecha(c.fechaHora)}</p>
                  {c.motivo && <p className="text-xs text-slate-500 dark:text-slate-500">{c.motivo}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <EstadoCitaBadge estado={c.estado} />
                  <button onClick={() => editar(c)} title="Editar" aria-label="Editar cita" className="row-icon-btn">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => eliminar(c)} title="Eliminar" aria-label="Eliminar cita" className="row-icon-btn row-icon-btn-danger">
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <Pagination pagina={paginaCitas} totalPaginas={totalPaginasCitas} onCambiar={setPaginaCitas} />
        </>
      )}

      <SlideOver abierto={abierto} onClose={cerrar} titulo="Editar cita">
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="form-label">Fecha de la cita <span className="text-red-500">*</span></label>
            <DatePicker etiqueta="Fecha de la cita" placeholder="Elegir fecha" valor={fechaCita} onChange={setFechaCita} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0">
              <label className="form-label">Hora de inicio <span className="text-red-500">*</span></label>
              <TimePicker etiqueta="Hora de inicio" placeholder="Elegir hora" valor={horaCita} onChange={cambiarHoraInicio} />
            </div>
            <div className="min-w-0">
              <label className="form-label">Hora de fin <span className="text-red-500">*</span></label>
              <TimePicker etiqueta="Hora de fin" placeholder="Elegir hora" valor={horaFinCita} onChange={setHoraFinCita} />
            </div>
          </div>
          {horaCita && horaFinCita && diferenciaMinutos(horaCita, horaFinCita) <= 0 && (
            <p className="text-xs text-red-600 dark:text-red-400">La hora de fin debe ser posterior a la de inicio.</p>
          )}
          <div>
            <label className="form-label">Motivo</label>
            <input placeholder="Ej. Control anual" value={form.motivo ?? ""} onChange={(e) => setForm({ ...form, motivo: e.target.value })} className="input h-11 w-full sm:h-auto" />
          </div>
          <div>
            <label className="form-label">Estado</label>
            <select value={form.estado ?? "programada"} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="select h-11 w-full sm:h-auto">
              {ESTADOS_CITA.map((s) => <option key={s} value={s}>{ESTADO_CITA_LABEL[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Empleado asignado</label>
            <select
              value={form.empleadoId ?? ""}
              onChange={(e) => setForm({ ...form, empleadoId: e.target.value || undefined })}
              className="select h-11 w-full sm:h-auto"
            >
              <option value="">Sin asignar</option>
              {empleados.filter((e) => e.activo).map((e) => <option key={e.id} value={e.id}>{e.nombres} {e.apellidos}</option>)}
            </select>
          </div>
          {sucursales.length > 0 && (
            <div>
              <label className="form-label">Sede</label>
              <select
                value={form.sucursalId ?? ""}
                onChange={(e) => setForm({ ...form, sucursalId: e.target.value || undefined })}
                aria-label="Sede"
                className="select h-11 w-full sm:h-auto"
              >
                <option value="">Sin sede asignada</option>
                {sucursales.filter((s) => s.activo).map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-500"><span className="text-red-500">*</span> Campos obligatorios</p>
          <button
            type="submit"
            disabled={guardando || !fechaCita || !horaCita || !horaFinCita || diferenciaMinutos(horaCita, horaFinCita) <= 0}
            className="btn-primary h-11 w-full sm:h-auto"
          >
            Guardar cambios
          </button>
        </form>
      </SlideOver>
    </div>
  );
}
