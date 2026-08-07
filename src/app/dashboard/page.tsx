"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Users, CalendarDays, PackageX, ShoppingCart, Pencil, Check, Contact, X } from "lucide-react";
import { Skeleton } from "boneyard-js/react";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { CoachTooltip } from "@/components/dashboard/CoachTooltip";
import { ChangelogBanner } from "@/components/dashboard/ChangelogBanner";
import { SlideOver } from "@/components/ui/SlideOver";
import { NAV, aplanarNav } from "@/lib/dashboard-nav";
import { formatearFechaPE } from "@/lib/formato/date";
import { nombrePlanSuscripcion } from "@/lib/precios";
import { nombreRol } from "@/lib/roles";
import { puedeLeerModulo } from "@/lib/permisos";
import { calcularSeguimientos, calcularRecallControlAnual, seguimientosProximos, estaVencido, type Seguimiento } from "@/lib/seguimiento-clientes";

const TIPO_SEGUIMIENTO_LABEL: Record<Seguimiento["tipo"], string> = {
  reposicion: "reposición", garantia: "garantía", control_anual: "control anual",
};

const STATS = [
  { href: "/dashboard/clientes", label: "Clientes", icon: Users },
  { href: "/dashboard/citas", label: "Citas hoy", icon: CalendarDays },
  { href: "/dashboard/productos", label: "Stock bajo", icon: PackageX },
  { href: "/dashboard/ventas", label: "Ventas totales", icon: ShoppingCart },
] as const;

/* Selección por defecto de "Accesos rápidos" — secciones de alto uso que NO
   están ya cubiertas por las stats de arriba (Clientes/Citas/Stock/Ventas).
   El usuario ahora puede cambiar esta selección desde el lápiz de al lado
   del título (pedido explícito: "que sean configurables según la necesidad
   del cliente") — persistido en localStorage por negocio, mismo patrón que
   el selector de sede de DashboardTopbar.tsx. */
const ACCESOS_RAPIDOS_DEFECTO = ["/dashboard/cotizaciones", "/dashboard/proveedores", "/dashboard/productos"];
const ACCESOS_RAPIDOS_KEY = "accesos-rapidos";

function useAccesosRapidos(negocioId?: string): [string[], (hrefs: string[]) => void] {
  const [valor, setValor] = useState<string[]>(ACCESOS_RAPIDOS_DEFECTO);
  useEffect(() => {
    if (!negocioId) return;
    const guardado = window.localStorage.getItem(`${ACCESOS_RAPIDOS_KEY}:${negocioId}`);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage no existe en SSR
    setValor(guardado ? (JSON.parse(guardado) as string[]) : ACCESOS_RAPIDOS_DEFECTO);
  }, [negocioId]);
  function guardar(hrefs: string[]) {
    if (negocioId) window.localStorage.setItem(`${ACCESOS_RAPIDOS_KEY}:${negocioId}`, JSON.stringify(hrefs));
    setValor(hrefs);
  }
  return [valor, guardar];
}

/* Descarte de un aviso (stock bajo / seguimientos) persistido por
   negocio+"firma" del contenido — mismo patrón que ChangelogBanner.tsx, pero
   la firma es el listado de ids afectados (no una versión fija): si mañana
   cambia QUIÉN aparece en la lista (un producto nuevo con stock bajo, un
   seguimiento nuevo), la firma ya no calza con la guardada y el aviso vuelve
   a aparecer solo. Cerrar solo esconde la lista de HOY, no apaga el aviso
   para siempre — el usuario pidió que se pudieran quitar, no que dejen de
   avisar cuando de verdad cambia algo. */
function useAvisoDescartable(negocioId: string | undefined, clave: string, firma: string): [boolean, () => void] {
  const key = negocioId ? `aviso_${clave}_${negocioId}` : null;
  const [firmaCerrada, setFirmaCerrada] = useState<string | null>(null);
  useEffect(() => {
    if (!key) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage no existe en SSR
    setFirmaCerrada(window.localStorage.getItem(key));
  }, [key]);
  function cerrar() {
    if (key) window.localStorage.setItem(key, firma);
    setFirmaCerrada(firma);
  }
  return [firmaCerrada === firma, cerrar];
}

/* Resumen del dashboard: confirma que auth + tenant + roles + módulos de
   dominio funcionan de punta a punta, con accesos rápidos a cada módulo. */
export default function DashboardPage() {
  const { empleado } = useSession();
  const { negocio, suscripcion, clientes, citas, productos, ventas, ventaItems, recetas, examenesOptometricos, rolesPersonalizados, ready } = useData();
  const esAdmin = empleado?.rol === "administrador";
  const tienePermiso = (clave?: string) => !clave || puedeLeerModulo(empleado, rolesPersonalizados, clave);

  /* Catálogo completo de secciones elegibles como acceso rápido: toda la
     navegación del dashboard (misma fuente que el sidebar y el command
     palette) salvo Inicio, filtrado por lo que este empleado puede ver. */
  const catalogoAccesos = useMemo(
    () => aplanarNav(NAV).filter((i) => i.href !== "/dashboard" && (!i.soloAdmin || esAdmin) && tienePermiso(i.permiso)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tienePermiso se recalcula con empleado/esAdmin, ya listados
    [esAdmin, empleado],
  );
  const [accesosSeleccionados, guardarAccesos] = useAccesosRapidos(negocio?.id);
  const accesosVisibles = accesosSeleccionados
    .map((href) => catalogoAccesos.find((i) => i.href === href))
    .filter((i): i is (typeof catalogoAccesos)[number] => Boolean(i));

  const [editandoAccesos, setEditandoAccesos] = useState(false);
  const [seleccionBorrador, setSeleccionBorrador] = useState<string[]>([]);
  function abrirEditorAccesos() {
    setSeleccionBorrador(accesosSeleccionados);
    setEditandoAccesos(true);
  }
  function alternarAccesoBorrador(href: string) {
    setSeleccionBorrador((prev) => (prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]));
  }
  function guardarEditorAccesos() {
    guardarAccesos(seleccionBorrador);
    setEditandoAccesos(false);
  }

  const citasHoy = citas.filter((c) => c.fechaHora.slice(0, 10) === new Date().toISOString().slice(0, 10));
  const stockBajo = productos.filter((p) => p.stockActual <= p.stockMinimo);
  const valores = [clientes.length, citasHoy.length, stockBajo.length, ventas.length];
  const seguimientos = seguimientosProximos([
    ...calcularSeguimientos(ventas, ventaItems, productos),
    ...calcularRecallControlAnual(recetas, examenesOptometricos),
  ]);
  const nombrePorCliente = new Map(clientes.map((c) => [c.id, `${c.nombres} ${c.apellidos}`]));

  const firmaStockBajo = stockBajo.map((p) => p.id).sort().join(",");
  const [stockBajoDescartado, descartarStockBajo] = useAvisoDescartable(negocio?.id, "stockbajo", firmaStockBajo);
  const firmaSeguimientos = seguimientos.map((s) => `${s.clienteId}:${s.tipo}`).sort().join(",");
  const [seguimientosDescartado, descartarSeguimientos] = useAvisoDescartable(negocio?.id, "seguimientos", firmaSeguimientos);

  return (
    <main>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Hola, {empleado?.nombres || "—"}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">{negocio?.nombre} · rol {empleado?.rol ? nombreRol(empleado.rol) : "—"}</p>

      {suscripcion?.estado === "trial" && (
        <p className="badge badge-warning mt-4 px-3 py-1.5">
          Estás probando {nombrePlanSuscripcion(suscripcion.plan)} hasta el {formatearFechaPE(suscripcion.trialFin)}. Si no activas el pago, vuelves al plan Gratis.
        </p>
      )}
      {suscripcion?.estado === "vencida" && (
        <p className="badge badge-danger mt-4 px-3 py-1.5">
          Tu suscripción venció. <Link href="/dashboard/facturacion" className="ml-1 font-semibold transition-colors hover:text-red-900 dark:hover:text-red-200">Activa tu plan</Link>
        </p>
      )}

      {/* Alerta proactiva de stock bajo — el stat card de abajo ya cuenta
         cuántos productos están en ese estado, pero con el mismo peso visual
         que "Clientes" o "Ventas totales" pasa desapercibido. Este banner
         nombra los productos afectados, igual que las alertas de
         trial/vencido de arriba. */}
      {stockBajo.length > 0 && !stockBajoDescartado && (
        /* items-center en todo el bloque (contenedor Y el Link interno):
           el ícono queda centrado contra el texto y contra la X, sin
           importar cuántas líneas ocupe el texto envuelto. */
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <Link href="/dashboard/productos" className="flex flex-1 items-center gap-2 transition-colors hover:text-amber-950 dark:hover:text-amber-200">
            <PackageX size={20} className="shrink-0" />
            <span>
              <strong>{stockBajo.length}</strong> {stockBajo.length === 1 ? "producto está" : "productos están"} con stock bajo:{" "}
              {stockBajo.slice(0, 3).map((p) => p.nombre).join(", ")}
              {stockBajo.length > 3 ? ` y ${stockBajo.length - 3} más` : ""}.
            </span>
          </Link>
          <button
            onClick={descartarStockBajo}
            aria-label="Descartar aviso"
            className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded text-amber-700/70 transition-colors hover:bg-amber-100 dark:text-amber-400/70 dark:hover:bg-amber-900/30"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Reposición de lentes de contacto + garantías por vencer + recall de
         control anual — mismo patrón que el banner de stock bajo: se
         calcula solo (ver lib/seguimiento-clientes.ts), nadie tiene que
         acordarse de revisar a mano quién le toca reponer, a quién se le
         vence una garantía, o a quién le toca su control anual. El envío
         del recordatorio por WhatsApp sigue siendo manual (un clic desde la
         ficha del cliente) — automatizarlo del todo necesita la API real de
         WhatsApp Business, fuera de alcance de este MVP (ver citas). */}
      {seguimientos.length > 0 && !seguimientosDescartado && (
        /* Mismo criterio que el banner de stock bajo: items-center en todo
           el bloque para que ícono, texto (envuelva las líneas que envuelva)
           y la X queden centrados entre sí. */
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300">
          <Link href="/dashboard/clientes" className="flex flex-1 items-center gap-2 transition-colors hover:text-sky-950 dark:hover:text-sky-200">
            <Contact size={20} className="shrink-0" />
            <span>
              <strong>{seguimientos.length}</strong> {seguimientos.length === 1 ? "seguimiento" : "seguimientos"} de clientes{" "}
              {seguimientos.some((s) => estaVencido(s.fecha)) ? "vencidos o próximos" : "próximos"}:{" "}
              {seguimientos.slice(0, 3).map((s) => `${nombrePorCliente.get(s.clienteId) ?? "Cliente"} (${TIPO_SEGUIMIENTO_LABEL[s.tipo]})`).join(", ")}
              {seguimientos.length > 3 ? ` y ${seguimientos.length - 3} más` : ""}.
            </span>
          </Link>
          <button
            onClick={descartarSeguimientos}
            aria-label="Descartar aviso"
            className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded text-sky-700/70 transition-colors hover:bg-sky-100 dark:text-sky-400/70 dark:hover:bg-sky-900/30"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <ChangelogBanner negocioId={negocio?.id} />
      <OnboardingChecklist />
      <CoachTooltip />

      <Skeleton name="dashboard-stats" loading={!ready}>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATS.map((s, i) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href} className="card flex flex-col gap-2 p-4 transition-shadow hover:shadow-md">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light text-primary">
                <Icon size={18} />
              </div>
              <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{valores[i]}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{s.label}</div>
            </Link>
          );
        })}
      </div>
      </Skeleton>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Accesos rápidos</h2>
        <button onClick={abrirEditorAccesos} className="row-icon-btn" title="Personalizar accesos rápidos" aria-label="Personalizar accesos rápidos">
          <Pencil size={14} />
        </button>
      </div>
      <Skeleton name="dashboard-accesos-rapidos" loading={!ready}>
      {accesosVisibles.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">
          Sin accesos elegidos.{" "}
          <button onClick={abrirEditorAccesos} className="link font-medium">Elegir accesos rápidos</button>
        </p>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {accesosVisibles.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href} href={a.href}
                className="card flex items-center gap-3 p-3 text-sm font-medium text-slate-700 transition-shadow hover:shadow-md dark:text-slate-200"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
                  <Icon size={16} />
                </div>
                {a.label}
              </Link>
            );
          })}
        </div>
      )}
      </Skeleton>

      <SlideOver abierto={editandoAccesos} onClose={() => setEditandoAccesos(false)} titulo="Personalizar accesos rápidos">
        <p className="text-sm text-slate-500 dark:text-slate-400">Elige qué secciones aparecen como accesos rápidos en Inicio.</p>
        <ul className="mt-3 space-y-1">
          {catalogoAccesos.map((item) => {
            const Icon = item.icon;
            const marcado = seleccionBorrador.includes(item.href);
            return (
              <li key={item.href}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                  <input type="checkbox" checked={marcado} onChange={() => alternarAccesoBorrador(item.href)} className="checkbox" />
                  <Icon size={16} className="text-slate-400" />
                  {item.label}
                  {item.grupo && <span className="ml-auto text-xs text-slate-500 dark:text-slate-500">{item.grupo}</span>}
                </label>
              </li>
            );
          })}
        </ul>
        <button onClick={guardarEditorAccesos} className="btn-primary mt-4 h-11 w-full gap-1.5 sm:h-auto">
          <Check size={15} /> Guardar
        </button>
      </SlideOver>
    </main>
  );
}
