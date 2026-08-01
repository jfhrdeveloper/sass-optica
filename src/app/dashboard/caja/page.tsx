"use client";

import { useMemo, useState } from "react";
import { Download, Printer, Wallet, Plus, X } from "lucide-react";
import { useData, type ItemAperturaCaja } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { formatearFechaHora } from "@/lib/formato/date";
import { calcularCuadreCaja, sumaDesglose, efectivoDeDesglose } from "@/lib/caja";
import { construirHtmlConstanciaCierre, construirHtmlListadoCaja } from "@/lib/constancia-caja";
import { generarExcelHistorialCaja } from "@/lib/caja-excel";
import { descargarBlob } from "@/lib/archivo";
import { descargarCSV } from "@/lib/csv";
import { permisosEfectivos } from "@/lib/permisos";

const METODOS_APERTURA_SUGERIDOS = ["Efectivo", "Tarjeta", "Yape", "Plin", "Transferencia"];
const ITEM_APERTURA_VACIO: ItemAperturaCaja = { metodo: "Efectivo", monto: 0 };

/* Operativo (como ventas/citas): puede_gestionar() o el permiso granular
   'gastos' ya existente (empleados/page.tsx ya lo rotula "Gastos y caja").
   La ruta de nav queda abierta (sin `permiso`), el control real vive acá +
   en la RLS de `cajas` — mismo criterio que /dashboard/laboratorio. */
export default function CajaPage() {
  const { cajas, ventas, negocio, empleados, plantillasRol, abrirCaja, cerrarCaja } = useData();
  const { empleado } = useSession();
  const toast = useToast();
  const puedeEditar = empleado?.rol === "administrador" || empleado?.rol === "encargado" || permisosEfectivos(empleado, plantillasRol).gastos === true;

  const cajaAbierta = cajas.find((c) => c.estado === "abierta");
  const historial = [...cajas].filter((c) => c.estado === "cerrada").sort((a, b) => (b.fechaCierre ?? "").localeCompare(a.fechaCierre ?? ""));
  const { pagina, setPagina, totalPaginas, visibles } = usePaginado(historial);

  /* Antes "Monto inicial" era un solo número asumido 100% efectivo — ahora
     es una lista de {método, monto} de largo variable (botón "+ Añadir
     ítem" en el form), para el caso real de abrir el turno con saldo ya
     repartido entre efectivo/Yape/etc. `sumaDesglose`/`efectivoDeDesglose`
     (lib/caja.ts) hacen el auto-total y separan cuánto de eso es efectivo
     físico (lo único que se cuenta al cerrar). */
  const [desgloseApertura, setDesgloseApertura] = useState<ItemAperturaCaja[]>([{ ...ITEM_APERTURA_VACIO }]);
  const [montoContado, setMontoContado] = useState(0);
  const [abriendoForm, setAbriendoForm] = useState(false);
  const [cerrandoForm, setCerrandoForm] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const totalApertura = useMemo(() => sumaDesglose(desgloseApertura), [desgloseApertura]);

  function agregarItemApertura() {
    setDesgloseApertura((prev) => [...prev, { metodo: "", monto: 0 }]);
  }
  function quitarItemApertura(i: number) {
    setDesgloseApertura((prev) => prev.filter((_, idx) => idx !== i));
  }
  function actualizarItemApertura(i: number, patch: Partial<ItemAperturaCaja>) {
    setDesgloseApertura((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  const cuadrePreview = useMemo(() => {
    if (!cajaAbierta) return null;
    const efectivoInicial = efectivoDeDesglose(cajaAbierta.desgloseApertura, cajaAbierta.montoInicial);
    return calcularCuadreCaja(ventas, efectivoInicial, cajaAbierta.fechaApertura.slice(0, 10), new Date().toISOString().slice(0, 10), cajaAbierta.sucursalId);
  }, [ventas, cajaAbierta]);

  async function onAbrir(e: React.FormEvent) {
    e.preventDefault();
    const items = desgloseApertura.filter((it) => it.metodo.trim() && it.monto > 0);
    setGuardando(true);
    await abrirCaja(items, empleado?.id);
    setGuardando(false);
    setAbriendoForm(false);
    setDesgloseApertura([{ ...ITEM_APERTURA_VACIO }]);
    toast("Caja abierta.");
  }

  async function onCerrar(e: React.FormEvent) {
    e.preventDefault();
    if (!cajaAbierta) return;
    setGuardando(true);
    await cerrarCaja(cajaAbierta.id, montoContado, empleado?.id);
    setGuardando(false);
    setCerrandoForm(false);
    setMontoContado(0);
    toast("Caja cerrada.");
  }

  function nombreEmpleado(id?: string): string | undefined {
    if (!id) return undefined;
    const e = empleados.find((x) => x.id === id);
    return e ? `${e.nombres} ${e.apellidos}` : undefined;
  }

  function imprimirConstancia(id: string) {
    const caja = cajas.find((c) => c.id === id);
    if (!caja) return;
    const html = construirHtmlConstanciaCierre({
      negocioNombre: negocio?.nombre ?? "Óptica",
      empleadoAperturaNombre: nombreEmpleado(caja.empleadoAperturaId),
      empleadoCierreNombre: nombreEmpleado(caja.empleadoCierreId),
      caja,
    });
    const ventana = window.open("", "_blank");
    if (!ventana) return;
    ventana.document.write(html);
    ventana.document.close();
    ventana.print();
  }

  /* Antes solo había CSV plano (descargarCSV, abajo) — Excel con diseño real
     (colores/anchos/formato de moneda, ver lib/caja-excel.ts) y PDF del
     historial completo (no solo un cierre, ver construirHtmlListadoCaja)
     son los dos formatos nuevos pedidos por el usuario. */
  const [exportandoExcel, setExportandoExcel] = useState(false);
  async function exportarExcel() {
    setExportandoExcel(true);
    const blob = await generarExcelHistorialCaja(negocio?.nombre ?? "Óptica", historial);
    setExportandoExcel(false);
    descargarBlob("historial-caja.xlsx", blob);
  }

  function imprimirListado() {
    const html = construirHtmlListadoCaja(negocio?.nombre ?? "Óptica", historial);
    const ventana = window.open("", "_blank");
    if (!ventana) { toast("El navegador bloqueó la ventana de impresión.", "error"); return; }
    ventana.document.write(html);
    ventana.document.close();
    ventana.focus();
    ventana.print();
  }

  function exportarCSV() {
    descargarCSV("historial-caja", [
      ["Apertura", "Cierre", "Monto inicial", "Efectivo", "Tarjeta", "Yape", "Plin", "Transferencia", "Esperado", "Contado", "Diferencia"],
      ...historial.map((c) => [
        formatearFechaHora(c.fechaApertura), c.fechaCierre ? formatearFechaHora(c.fechaCierre) : "—",
        c.montoInicial.toFixed(2), c.totalEfectivo.toFixed(2), c.totalTarjeta.toFixed(2),
        c.totalYape.toFixed(2), c.totalPlin.toFixed(2), c.totalTransferencia.toFixed(2),
        c.montoEfectivoEsperado.toFixed(2), (c.montoEfectivoContado ?? 0).toFixed(2), (c.diferencia ?? 0).toFixed(2),
      ]),
    ]);
  }

  return (
    <main>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Caja</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Apertura y cierre diario, con cuadre por método de pago contra las ventas del turno.
      </p>

      <div className="card mt-4 p-4">
        {cajaAbierta ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <span className="badge badge-success">Caja abierta</span>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Desde {formatearFechaHora(cajaAbierta.fechaApertura)} · Monto inicial S/ {cajaAbierta.montoInicial.toFixed(2)}
                  {cajaAbierta.desgloseApertura.length > 1 && (
                    <span className="text-slate-400 dark:text-slate-500">
                      {" "}({cajaAbierta.desgloseApertura.map((it) => `${it.metodo}: S/ ${it.monto.toFixed(2)}`).join(" · ")})
                    </span>
                  )}
                </p>
              </div>
              {puedeEditar && !cerrandoForm && (
                <button onClick={() => setCerrandoForm(true)} className="btn-primary">Cerrar caja</button>
              )}
            </div>

            {cuadrePreview && (
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div><span className="text-slate-400 dark:text-slate-500">Efectivo</span><p className="font-medium text-slate-900 dark:text-slate-100">S/ {cuadrePreview.totalEfectivo.toFixed(2)}</p></div>
                <div><span className="text-slate-400 dark:text-slate-500">Tarjeta</span><p className="font-medium text-slate-900 dark:text-slate-100">S/ {cuadrePreview.totalTarjeta.toFixed(2)}</p></div>
                <div><span className="text-slate-400 dark:text-slate-500">Yape</span><p className="font-medium text-slate-900 dark:text-slate-100">S/ {cuadrePreview.totalYape.toFixed(2)}</p></div>
                <div><span className="text-slate-400 dark:text-slate-500">Plin</span><p className="font-medium text-slate-900 dark:text-slate-100">S/ {cuadrePreview.totalPlin.toFixed(2)}</p></div>
                <div><span className="text-slate-400 dark:text-slate-500">Transferencia</span><p className="font-medium text-slate-900 dark:text-slate-100">S/ {cuadrePreview.totalTransferencia.toFixed(2)}</p></div>
                <div><span className="text-slate-400 dark:text-slate-500">Efectivo esperado</span><p className="font-semibold text-primary">S/ {cuadrePreview.montoEfectivoEsperado.toFixed(2)}</p></div>
              </div>
            )}

            {cerrandoForm && cuadrePreview && (
              <form onSubmit={onCerrar} className="mt-4 max-w-xs space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Efectivo contado</label>
                  <input type="number" step="0.01" required value={montoContado} onChange={(e) => setMontoContado(Number(e.target.value))} className="input mt-1 w-full text-sm" />
                </div>
                <p className={`text-sm font-medium ${montoContado - cuadrePreview.montoEfectivoEsperado === 0 ? "text-slate-500 dark:text-slate-400" : "text-red-600 dark:text-red-400"}`}>
                  Diferencia: {montoContado - cuadrePreview.montoEfectivoEsperado >= 0 ? "+" : ""}S/ {(montoContado - cuadrePreview.montoEfectivoEsperado).toFixed(2)}
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setCerrandoForm(false)} className="btn-outline flex-1">Cancelar</button>
                  <button type="submit" disabled={guardando} className="btn-primary flex-1">{guardando ? "Cerrando…" : "Confirmar cierre"}</button>
                </div>
              </form>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <span className="badge badge-neutral">Sin caja abierta</span>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Abre la caja al empezar el turno para registrar el monto inicial.</p>
              </div>
              {puedeEditar && !abriendoForm && (
                <button onClick={() => setAbriendoForm(true)} className="btn-primary gap-1.5"><Wallet size={16} /> Abrir caja</button>
              )}
            </div>
            {abriendoForm && (
              <form onSubmit={onAbrir} className="mt-4 max-w-sm space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Monto inicial por método</label>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                    Si al empezar el turno ya hay saldo en más de un medio (efectivo, Yape, etc.), añade un ítem por cada uno.
                  </p>
                  <datalist id="metodos-apertura-caja">
                    {METODOS_APERTURA_SUGERIDOS.map((m) => <option key={m} value={m} />)}
                  </datalist>
                  <div className="mt-2 space-y-2">
                    {desgloseApertura.map((it, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          list="metodos-apertura-caja"
                          placeholder="Método (ej. Efectivo)"
                          value={it.metodo}
                          onChange={(e) => actualizarItemApertura(i, { metodo: e.target.value })}
                          className="input flex-1 text-sm"
                        />
                        <input
                          type="number" step="0.01" min={0}
                          placeholder="0.00"
                          value={it.monto || ""}
                          onChange={(e) => actualizarItemApertura(i, { monto: Number(e.target.value) })}
                          className="input w-24 text-sm"
                        />
                        <button
                          type="button" onClick={() => quitarItemApertura(i)}
                          disabled={desgloseApertura.length === 1}
                          title="Quitar ítem" aria-label="Quitar ítem"
                          className="row-icon-btn row-icon-btn-danger disabled:opacity-30"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={agregarItemApertura} className="link mt-2 inline-flex items-center gap-1 text-xs font-medium">
                    <Plus size={13} /> Añadir ítem
                  </button>
                  <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">Total: S/ {totalApertura.toFixed(2)}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAbriendoForm(false)} className="btn-outline flex-1">Cancelar</button>
                  <button type="submit" disabled={guardando || totalApertura <= 0} className="btn-primary flex-1">{guardando ? "Abriendo…" : "Abrir caja"}</button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      <h2 className="mt-8 text-sm font-semibold text-slate-700 dark:text-slate-200">Historial de cierres</h2>
      <div className="table-card mt-2">
        <div className="table-filter-bar justify-end">
          <button onClick={exportarCSV} disabled={historial.length === 0} className="btn-outline gap-1.5 text-sm">
            <Download size={15} /> CSV
          </button>
          <button onClick={exportarExcel} disabled={historial.length === 0 || exportandoExcel} className="btn-outline gap-1.5 text-sm">
            <Download size={15} /> {exportandoExcel ? "Generando…" : "Excel"}
          </button>
          <button onClick={imprimirListado} disabled={historial.length === 0} className="btn-outline gap-1.5 text-sm">
            <Printer size={15} /> PDF
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Cierre</th>
                <th className="table-head-cell">Total ventas</th>
                <th className="table-head-cell">Esperado</th>
                <th className="table-head-cell">Contado</th>
                <th className="table-head-cell">Diferencia</th>
                <th className="table-head-cell text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((c) => {
                const totalVentas = c.totalEfectivo + c.totalTarjeta + c.totalYape + c.totalPlin + c.totalTransferencia;
                const diferencia = c.diferencia ?? 0;
                return (
                  <tr key={c.id} className="table-row">
                    <td className="table-body-cell text-slate-600 dark:text-slate-300">{c.fechaCierre ? formatearFechaHora(c.fechaCierre) : "—"}</td>
                    <td className="table-body-cell text-slate-600 dark:text-slate-300">S/ {totalVentas.toFixed(2)}</td>
                    <td className="table-body-cell text-slate-600 dark:text-slate-300">S/ {c.montoEfectivoEsperado.toFixed(2)}</td>
                    <td className="table-body-cell text-slate-600 dark:text-slate-300">S/ {(c.montoEfectivoContado ?? 0).toFixed(2)}</td>
                    <td className={`table-body-cell font-medium ${diferencia === 0 ? "text-slate-600 dark:text-slate-300" : "text-red-600 dark:text-red-400"}`}>
                      {diferencia >= 0 ? "+" : ""}S/ {diferencia.toFixed(2)}
                    </td>
                    <td className="table-body-cell text-right">
                      <button onClick={() => imprimirConstancia(c.id)} title="Imprimir constancia" aria-label="Imprimir constancia" className="row-icon-btn">
                        <Printer size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {historial.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="table-empty">Sin cierres de caja todavía.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
      </div>
    </main>
  );
}
