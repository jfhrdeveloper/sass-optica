"use client";

import { useMemo, useState } from "react";
import { Receipt, Trash2, Printer } from "lucide-react";
import { useData, type Venta, type VentaItem } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { DateRangePicker } from "@/components/calendario/DateRangePicker";
import { buscarDescuentoValido, montoDescuento } from "@/lib/descuentos";
import { construirHtmlRecibo } from "@/lib/recibo";
import { contarVentasDelMes, puedeRegistrarVenta } from "@/lib/limites-plan";
import { LIMITE_VENTAS_MES_GRATIS } from "@/lib/precios";
import { LimitePlanBanner } from "@/components/dashboard/LimitePlanBanner";
import { CajaCerradaBanner } from "@/components/dashboard/CajaCerradaBanner";

const IGV = 0.18;
/* Recargo por pago con tarjeta (fee que suele trasladar el POS/pasarela al
   cliente) — opcional, se suma al total antes del cálculo de IGV solo si el
   usuario marca la casilla y el método de pago es "tarjeta". */
const RECARGO_TARJETA_PCT = 0.05;
const CLIENTE_NUEVO = "__nuevo__";
type ItemForm = Omit<VentaItem, "id" | "ventaId">;

/* Ver el mismo componente en cotizaciones/page.tsx: el placeholder/label
   nativo de un &lt;select&gt; desaparece al elegir un valor, así que sin esto no
   hay forma de recordar qué campo es cada uno una vez lleno. */
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
      {children}
    </div>
  );
}

export default function VentasPage() {
  const { ventas, ventaItems, clientes, productos, descuentos, negocio, suscripcion, cajas, addVenta, addCliente, anularVenta, updateDescuento } = useData();
  const cajaAbierta = cajas.some((c) => c.estado === "abierta");
  const { empleado } = useSession();
  const toast = useToast();

  /* Límite de 30 ventas/mes del plan Gratis (freemium) — este chequeo del
     lado del cliente es solo UX inmediata (evita que el usuario arme todo
     el ticket para recién enterarse); la aplicación real es el trigger de
     la base (bloquear_venta_limite_gratis, supabase-schema.sql), porque
     `ventas` se inserta directo desde el navegador y un chequeo solo-cliente
     sería bypasseable con la propia sesión del negocio. */
  const ventasEsteMes = useMemo(() => contarVentasDelMes(ventas), [ventas]);
  const alLimiteVentas = suscripcion?.plan === "gratis" && !puedeRegistrarVenta(suscripcion.plan, ventasEsteMes);
  const [clienteId, setClienteId] = useState("");
  const [nuevoCliente, setNuevoCliente] = useState({ nombres: "", apellidos: "", telefono: "" });
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [recargoTarjeta, setRecargoTarjeta] = useState(false);
  const [items, setItems] = useState<ItemForm[]>([]);
  const [modoItem, setModoItem] = useState<"catalogo" | "personalizado">("catalogo");
  const [productoId, setProductoId] = useState("");
  const [descripcionManual, setDescripcionManual] = useState("");
  const [precioManual, setPrecioManual] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [codigoDescuento, setCodigoDescuento] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmarAnular, setConfirmarAnular] = useState<Venta | null>(null);
  const [anulandoId, setAnulandoId] = useState<string | null>(null);

  const [filtroMetodo, setFiltroMetodo] = useState("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const itemsTotal = useMemo(() => items.reduce((acc, it) => acc + it.subtotal, 0), [items]);
  /* Antes el código de descuento era texto libre — el usuario tenía que
     conocer/adivinar el cupón de memoria. Este filtro es la misma regla de
     `buscarDescuentoValido` (lib/descuentos.ts) pero para LISTAR opciones
     válidas en vez de validar una ya tipeada; se mantienen separadas porque
     la validación final sigue pasando por `buscarDescuentoValido`. */
  const descuentosDisponibles = useMemo(
    () => descuentos.filter((d) => {
      if (!d.activo) return false;
      if (d.aplicaA !== "ambos" && d.aplicaA !== "ventas") return false;
      if (d.limiteUsos != null && d.usos >= d.limiteUsos) return false;
      const hoy = new Date().toISOString().slice(0, 10);
      if (d.vigenciaDesde && hoy < d.vigenciaDesde) return false;
      if (d.vigenciaHasta && hoy > d.vigenciaHasta) return false;
      return true;
    }),
    [descuentos],
  );
  const descuentoAplicado = useMemo(
    () => buscarDescuentoValido(descuentos, codigoDescuento, "ventas"),
    [descuentos, codigoDescuento],
  );
  const descuentoMonto = descuentoAplicado ? montoDescuento(descuentoAplicado, itemsTotal) : 0;
  /* El recargo solo se aplica si el método es tarjeta Y el usuario marcó la
     casilla (algunas ópticas absorben el fee, otras lo trasladan al
     cliente — no es automático por el solo hecho de pagar con tarjeta) y se
     calcula SOBRE el monto ya con descuento aplicado, no sobre el bruto. */
  const aplicaRecargoTarjeta = metodoPago === "tarjeta" && recargoTarjeta;
  const montoRecargoTarjeta = aplicaRecargoTarjeta ? (itemsTotal - descuentoMonto) * RECARGO_TARJETA_PCT : 0;
  const total = itemsTotal - descuentoMonto + montoRecargoTarjeta;
  const subtotal = total / (1 + IGV);
  const igv = total - subtotal;

  function agregarItem() {
    const producto = productos.find((p) => p.id === productoId);
    if (!producto) return;
    setItems([...items, {
      productoId: producto.id, descripcion: producto.nombre,
      cantidad, precioUnitario: producto.precioVenta, subtotal: producto.precioVenta * cantidad,
    }]);
    setProductoId("");
    setCantidad(1);
  }

  function agregarItemManual() {
    if (!descripcionManual.trim() || precioManual <= 0) return;
    setItems([...items, {
      descripcion: descripcionManual.trim(),
      cantidad, precioUnitario: precioManual, subtotal: precioManual * cantidad,
    }]);
    setDescripcionManual("");
    setPrecioManual(0);
    setCantidad(1);
  }

  function quitarItem(i: number) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  async function confirmarAnularAccion() {
    const v = confirmarAnular;
    if (!v) return;
    setConfirmarAnular(null);
    setAnulandoId(v.id);
    await anularVenta(v.id);
    setAnulandoId(null);
    toast("Venta anulada. El stock de sus productos fue devuelto.", "info");
  }

  async function confirmarVenta() {
    if (items.length === 0 || !cajaAbierta) return;
    setGuardando(true);

    let clienteIdFinal = clienteId;
    if (clienteId === CLIENTE_NUEVO) {
      if (!nuevoCliente.nombres.trim()) {
        setGuardando(false);
        toast("Ingresa al menos el nombre del cliente nuevo.", "error");
        return;
      }
      const idCreado = await addCliente({
        nombres: nuevoCliente.nombres.trim(),
        apellidos: nuevoCliente.apellidos.trim() || undefined,
        telefono: nuevoCliente.telefono.trim() || undefined,
      });
      if (!idCreado) {
        setGuardando(false);
        toast("No se pudo crear el cliente nuevo.", "error");
        return;
      }
      clienteIdFinal = idCreado;
    }

    const notasRecargo = aplicaRecargoTarjeta
      ? `Incluye recargo por tarjeta (${(RECARGO_TARJETA_PCT * 100).toFixed(0)}%): S/ ${montoRecargoTarjeta.toFixed(2)}`
      : undefined;
    const { id, error } = await addVenta(
      { clienteId: clienteIdFinal || undefined, empleadoId: empleado?.id, subtotal, igv, total, metodoPago, estado: "pagada", montoPagado: total, notas: notasRecargo },
      items,
    );
    setGuardando(false);
    if (!id) {
      toast(error ?? "No se pudo registrar la venta.", "error");
      return; // no limpia el ticket: el usuario no debería tener que rearmarlo
    }
    if (descuentoAplicado) {
      await updateDescuento(descuentoAplicado.id, { usos: descuentoAplicado.usos + 1 });
    }
    setItems([]);
    setClienteId("");
    setNuevoCliente({ nombres: "", apellidos: "", telefono: "" });
    setCodigoDescuento("");
    setRecargoTarjeta(false);
    toast("Venta registrada.");
  }

  const nombreCliente = (id?: string) => {
    if (!id) return "Sin cliente";
    const c = clientes.find((c) => c.id === id);
    return c ? `${c.nombres} ${c.apellidos}` : "—";
  };

  /* Ventana nueva con `document.write` + `print()` — patrón estándar para un
     recibo de una sola vez sin librería de PDF: el HTML ya trae su propio
     `<style>` (ver lib/recibo.ts), así que no depende de los estilos de la
     app ni se ve afectado por el dark mode del dashboard. */
  function imprimirRecibo(v: Venta) {
    const html = construirHtmlRecibo({
      negocioNombre: negocio?.nombre ?? "Óptica",
      negocioRuc: negocio?.ruc,
      clienteNombre: nombreCliente(v.clienteId),
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

  const ordenadas = [...ventas]
    .filter((v) => filtroMetodo === "todos" || v.metodoPago === filtroMetodo)
    .filter((v) => !desde || v.fecha.slice(0, 10) >= desde)
    .filter((v) => !hasta || v.fecha.slice(0, 10) <= hasta)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const { pagina, setPagina, totalPaginas, visibles } = usePaginado(ordenadas);

  return (
    <main>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Ventas</h1>

      {!cajaAbierta && (
        <div className="mt-4">
          <CajaCerradaBanner />
        </div>
      )}
      {alLimiteVentas && (
        <div className="mt-4">
          <LimitePlanBanner mensaje={`Llegaste a las ${LIMITE_VENTAS_MES_GRATIS} ventas de este mes en el plan Gratis.`} />
        </div>
      )}

      <div className="card mt-4 p-4">
        <h2 className="font-medium">Nueva venta</h2>
        <div className="mt-2">
          <Campo label="Cliente">
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="select w-full text-sm">
              <option value="">Sin cliente</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>)}
              <option value={CLIENTE_NUEVO}>+ Nuevo cliente</option>
            </select>
          </Campo>
          {/* Antes no había forma de registrar una venta a un cliente que
              todavía no existía sin salir a /dashboard/clientes y volver — el
              cliente se crea recién en confirmarVenta() (no al escribir acá),
              así cancelar la venta no deja un cliente huérfano a medio llenar. */}
          {clienteId === CLIENTE_NUEVO && (
            <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900">
              <Campo label="Nombres">
                <input value={nuevoCliente.nombres} onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombres: e.target.value })} className="input text-sm" />
              </Campo>
              <Campo label="Apellidos">
                <input value={nuevoCliente.apellidos} onChange={(e) => setNuevoCliente({ ...nuevoCliente, apellidos: e.target.value })} className="input text-sm" />
              </Campo>
              <Campo label="Teléfono">
                <input value={nuevoCliente.telefono} onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })} className="input text-sm" />
              </Campo>
              <p className="text-xs text-slate-400 dark:text-slate-500">Se crea al confirmar la venta.</p>
            </div>
          )}
        </div>

        <div className="mt-3 flex gap-1">
          <button
            type="button" onClick={() => setModoItem("catalogo")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${modoItem === "catalogo" ? "bg-primary-light text-primary" : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"}`}
          >
            Del catálogo
          </button>
          <button
            type="button" onClick={() => setModoItem("personalizado")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${modoItem === "personalizado" ? "bg-primary-light text-primary" : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"}`}
          >
            Personalizado
          </button>
        </div>

        {modoItem === "catalogo" ? (
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <Campo label="Producto">
              <select value={productoId} onChange={(e) => setProductoId(e.target.value)} className="select text-sm">
                <option value="">Elegir producto…</option>
                {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre} — S/ {p.precioVenta.toFixed(2)}</option>)}
              </select>
            </Campo>
            <Campo label="Cantidad">
              <input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} className="input w-20 text-sm" />
            </Campo>
            <button type="button" onClick={agregarItem} disabled={!productoId} className="btn-outline px-3 py-1 text-sm disabled:opacity-50">
              Agregar ítem
            </button>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <Campo label="Descripción (ej. montura, luna, antireflejo, UV…)">
              <input value={descripcionManual} onChange={(e) => setDescripcionManual(e.target.value)} placeholder="Ej. Luna con antireflejo" className="input text-sm" />
            </Campo>
            <Campo label="Precio unitario (S/)">
              <input type="number" min={0} step="0.01" value={precioManual} onChange={(e) => setPrecioManual(Number(e.target.value))} className="input w-28 text-sm" />
            </Campo>
            <Campo label="Cantidad">
              <input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} className="input w-20 text-sm" />
            </Campo>
            <button type="button" onClick={agregarItemManual} disabled={!descripcionManual.trim() || precioManual <= 0} className="btn-outline px-3 py-1 text-sm disabled:opacity-50">
              Agregar ítem
            </button>
          </div>
        )}

        {items.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {items.map((it, i) => (
              <li key={i} className="flex items-center justify-between">
                <span>{it.cantidad}× {it.descripcion}</span>
                <span>
                  S/ {it.subtotal.toFixed(2)}{" "}
                  <button onClick={() => quitarItem(i)} className="link-danger">quitar</button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-wrap items-end justify-between gap-2 text-sm">
          <Campo label="Método de pago">
            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="select text-sm">
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="yape">Yape</option>
              <option value="plin">Plin</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </Campo>
          {metodoPago === "tarjeta" && (
            <label className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={recargoTarjeta} onChange={(e) => setRecargoTarjeta(e.target.checked)} className="checkbox" />
              Incluir recargo por tarjeta ({(RECARGO_TARJETA_PCT * 100).toFixed(0)}%)
            </label>
          )}
          {items.length > 0 && (
            <Campo label="Código de descuento (opcional)">
              <select
                value={codigoDescuento} onChange={(e) => setCodigoDescuento(e.target.value)}
                className="select w-48 text-sm"
              >
                <option value="">Sin descuento</option>
                {descuentosDisponibles.map((d) => (
                  <option key={d.id} value={d.codigo}>
                    {d.codigo} — {d.tipo === "porcentaje" ? `${d.valor}%` : `S/ ${d.valor.toFixed(2)}`}
                  </option>
                ))}
              </select>
            </Campo>
          )}
          <div className="text-right">
            {descuentoAplicado && (
              <p className="text-accent">
                {descuentoAplicado.codigo} aplicado: −S/ {descuentoMonto.toFixed(2)}
              </p>
            )}
            {aplicaRecargoTarjeta && (
              <p className="text-slate-500 dark:text-slate-400">Recargo tarjeta: +S/ {montoRecargoTarjeta.toFixed(2)}</p>
            )}
            <span className="font-medium">Total: S/ {total.toFixed(2)} (IGV incl.)</span>
          </div>
        </div>

        <button
          onClick={confirmarVenta} disabled={guardando || items.length === 0 || alLimiteVentas || !cajaAbierta}
          className="btn-primary mt-3 w-full"
        >
          {!cajaAbierta ? "Abre la caja para vender" : guardando ? "Guardando…" : "Confirmar venta"}
        </button>
      </div>

      <div className="table-card mt-6">
        <div className="table-filter-bar">
          <select value={filtroMetodo} onChange={(e) => setFiltroMetodo(e.target.value)} className="select text-sm">
            <option value="todos">Todos los métodos</option>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="yape">Yape</option>
            <option value="plin">Plin</option>
            <option value="transferencia">Transferencia</option>
          </select>
          <DateRangePicker desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); }} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Fecha</th>
                <th className="table-head-cell">Cliente</th>
                <th className="table-head-cell hidden md:table-cell">Método</th>
                <th className="table-head-cell">Total</th>
                <th className="table-head-cell">Estado</th>
                <th className="table-head-cell text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((v) => (
                <tr key={v.id} className="table-row align-top">
                  <td className="table-cell text-slate-600 dark:text-slate-300" suppressHydrationWarning>
                    {new Date(v.fecha).toLocaleString("es-PE", { timeZone: "America/Lima" })}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <span className="row-avatar"><Receipt size={16} /></span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{nombreCliente(v.clienteId)}</span>
                    </div>
                  </td>
                  <td className="table-cell hidden md:table-cell capitalize text-slate-600 dark:text-slate-300">{v.metodoPago}</td>
                  <td className="table-cell">
                    <span className="font-medium text-slate-900 dark:text-slate-100">S/ {v.total.toFixed(2)}</span>
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      {ventaItems.filter((it) => it.ventaId === v.id).map((it) => it.descripcion).join(", ")}
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${v.estado === "anulada" ? "badge-neutral" : "badge-success"}`}>
                      {v.estado === "anulada" ? "Anulada" : "Pagada"}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => imprimirRecibo(v)}
                        title="Imprimir recibo"
                        aria-label={`Imprimir recibo de la venta a ${nombreCliente(v.clienteId)}`}
                        className="row-icon-btn"
                      >
                        <Printer size={15} />
                      </button>
                      {v.estado !== "anulada" && (
                        <button
                          onClick={() => setConfirmarAnular(v)}
                          disabled={anulandoId === v.id}
                          title="Anular venta"
                          aria-label="Anular venta"
                          className="row-icon-btn row-icon-btn-danger disabled:opacity-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {ordenadas.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="table-empty">
                      <Receipt size={28} className="text-slate-300 dark:text-slate-600" />
                      Sin ventas todavía.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
      </div>

      <ConfirmDialog
        abierto={Boolean(confirmarAnular)}
        titulo="¿Anular venta?"
        mensaje="El stock de los productos vendidos se devolverá al inventario. Esta acción no se puede deshacer."
        confirmarTexto="Anular"
        onConfirmar={confirmarAnularAccion}
        onCancelar={() => setConfirmarAnular(null)}
      />
    </main>
  );
}
