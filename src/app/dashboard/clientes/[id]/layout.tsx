"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { User, History, Pencil, Plus, ArrowLeft, Trash2, Check, X, Contact } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useClienteForm } from "@/lib/hooks/useClienteForm";
import { ClienteFormSlideOver } from "@/components/clientes/ClienteFormSlideOver";
import { BotonWhatsApp } from "@/components/clientes/BotonWhatsApp";
import { WhatsAppIcon } from "@/components/landing/WhatsAppIcon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatearFecha, formatearFechaHora } from "@/lib/formato/date";
import { createClient } from "@/lib/supabase/client";
import { isMockMode } from "@/lib/mock/mock-mode";
import { urlWhatsAppContacto } from "@/lib/contacto";
import { calcularSeguimientos, calcularRecallControlAnual, estaVencido, type Seguimiento } from "@/lib/seguimiento-clientes";
import { SettingsTabs, type TabDeAjustes } from "@/components/dashboard/SettingsTabs";

type EntradaAuditoria = { id: number; ts: string; accion: string };
const ACCION_LABEL: Record<string, string> = { INSERT: "Creado", UPDATE: "Editado", DELETE: "Eliminado" };

/* Shell compartido de la ficha de cliente — antes todo (datos, Citas, Recetas,
   Exámenes, Compras, Historial) vivía apilado en un solo page.tsx; ahora Citas
   /Recetas/Exámenes/Compras son 4 rutas reales bajo este layout (mismo patrón
   que SettingsTabs ya usa en /dashboard/ajustes: pestañas = URLs de verdad,
   no estado de cliente — pedido explícito del usuario, "similar a
   Administración > Ajustes"). Lo que NO es específico de una pestaña (header,
   datos de contacto, notas, alertas de seguimiento, historial de auditoría)
   se queda acá para no repetirlo en las 4 páginas hijas. */
export default function ClienteDetalleLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { negocio, clientes, ventas, ventaItems, productos, recetas, examenesOptometricos, deleteCliente, updateCliente } = useData();
  const { empleado } = useSession();
  const esAdmin = empleado?.rol === "administrador";
  const formEstado = useClienteForm();

  const cliente = clientes.find((c) => c.id === params.id) ?? null;

  /* Orden cronológico (fecha ascendente) — antes quedaban agrupados por
     tipo (reposición/garantía primero, control anual al final) porque cada
     función interna ordena SU propia lista pero el spread nunca reordenaba
     el resultado combinado; pedido explícito del usuario. */
  const seguimientosDelCliente = cliente
    ? [...calcularSeguimientos(ventas, ventaItems, productos), ...calcularRecallControlAnual(recetas, examenesOptometricos)]
        .filter((s) => s.clienteId === cliente.id)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
    : [];
  /* Con varios seguimientos activos, mostrarlos TODOS siempre empujaba el
     resto de la ficha (contacto, notas, pestañas) muy abajo — pedido
     explícito del usuario: solo los VENCIDOS quedan siempre visibles (son
     los accionables de verdad), el resto se colapsa detrás de "+N más". Si
     no hay ninguno vencido, se muestran los 2 más próximos igual (una
     sección vacía con solo un link "+N más" no da contexto de qué son). */
  const [verTodosSeguimientos, setVerTodosSeguimientos] = useState(false);
  const seguimientosVencidos = seguimientosDelCliente.filter((s) => estaVencido(s.fecha));
  const seguimientosSiempreVisibles = seguimientosVencidos.length > 0 ? seguimientosVencidos : seguimientosDelCliente.slice(0, 2);
  const seguimientosColapsados = seguimientosDelCliente.filter((s) => !seguimientosSiempreVisibles.includes(s));
  const seguimientosAMostrar = verTodosSeguimientos ? seguimientosDelCliente : seguimientosSiempreVisibles;

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

  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  async function eliminarCliente() {
    if (!cliente) return;
    setConfirmarEliminar(false);
    await deleteCliente(cliente.id);
    toast(`${cliente.nombres} eliminado.`);
    router.push("/dashboard/clientes");
  }

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

  const tabs: TabDeAjustes[] = [
    { href: `/dashboard/clientes/${cliente.id}`, label: "Citas" },
    { href: `/dashboard/clientes/${cliente.id}/recetas`, label: "Recetas" },
    { href: `/dashboard/clientes/${cliente.id}/examenes`, label: "Exámenes optométricos" },
    { href: `/dashboard/clientes/${cliente.id}/compras`, label: "Compras" },
  ];

  return (
    <main>
      <Link href="/dashboard/clientes" className="link inline-flex items-center gap-1.5 text-sm font-medium">
        <ArrowLeft size={15} /> Clientes
      </Link>

      <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
            <User size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{cliente.nombres} {cliente.apellidos}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-500">{cliente.documentoTipo} {cliente.documentoNumero ?? "—"}</p>
          </div>
        </div>
        <div className="flex w-full gap-2 sm:w-auto sm:shrink-0">
          <button onClick={() => formEstado.editar(cliente)} className="btn-outline h-11 flex-1 basis-0 justify-center gap-1.5 sm:h-auto sm:w-auto sm:flex-none sm:basis-auto">
            <Pencil size={14} /> Editar
          </button>
          <button onClick={() => setConfirmarEliminar(true)} className="btn-outline h-11 flex-1 basis-0 justify-center gap-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 sm:h-auto sm:w-auto sm:flex-none sm:basis-auto">
            <Trash2 size={14} /> Eliminar
          </button>
        </div>
      </div>

      {seguimientosDelCliente.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {seguimientosAMostrar.map((s) => {
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
          {seguimientosColapsados.length > 0 && (
            <button
              type="button"
              onClick={() => setVerTodosSeguimientos((v) => !v)}
              className="link-muted text-sm font-medium"
            >
              {verTodosSeguimientos ? "Ver menos" : `+${seguimientosColapsados.length} más`}
            </button>
          )}
        </div>
      )}

      <div className="card mt-5 grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-500">Teléfono</div>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-slate-100">
            {cliente.telefono ?? "—"}
            {cliente.telefono && <BotonWhatsApp telefono={cliente.telefono} />}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-500">Email</div>
          <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{cliente.email ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-500">Nacimiento</div>
          <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            {cliente.fechaNacimiento ? formatearFecha(cliente.fechaNacimiento) : "—"}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-500">Dirección</div>
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
              className="input w-full"
              autoFocus
            />
            <div className="mt-2 flex justify-end gap-2">
              <button onClick={() => setEditandoNotas(false)} className="btn-outline h-11 gap-1.5 px-4 text-xs sm:h-auto">
                <X size={13} /> Cancelar
              </button>
              <button onClick={guardarNotas} disabled={guardandoNotas} className="btn-primary h-11 gap-1.5 px-4 text-xs sm:h-auto">
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

      <SettingsTabs tabs={tabs} />

      <div className="mt-4">{children}</div>

      {esAdmin && historialCambios.length > 0 && (
        <div className="mt-8">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <History size={15} /> Historial de cambios
          </h2>
          <ul className="mt-2 space-y-1.5">
            {historialCambios.map((h) => (
              <li key={h.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700 dark:text-slate-200">{ACCION_LABEL[h.accion] ?? h.accion}</span>
                <span className="text-slate-500 dark:text-slate-500">{formatearFechaHora(h.ts)}</span>
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
    </main>
  );
}
