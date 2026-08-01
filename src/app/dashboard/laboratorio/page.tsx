"use client";

import { useState } from "react";
import { Plus, FlaskConical, MessageCircle } from "lucide-react";
import { useData, type OrdenLaboratorio, type EstadoOrdenLaboratorio } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { SlideOver } from "@/components/ui/SlideOver";
import { DatePicker } from "@/components/calendario/DatePicker";
import { formatearFecha } from "@/lib/formato/date";
import { urlWhatsAppContacto } from "@/lib/contacto";
import {
  ESTADOS_ORDEN_LABORATORIO, ESTADO_ORDEN_LABORATORIO_LABEL, ESTADO_ORDEN_LABORATORIO_BADGE,
  TRANSICIONES_VALIDAS,
} from "@/lib/laboratorio";

const VACIO: Partial<OrdenLaboratorio> = {};

/* Lectura abierta a cualquier rol (RLS: ordenes_lab_read sin filtro de
   permiso) — cualquier empleado debe poder consultar el estado si un
   cliente llama preguntando. La escritura (cambiar estado) SÍ está limitada
   por RLS a puede_gestionar() o al permiso granular 'laboratorio'; acá solo
   se oculta/deshabilita el control como ergonomía de UI, igual que el resto
   del proyecto — la protección real vive en la base. Sin Kanban a
   propósito: no hay ningún patrón drag-and-drop en el proyecto, un <select>
   de estado (como estado_cotizacion) alcanza para el MVP. */
export default function LaboratorioPage() {
  const { ordenesLaboratorio, clientes, ventas, addOrdenLaboratorio, updateOrdenLaboratorio } = useData();
  const { empleado } = useSession();
  const toast = useToast();
  const puedeEditar = empleado?.rol === "administrador" || empleado?.rol === "encargado" || empleado?.permisos?.laboratorio === true;

  const [filtroEstado, setFiltroEstado] = useState<"todos" | EstadoOrdenLaboratorio>("todos");
  const [form, setForm] = useState<Partial<OrdenLaboratorio>>(VACIO);
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  function nuevo() {
    setForm(VACIO);
    setAbierto(true);
  }
  function cerrar() {
    setAbierto(false);
    setForm(VACIO);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clienteId) return;
    setGuardando(true);
    await addOrdenLaboratorio({ ...form, empleadoId: empleado?.id });
    setGuardando(false);
    toast("Orden de laboratorio creada.");
    cerrar();
  }

  async function cambiarEstado(orden: OrdenLaboratorio, estado: EstadoOrdenLaboratorio) {
    await updateOrdenLaboratorio(orden.id, { estado });
    toast(`Estado actualizado: ${ESTADO_ORDEN_LABORATORIO_LABEL[estado]}.`);
  }

  async function avisarWhatsapp(orden: OrdenLaboratorio) {
    const cliente = clientes.find((c) => c.id === orden.clienteId);
    if (!cliente?.telefono) return;
    const mensaje = `Hola ${cliente.nombres}, tus lentes ya están listos para recoger. ¡Te esperamos!`;
    window.open(urlWhatsAppContacto(cliente.telefono, mensaje), "_blank");
    await updateOrdenLaboratorio(orden.id, { avisadoWhatsappEn: new Date().toISOString() });
  }

  const filtradas = ordenesLaboratorio
    .filter((o) => filtroEstado === "todos" || o.estado === filtroEstado)
    .sort((a, b) => b.fechaGenerado.localeCompare(a.fechaGenerado));

  const ventasDelCliente = ventas.filter((v) => v.clienteId === form.clienteId);

  return (
    <main>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Órdenes de laboratorio</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Seguimiento del armado de lentes, desde que se generan hasta que se entregan al paciente.
      </p>

      <div className="table-card mt-4">
        <div className="table-filter-bar">
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)} className="select text-sm">
            <option value="todos">Todos los estados</option>
            {ESTADOS_ORDEN_LABORATORIO.map((es) => <option key={es} value={es}>{ESTADO_ORDEN_LABORATORIO_LABEL[es]}</option>)}
          </select>
          <button onClick={nuevo} className="btn-primary ml-auto gap-1.5">
            <Plus size={16} /> Nueva orden
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Cliente</th>
                <th className="table-head-cell hidden md:table-cell">Laboratorio</th>
                <th className="table-head-cell">Generado</th>
                <th className="table-head-cell">Estado</th>
                <th className="table-head-cell text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((o) => {
                const cliente = clientes.find((c) => c.id === o.clienteId);
                const opcionesEstado = [o.estado, ...TRANSICIONES_VALIDAS[o.estado]];
                return (
                  <tr key={o.id} className="table-row">
                    <td className="table-body-cell">
                      <div className="flex items-center gap-3">
                        <span className="row-avatar"><FlaskConical size={16} /></span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {cliente ? `${cliente.nombres} ${cliente.apellidos}` : "Cliente eliminado"}
                        </span>
                      </div>
                    </td>
                    <td className="table-body-cell hidden md:table-cell text-slate-600 dark:text-slate-300">{o.laboratorioNombre ?? "—"}</td>
                    <td className="table-body-cell text-slate-600 dark:text-slate-300">{formatearFecha(o.fechaGenerado)}</td>
                    <td className="table-body-cell">
                      {puedeEditar ? (
                        <select
                          value={o.estado}
                          onChange={(e) => cambiarEstado(o, e.target.value as EstadoOrdenLaboratorio)}
                          className="select text-xs"
                        >
                          {opcionesEstado.map((es) => <option key={es} value={es}>{ESTADO_ORDEN_LABORATORIO_LABEL[es]}</option>)}
                        </select>
                      ) : (
                        <span className={`badge ${ESTADO_ORDEN_LABORATORIO_BADGE[o.estado]}`}>{ESTADO_ORDEN_LABORATORIO_LABEL[o.estado]}</span>
                      )}
                    </td>
                    <td className="table-body-cell text-right">
                      {o.estado === "recibido" && cliente?.telefono && (
                        <button
                          onClick={() => avisarWhatsapp(o)}
                          title="Avisar por WhatsApp que ya está listo"
                          aria-label={`Avisar a ${cliente.nombres} por WhatsApp`}
                          className="row-icon-btn"
                        >
                          <MessageCircle size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="table-empty">
                      <FlaskConical size={28} className="text-slate-300 dark:text-slate-600" />
                      Sin órdenes para este filtro.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SlideOver abierto={abierto} onClose={cerrar} titulo="Nueva orden de laboratorio">
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Cliente</label>
            <select
              required value={form.clienteId ?? ""}
              onChange={(e) => setForm({ ...form, clienteId: e.target.value || undefined, ventaId: undefined })}
              className="select mt-1 w-full text-sm"
            >
              <option value="">Selecciona un cliente</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>)}
            </select>
          </div>
          {form.clienteId && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Venta relacionada (opcional)</label>
              <select value={form.ventaId ?? ""} onChange={(e) => setForm({ ...form, ventaId: e.target.value || undefined })} className="select mt-1 w-full text-sm">
                <option value="">Sin venta asociada</option>
                {ventasDelCliente.map((v) => (
                  <option key={v.id} value={v.id}>{formatearFecha(v.fecha)} — S/ {v.total.toFixed(2)}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Laboratorio / taller (opcional)</label>
            <input value={form.laboratorioNombre ?? ""} onChange={(e) => setForm({ ...form, laboratorioNombre: e.target.value || undefined })} className="input mt-1 w-full text-sm" />
          </div>
          {/* Antes era un <input type="date"> nativo — el calendario propio del
              proyecto (mismo componente que usan citas/cotizaciones/gastos)
              faltaba acá, sin razón real para la inconsistencia. */}
          <div className="mt-1">
            <DatePicker
              etiqueta="Fecha estimada de entrega"
              placeholder="Sin fecha estimada"
              valor={form.fechaEstimada ?? ""}
              onChange={(v) => setForm({ ...form, fechaEstimada: v || undefined })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Notas (opcional)</label>
            <textarea rows={2} value={form.notas ?? ""} onChange={(e) => setForm({ ...form, notas: e.target.value || undefined })} className="input mt-1 w-full text-sm" />
          </div>
          <button type="submit" disabled={guardando} className="btn-primary w-full">
            {guardando ? "Guardando…" : "Crear orden"}
          </button>
        </form>
      </SlideOver>
    </main>
  );
}
