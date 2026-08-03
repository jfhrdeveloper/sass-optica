"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { User, History, Pencil, Plus, ArrowLeft, Trash2, Check, X, Contact, Printer } from "lucide-react";
import { useData, type ExamenOptometrico, type Venta } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useClienteForm } from "@/lib/hooks/useClienteForm";
import { ClienteFormSlideOver } from "@/components/clientes/ClienteFormSlideOver";
import { BotonWhatsApp } from "@/components/clientes/BotonWhatsApp";
import { WhatsAppIcon } from "@/components/landing/WhatsAppIcon";
import { SlideOver } from "@/components/ui/SlideOver";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { formatearFecha, formatearFechaHora } from "@/lib/formato/date";
import { createClient } from "@/lib/supabase/client";
import { isMockMode } from "@/lib/mock/mock-mode";
import { urlWhatsAppContacto } from "@/lib/contacto";
import { ESTADO_CITA_LABEL, ESTADO_CITA_BADGE } from "@/lib/citas";
import { calcularSeguimientos, calcularRecallControlAnual, estaVencido, type Seguimiento } from "@/lib/seguimiento-clientes";
import { construirHtmlRecibo } from "@/lib/recibo";

/* Citas y exámenes de la ficha se paginan más chico que las listas del
   dashboard (usePaginado usa 10 por defecto) — pedido explícito del
   usuario: acá el objetivo es un resumen rápido del cliente, no un listado
   completo. */
const TAMANO_PAGINA_FICHA = 4;

const EXAMEN_VACIO: Partial<ExamenOptometrico> = {};

type EntradaAuditoria = { id: number; ts: string; accion: string };
const ACCION_LABEL: Record<string, string> = { INSERT: "Creado", UPDATE: "Editado", DELETE: "Eliminado" };

/* Grado óptico con signo explícito (+1.25 / -0.50) — sin signo, "1.25" se
   lee ambiguo; en optometría la miopía y la hipermetropía se distinguen
   justamente por ese signo. */
function fmtDiop(n?: number): string {
  if (n === undefined || n === null) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}`;
}

export default function ClienteDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { negocio, clientes, citas, recetas, examenesOptometricos, addExamenOptometrico, ventas, ventaItems, productos, deleteCliente, updateCliente } = useData();
  const { empleado } = useSession();
  const esAdmin = empleado?.rol === "administrador";
  const formEstado = useClienteForm();

  const cliente = clientes.find((c) => c.id === params.id) ?? null;

  const citasDelCliente = cliente
    ? [...citas].filter((c) => c.clienteId === cliente.id).sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))
    : [];
  const recetasDelCliente = cliente
    ? [...recetas].filter((r) => r.clienteId === cliente.id).sort((a, b) => b.fecha.localeCompare(a.fecha))
    : [];
  const examenesDelCliente = cliente
    ? [...examenesOptometricos].filter((e) => e.clienteId === cliente.id).sort((a, b) => b.fecha.localeCompare(a.fecha))
    : [];
  const seguimientosDelCliente = cliente
    ? [...calcularSeguimientos(ventas, ventaItems, productos), ...calcularRecallControlAnual(recetas, examenesOptometricos)]
        .filter((s) => s.clienteId === cliente.id)
    : [];

  /* Recordatorio manual por WhatsApp (mismo patrón que urlRecordatorio en
     citas/page.tsx: el cálculo de CUÁNDO recordar es automático, pero el
     envío en sí requiere un clic — automatizarlo del todo necesita la API
     real de WhatsApp Business, fuera de alcance de este MVP). */
  function mensajeSeguimiento(s: Seguimiento): string {
    const nombreOptica = negocio?.nombre ?? "nuestra óptica";
    if (s.tipo === "reposicion") return `Hola ${cliente?.nombres}, ya te toca reponer tus ${s.productoNombre}. ¿Coordinamos tu próxima visita a ${nombreOptica}?`;
    if (s.tipo === "garantia") return `Hola ${cliente?.nombres}, te recordamos que la garantía de tu ${s.productoNombre} vence el ${formatearFecha(s.fecha)}.`;
    return `Hola ${cliente?.nombres}, ya te toca tu control anual en ${nombreOptica}. ¿Coordinamos una cita?`;
  }
  function urlRecordatorioSeguimiento(s: Seguimiento): string | null {
    if (!cliente?.telefono) return null;
    return urlWhatsAppContacto(cliente.telefono, mensajeSeguimiento(s));
  }
  const { pagina: paginaCitas, setPagina: setPaginaCitas, totalPaginas: totalPaginasCitas, visibles: citasVisibles } =
    usePaginado(citasDelCliente, TAMANO_PAGINA_FICHA);
  const { pagina: paginaExamenes, setPagina: setPaginaExamenes, totalPaginas: totalPaginasExamenes, visibles: examenesVisibles } =
    usePaginado(examenesDelCliente, TAMANO_PAGINA_FICHA);

  /* Eliminar/Editar viven acá (dentro de la ficha), no en la fila de la
     tabla de clientes/page.tsx — reusa el mismo `deleteCliente` (soft-delete
     a la papelera) que ya tenía la lista, solo que acá redirige de vuelta al
     no quedar nada que mostrar. */
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  async function eliminarCliente() {
    if (!cliente) return;
    setConfirmarEliminar(false);
    await deleteCliente(cliente.id);
    toast(`${cliente.nombres} eliminado.`);
    router.push("/dashboard/clientes");
  }

  /* Notas editables sin pasar por el wizard de 2 pasos de
     ClienteFormSlideOver — un textarea + guardar directo con `updateCliente`,
     para el caso común de "corregir/agregar una nota" sin reabrir todo el
     formulario de edición. */
  const [editandoNotas, setEditandoNotas] = useState(false);
  const [notasValor, setNotasValor] = useState("");
  const [guardandoNotas, setGuardandoNotas] = useState(false);
  function iniciarEdicionNotas() {
    setNotasValor(cliente?.notas ?? "");
    setEditandoNotas(true);
  }
  async function guardarNotas() {
    if (!cliente) return;
    setGuardandoNotas(true);
    await updateCliente(cliente.id, { notas: notasValor || undefined });
    setGuardandoNotas(false);
    setEditandoNotas(false);
  }

  const [abiertoExamen, setAbiertoExamen] = useState(false);
  const [examenForm, setExamenForm] = useState<Partial<ExamenOptometrico>>(EXAMEN_VACIO);
  const [guardandoExamen, setGuardandoExamen] = useState(false);
  async function onSubmitExamen(e: React.FormEvent) {
    e.preventDefault();
    if (!cliente) return;
    setGuardandoExamen(true);
    await addExamenOptometrico({ ...examenForm, clienteId: cliente.id });
    setGuardandoExamen(false);
    setAbiertoExamen(false);
    setExamenForm(EXAMEN_VACIO);
  }
  const ventasDelCliente = cliente
    ? [...ventas].filter((v) => v.clienteId === cliente.id).sort((a, b) => b.fecha.localeCompare(a.fecha))
    : [];

  /* Reimprimir el recibo de una compra pasada — mismo patrón que
     imprimirRecibo en ventas/page.tsx (ventana nueva + HTML con su propio
     `<style>`, no depende del dark mode del dashboard). Pedido explícito:
     desde la ficha del cliente también se necesita reimprimir, no solo
     desde el listado general de Ventas. */
  function imprimirRecibo(v: Venta) {
    const html = construirHtmlRecibo({
      negocioNombre: negocio?.nombre ?? "Óptica",
      negocioRuc: negocio?.ruc,
      clienteNombre: cliente ? `${cliente.nombres} ${cliente.apellidos}` : "—",
      venta: v,
      items: ventaItems.filter((it) => it.ventaId === v.id),
    });
    const ventana = window.open("", "_blank", "width=400,height=600");
    if (!ventana) { toast("El navegador bloqueó la ventana de impresión.", "error"); return; }
    ventana.document.write(html);
    ventana.document.close();
    ventana.focus();
    ventana.print();
  }

  /* Historial de cambios: misma fuente (audit_log) y misma restricción de
     rol que tenía el panel lateral anterior — ver comentario original en
     el historial de git de clientes/page.tsx. */
  const [historial, setHistorial] = useState<{ id: string | null; entradas: EntradaAuditoria[] }>({ id: null, entradas: [] });
  useEffect(() => {
    if (!cliente || !esAdmin || isMockMode()) return;
    let activo = true;
    const supabase = createClient();
    supabase
      .from("audit_log")
      .select("id, ts, accion")
      .eq("tabla", "clientes")
      .eq("fila_id", cliente.id)
      .order("ts", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (activo) setHistorial({ id: cliente.id, entradas: data ?? [] }); });
    return () => { activo = false; };
  }, [cliente, esAdmin]);
  const historialCambios = historial.id === cliente?.id ? historial.entradas : [];

  if (!cliente) {
    return (
      <main>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cliente no encontrado (puede haber sido eliminado o estar en la papelera).
        </p>
      </main>
    );
  }

  return (
    <main>
      {/* La ficha no tenía forma de volver a la lista salvo el botón "atrás"
          del navegador — `.link` ya trae el underline azul animado de
          izquierda a derecha (globals.css), no hace falta CSS nuevo. */}
      <Link href="/dashboard/clientes" className="link inline-flex items-center gap-1.5 text-sm font-medium">
        <ArrowLeft size={15} /> Clientes
      </Link>

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
            <User size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{cliente.nombres} {cliente.apellidos}</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">{cliente.documentoTipo} {cliente.documentoNumero ?? "—"}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => formEstado.editar(cliente)} className="btn-outline gap-1.5 px-3 py-1.5 text-xs">
            <Pencil size={13} /> Editar
          </button>
          <button onClick={() => setConfirmarEliminar(true)} className="btn-outline gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
            <Trash2 size={13} /> Eliminar
          </button>
        </div>
      </div>

      {seguimientosDelCliente.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {seguimientosDelCliente.map((s) => {
            const urlRecordatorio = urlRecordatorioSeguimiento(s);
            return (
              <p
                key={`${s.tipo}-${s.ventaId ?? s.clienteId}`}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  estaVencido(s.fecha)
                    ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                    : "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300"
                }`}
              >
                <Contact size={15} className="shrink-0" />
                <span className="flex-1">
                  {s.tipo === "reposicion" && <>Le toca reponer <strong>{s.productoNombre}</strong> el {formatearFecha(s.fecha)}{estaVencido(s.fecha) ? " (vencido)" : ""}.</>}
                  {s.tipo === "garantia" && <>Garantía de <strong>{s.productoNombre}</strong> vence el {formatearFecha(s.fecha)}{estaVencido(s.fecha) ? " (vencida)" : ""}.</>}
                  {s.tipo === "control_anual" && <>Le toca su <strong>control anual</strong> el {formatearFecha(s.fecha)}{estaVencido(s.fecha) ? " (vencido)" : ""}.</>}
                </span>
                {urlRecordatorio && (
                  <a
                    href={urlRecordatorio}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Recordar por WhatsApp"
                    aria-label={`Recordar por WhatsApp a ${cliente.nombres}`}
                    className="shrink-0 text-[#25D366] transition-opacity hover:opacity-75"
                  >
                    <WhatsAppIcon size={15} />
                  </a>
                )}
              </p>
            );
          })}
        </div>
      )}

      <div className="card mt-5 grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-xs text-slate-400 dark:text-slate-500">Teléfono</div>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-slate-100">
            {cliente.telefono ?? "—"}
            {cliente.telefono && <BotonWhatsApp telefono={cliente.telefono} />}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400 dark:text-slate-500">Email</div>
          <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{cliente.email ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400 dark:text-slate-500">Nacimiento</div>
          <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            {cliente.fechaNacimiento ? formatearFecha(cliente.fechaNacimiento) : "—"}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400 dark:text-slate-500">Dirección</div>
          <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{cliente.direccion ?? "—"}</div>
        </div>
      </div>

      <div className="mt-4">
        {editandoNotas ? (
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
            <textarea
              rows={3}
              value={notasValor}
              onChange={(e) => setNotasValor(e.target.value)}
              placeholder="Notas del cliente…"
              className="input w-full text-sm"
              autoFocus
            />
            <div className="mt-2 flex justify-end gap-2">
              <button onClick={() => setEditandoNotas(false)} className="btn-outline gap-1.5 px-3 py-1.5 text-xs">
                <X size={13} /> Cancelar
              </button>
              <button onClick={guardarNotas} disabled={guardandoNotas} className="btn-primary gap-1.5 px-3 py-1.5 text-xs">
                <Check size={13} /> {guardandoNotas ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        ) : cliente.notas ? (
          <div className="group flex items-start justify-between gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
            <p className="text-sm text-slate-600 dark:text-slate-300">{cliente.notas}</p>
            <button onClick={iniciarEdicionNotas} title="Editar nota" aria-label="Editar nota" className="row-icon-btn shrink-0">
              <Pencil size={13} />
            </button>
          </div>
        ) : (
          <button onClick={iniciarEdicionNotas} className="link-muted inline-flex items-center gap-1.5 text-sm">
            <Plus size={14} /> Agregar nota
          </button>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Citas ({citasDelCliente.length})</h2>
        {citasDelCliente.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">Primera vez — todavía no tiene citas registradas.</p>
        ) : (
          <>
            <ul className="mt-2 space-y-2">
              {citasVisibles.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
                  <div>
                    <p className="text-slate-700 dark:text-slate-200">{formatearFecha(c.fechaHora)}</p>
                    {c.motivo && <p className="text-xs text-slate-400 dark:text-slate-500">{c.motivo}</p>}
                  </div>
                  <span className={`badge ${ESTADO_CITA_BADGE[c.estado] ?? "badge-neutral"}`}>{ESTADO_CITA_LABEL[c.estado] ?? c.estado}</span>
                </li>
              ))}
            </ul>
            <Pagination pagina={paginaCitas} totalPaginas={totalPaginasCitas} onCambiar={setPaginaCitas} />
          </>
        )}
      </div>

      {recetasDelCliente.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recetas ({recetasDelCliente.length})</h2>
          <ul className="mt-2 space-y-3">
            {recetasDelCliente.map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-100 p-3 text-sm dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{formatearFecha(r.fecha)}</span>
                  <span className="text-slate-400 dark:text-slate-500">{r.tipo}</span>
                </div>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[320px] text-xs">
                    <thead>
                      <tr className="text-slate-400 dark:text-slate-500">
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
                {r.dip != null && <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">DIP: {r.dip} mm</p>}
                {r.notas && (
                  <p className="mt-1.5 rounded bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">{r.notas}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Exámenes optométricos ({examenesDelCliente.length})</h2>
          <button onClick={() => setAbiertoExamen(true)} className="btn-outline gap-1.5 px-3 py-1.5 text-xs">
            <Plus size={13} /> Nuevo examen
          </button>
        </div>
        {examenesDelCliente.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">Todavía no tiene exámenes registrados.</p>
        ) : (
          <>
            <ul className="mt-2 space-y-3">
              {examenesVisibles.map((ex) => (
                <li key={ex.id} className="rounded-lg border border-slate-100 p-3 text-sm dark:border-slate-800">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{formatearFecha(ex.fecha)}</span>

                  {/* Desktop: tabla comparativa OD/OI. Mobile: 2 tarjetas apiladas
                      (evita el scroll horizontal de una tabla de 6 columnas en pantallas angostas). */}
                  <div className="mt-2 hidden overflow-x-auto sm:block">
                    <table className="w-full min-w-[360px] text-xs">
                      <thead>
                        <tr className="text-slate-400 dark:text-slate-500">
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
      </div>

      {ventasDelCliente.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Compras ({ventasDelCliente.length})</h2>
          <ul className="mt-2 space-y-1.5">
            {ventasDelCliente.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
                <div className="min-w-0">
                  <p className="text-slate-700 dark:text-slate-200">{formatearFecha(v.fecha)}</p>
                  <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                    {ventaItems.filter((it) => it.ventaId === v.id).map((it) => it.descripcion).join(", ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-medium text-slate-700 dark:text-slate-200">S/ {v.total.toFixed(2)}</span>
                  <button
                    onClick={() => imprimirRecibo(v)}
                    title="Reimprimir recibo"
                    aria-label={`Reimprimir recibo de la compra del ${formatearFecha(v.fecha)}`}
                    className="row-icon-btn"
                  >
                    <Printer size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {esAdmin && historialCambios.length > 0 && (
        <div className="mt-8">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <History size={15} /> Historial de cambios
          </h2>
          <ul className="mt-2 space-y-1.5">
            {historialCambios.map((h) => (
              <li key={h.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700 dark:text-slate-200">{ACCION_LABEL[h.accion] ?? h.accion}</span>
                <span className="text-slate-400 dark:text-slate-500">{formatearFechaHora(h.ts)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ClienteFormSlideOver estado={formEstado} />

      <ConfirmDialog
        abierto={confirmarEliminar}
        titulo="¿Eliminar cliente?"
        mensaje={`${cliente.nombres} ${cliente.apellidos} pasará a la papelera de Clientes: podrás restaurarlo durante 30 días, después se elimina definitivamente (junto con sus citas y recetas).`}
        confirmarTexto="Eliminar"
        onConfirmar={eliminarCliente}
        onCancelar={() => setConfirmarEliminar(false)}
      />

      <SlideOver abierto={abiertoExamen} onClose={() => setAbiertoExamen(false)} titulo="Nuevo examen optométrico">
        <form onSubmit={onSubmitExamen} className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Agudeza visual</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">OD sin corrección</label>
              <input placeholder="20/40" value={examenForm.odAvSc ?? ""} onChange={(e) => setExamenForm({ ...examenForm, odAvSc: e.target.value || undefined })} className="input mt-1 w-full text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">OD con corrección</label>
              <input placeholder="20/20" value={examenForm.odAvCc ?? ""} onChange={(e) => setExamenForm({ ...examenForm, odAvCc: e.target.value || undefined })} className="input mt-1 w-full text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">OI sin corrección</label>
              <input placeholder="20/50" value={examenForm.oiAvSc ?? ""} onChange={(e) => setExamenForm({ ...examenForm, oiAvSc: e.target.value || undefined })} className="input mt-1 w-full text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">OI con corrección</label>
              <input placeholder="20/20" value={examenForm.oiAvCc ?? ""} onChange={(e) => setExamenForm({ ...examenForm, oiAvCc: e.target.value || undefined })} className="input mt-1 w-full text-sm" />
            </div>
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Queratometría</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">OD K1</label>
              <input type="number" step="0.01" value={examenForm.odK1 ?? ""} onChange={(e) => setExamenForm({ ...examenForm, odK1: e.target.value ? Number(e.target.value) : undefined })} className="input mt-1 w-full text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">OD K2</label>
              <input type="number" step="0.01" value={examenForm.odK2 ?? ""} onChange={(e) => setExamenForm({ ...examenForm, odK2: e.target.value ? Number(e.target.value) : undefined })} className="input mt-1 w-full text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">OD eje</label>
              <input type="number" min={0} max={180} value={examenForm.odEjeK ?? ""} onChange={(e) => setExamenForm({ ...examenForm, odEjeK: e.target.value ? Number(e.target.value) : undefined })} className="input mt-1 w-full text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">OI K1</label>
              <input type="number" step="0.01" value={examenForm.oiK1 ?? ""} onChange={(e) => setExamenForm({ ...examenForm, oiK1: e.target.value ? Number(e.target.value) : undefined })} className="input mt-1 w-full text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">OI K2</label>
              <input type="number" step="0.01" value={examenForm.oiK2 ?? ""} onChange={(e) => setExamenForm({ ...examenForm, oiK2: e.target.value ? Number(e.target.value) : undefined })} className="input mt-1 w-full text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">OI eje</label>
              <input type="number" min={0} max={180} value={examenForm.oiEjeK ?? ""} onChange={(e) => setExamenForm({ ...examenForm, oiEjeK: e.target.value ? Number(e.target.value) : undefined })} className="input mt-1 w-full text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Anamnesis</label>
            <textarea rows={3} value={examenForm.anamnesis ?? ""} onChange={(e) => setExamenForm({ ...examenForm, anamnesis: e.target.value || undefined })} className="input mt-1 w-full text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Notas (opcional)</label>
            <textarea rows={2} value={examenForm.notas ?? ""} onChange={(e) => setExamenForm({ ...examenForm, notas: e.target.value || undefined })} className="input mt-1 w-full text-sm" />
          </div>
          <button type="submit" disabled={guardandoExamen} className="btn-primary w-full">
            {guardandoExamen ? "Guardando…" : "Guardar examen"}
          </button>
        </form>
      </SlideOver>
    </main>
  );
}
