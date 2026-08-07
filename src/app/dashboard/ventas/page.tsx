"use client";

import { useMemo, useState } from "react";
import { Receipt, Trash2, Printer, ScanBarcode, ChevronDown, Lock } from "lucide-react";
import { Skeleton } from "boneyard-js/react";
import { EscanerCodigoBarras } from "@/components/ui/EscanerCodigoBarras";
import { ClienteCombobox } from "@/components/clientes/ClienteCombobox";
import { ProductoCombobox } from "@/components/ventas/ProductoCombobox";
import { productosRelacionados } from "@/lib/venta-cruzada";
import { useData, type Venta, type VentaItem, type Producto } from "@/components/providers/DataProvider";
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
type ItemForm = Omit<VentaItem, "id" | "ventaId">;

/* Ver el mismo componente en cotizaciones/page.tsx: el placeholder/label
   nativo de un &lt;select&gt; desaparece al elegir un valor, así que sin esto no
   hay forma de recordar qué campo es cada uno una vez lleno. */
function Campo({ label, obligatorio, children }: { label: string; obligatorio?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="form-label">{label}{obligatorio && <> <span className="text-red-500">*</span></>}</label>
      {children}
    </div>
  );
}

export default function VentasPage() {
  const { ventas, ventaItems, clientes, productos, descuentos, negocio, suscripcion, cajas, sucursales, sucursalFiltro, addVenta, anularVenta, updateDescuento, ready } = useData();
  const cajaAbierta = cajas.some((c) => c.estado === "abierta");
  const { empleado } = useSession();
  const toast = useToast();
  // Un empleado con sede fija siempre vende para la suya; uno que ve todas
  // las sedes hereda la que tenga elegida en el selector del topbar.
  const [sucursalVentaId, setSucursalVentaId] = useState(() => empleado?.sucursalId ?? sucursalFiltro ?? "");

  /* Límite de 30 ventas/mes del plan Gratis (freemium) — este chequeo del
     lado del cliente es solo UX inmediata (evita que el usuario arme todo
     el ticket para recién enterarse); la aplicación real es el trigger de
     la base (bloquear_venta_limite_gratis, supabase-schema.sql), porque
     `ventas` se inserta directo desde el navegador y un chequeo solo-cliente
     sería bypasseable con la propia sesión del negocio. */
  const ventasEsteMes = useMemo(() => contarVentasDelMes(ventas), [ventas]);
  const alLimiteVentas = suscripcion?.plan === "gratis" && !puedeRegistrarVenta(suscripcion.plan, ventasEsteMes);
  const [clienteId, setClienteId] = useState("");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [recargoTarjeta, setRecargoTarjeta] = useState(false);
  const [items, setItems] = useState<ItemForm[]>([]);
  const [modoItem, setModoItem] = useState<"catalogo" | "personalizado">("catalogo");
  const [productoId, setProductoId] = useState("");
  const [escanerAbierto, setEscanerAbierto] = useState(false);
  const [descripcionManual, setDescripcionManual] = useState("");
  const [precioManual, setPrecioManual] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [codigoDescuento, setCodigoDescuento] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmarAnular, setConfirmarAnular] = useState<Venta | null>(null);
  const [anulandoId, setAnulandoId] = useState<string | null>(null);

  /* Mobile: fila de la tabla de ventas expandida (ver Método de pago +
     acciones) — reemplaza el scroll horizontal por un desplegable, la
     tabla completa (con Método visible) sigue intacta en desktop. */
  const [filaExpandidaId, setFilaExpandidaId] = useState<string | null>(null);

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

  /* Agrega directo con cantidad 1 (a diferencia de agregarItem(), que usa
     el <select> + el input de cantidad de al lado) — escanear ya es la
     acción rápida, pedirle además que ajuste cantidad antes de confirmar le
     saca el punto; si necesita más de 1, puede volver a escanear el mismo
     código o editar la cantidad después con el input normal. */
  function agregarItemEscaneado(codigo: string) {
    setEscanerAbierto(false);
    const producto = productos.find((p) => p.codigo === codigo);
    if (!producto) { toast(`Ningún producto tiene el código "${codigo}".`, "error"); return; }
    setItems((prev) => [...prev, {
      productoId: producto.id, descripcion: producto.nombre,
      cantidad: 1, precioUnitario: producto.precioVenta, subtotal: producto.precioVenta,
    }]);
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

  function agregarSugerido(producto: Producto) {
    setItems((prev) => [...prev, {
      productoId: producto.id, descripcion: producto.nombre,
      cantidad: 1, precioUnitario: producto.precioVenta, subtotal: producto.precioVenta,
    }]);
  }

  /* Venta cruzada sin IA: qué productos acompañaron al ÚLTIMO ítem agregado
     en ventas pasadas (ver lib/venta-cruzada.ts) — se recalcula con cada
     ítem nuevo, no solo al abrir la página, para que ir armando la venta
     siga sugiriendo en base a lo último que se metió al carrito. Nunca
     sugiere algo que ya está en el carrito actual. */
  const ultimoProductoId = [...items].reverse().find((it) => it.productoId)?.productoId;
  const idsEnCarrito = new Set(items.map((it) => it.productoId).filter(Boolean));
  const sugerencias = ultimoProductoId
    ? productosRelacionados(ultimoProductoId, ventaItems)
        .map((id) => productos.find((p) => p.id === id))
        .filter((p): p is Producto => p != null && !idsEnCarrito.has(p.id))
    : [];

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

    /* Descuento y recargo no tienen columna propia en `ventas` (ver
       DataProvider) — se guardan como texto en `notas`, único lugar
       persistido que el recibo (lib/recibo.ts) puede mostrar. Antes solo
       viajaba el recargo; el descuento aplicado no quedaba registrado en
       ningún lado y por eso nunca podía figurar en la boleta. */
    const notasPartes: string[] = [];
    if (descuentoAplicado) notasPartes.push(`Descuento (${descuentoAplicado.codigo}): -S/ ${descuentoMonto.toFixed(2)}`);
    if (aplicaRecargoTarjeta) notasPartes.push(`Recargo tarjeta (${(RECARGO_TARJETA_PCT * 100).toFixed(0)}%): +S/ ${montoRecargoTarjeta.toFixed(2)}`);
    const notas = notasPartes.length > 0 ? notasPartes.join(" · ") : undefined;

    const { id, error } = await addVenta(
      {
        clienteId: clienteId || undefined, empleadoId: empleado?.id, sucursalId: sucursalVentaId || undefined,
        subtotal, igv, total, metodoPago, estado: "pagada", montoPagado: total, notas,
      },
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
    setCodigoDescuento("");
    setRecargoTarjeta(false);
    toast("Venta registrada.");
  }

  const nombreCliente = (id?: string) => {
    if (!id) return "Sin cliente";
    const c = clientes.find((c) => c.id === id);
    return c ? `${c.nombres} ${c.apellidos}` : "—";
  };

  // "Nuevo" para ClienteCombobox = sin compras previas (a diferencia de
  // Citas, acá el historial relevante es `ventas`, no `citas`).
  const esNuevoCliente = (id: string) => !ventas.some((v) => v.clienteId === id);

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

  // Sin sede asignada = venta creada antes de tener multisedes (o negocio de
  // una sola sede): se sigue mostrando bajo cualquier filtro, nunca
  // "desaparece" — mismo criterio que el reparto de stock (ver Sucursales).
  const ordenadas = [...ventas]
    .filter((v) => !sucursalFiltro || !v.sucursalId || v.sucursalId === sucursalFiltro)
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

        <div className="mt-3">
          <Campo label="Cliente">
            <ClienteCombobox clientes={clientes} clienteId={clienteId} onChange={setClienteId} esNuevo={esNuevoCliente} />
          </Campo>
        </div>

        <div className="mt-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <div className="flex gap-1">
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
            <button
              type="button" onClick={() => setEscanerAbierto(true)}
              className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <ScanBarcode size={14} /> Escanear
            </button>
          </div>

          {modoItem === "catalogo" ? (
            <div className="mt-2 space-y-2">
              <Campo label="Producto" obligatorio>
                <ProductoCombobox productos={productos} productoId={productoId} onChange={setProductoId} />
              </Campo>
              <div className="flex items-end gap-2">
                <Campo label="Cantidad">
                  <input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} className="input w-20" />
                </Campo>
                <button type="button" onClick={agregarItem} disabled={!productoId} className="btn-outline mb-0.5 px-3 py-2 text-sm disabled:opacity-50">
                  Agregar ítem
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <Campo label="Descripción (ej. montura, luna, antireflejo, UV…)" obligatorio>
                <input value={descripcionManual} onChange={(e) => setDescripcionManual(e.target.value)} placeholder="Ej. Luna con antireflejo" className="input w-full" />
              </Campo>
              <div className="flex items-end gap-2">
                <Campo label="Precio unitario (S/)" obligatorio>
                  <input type="number" min={0} step="0.01" value={precioManual} onChange={(e) => setPrecioManual(Number(e.target.value))} className="input w-28" />
                </Campo>
                <Campo label="Cantidad">
                  <input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} className="input w-20" />
                </Campo>
                <button type="button" onClick={agregarItemManual} disabled={!descripcionManual.trim() || precioManual <= 0} className="btn-outline mb-0.5 px-3 py-2 text-sm disabled:opacity-50">
                  Agregar ítem
                </button>
              </div>
            </div>
          )}
        </div>

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

        {/* Venta cruzada sin IA: co-ocurrencia real de venta_items pasados
           (ver lib/venta-cruzada.ts) — "quienes llevaron esto, también
           llevaron...". Un clic agrega directo, sin pasar por el <select>. */}
        {sugerencias.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-500">Suelen llevar también:</span>
            {sugerencias.map((p) => (
              <button
                key={p.id} type="button" onClick={() => agregarSugerido(p)}
                className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300 dark:hover:border-primary"
              >
                + {p.nombre}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:flex sm:flex-wrap sm:items-end sm:justify-between">
          <Campo label="Método de pago">
            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="select w-full">
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="yape">Yape</option>
              <option value="plin">Plin</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </Campo>
          {sucursales.length > 0 && (
            <Campo label="Sede">
              {/* Empleado con sede fija: antes esto seguía siendo un <select>
                 (solo disabled), mostrando todas las sedes aunque ninguna
                 fuera realmente elegible — ahora, con sede fija, ni siquiera
                 se ve como un desplegable: es una etiqueta bloqueada con la
                 única sede que aplica. Sin sede fija (ve todas), sigue el
                 <select> normal. */}
              {empleado?.sucursalId ? (
                <div className="input flex w-full items-center gap-2 bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <Lock size={13} className="shrink-0" />
                  <span className="truncate">{sucursales.find((s) => s.id === empleado.sucursalId)?.nombre ?? "Sede fija"}</span>
                </div>
              ) : (
                <select
                  value={sucursalVentaId}
                  onChange={(e) => setSucursalVentaId(e.target.value)}
                  className="select w-full"
                >
                  <option value="">Sin sede asignada</option>
                  {sucursales.filter((s) => s.activo).map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              )}
            </Campo>
          )}
          {metodoPago === "tarjeta" && (
            <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={recargoTarjeta} onChange={(e) => setRecargoTarjeta(e.target.checked)} className="checkbox" />
              Incluir recargo por tarjeta ({(RECARGO_TARJETA_PCT * 100).toFixed(0)}%)
            </label>
          )}
          {/* Antes solo aparecía con items.length > 0 — "a veces sí, a veces
             no" reportado por el usuario. Siempre visible ahora (un
             descuento sin ítems simplemente no tiene nada sobre qué
             aplicarse, pero el campo en sí no depende de eso). */}
          <Campo label="Código de descuento (opcional)">
            <select
              value={codigoDescuento} onChange={(e) => setCodigoDescuento(e.target.value)}
              className="select w-full sm:w-48"
            >
              <option value="">Sin descuento</option>
              {descuentosDisponibles.map((d) => (
                <option key={d.id} value={d.codigo}>
                  {d.codigo} — {d.tipo === "porcentaje" ? `${d.valor}%` : `S/ ${d.valor.toFixed(2)}`}
                </option>
              ))}
            </select>
          </Campo>
          <div className="text-right sm:ml-auto">
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

        <p className="mt-3 text-xs text-slate-500 dark:text-slate-500"><span className="text-red-500">*</span> Campo obligatorio</p>
        <button
          onClick={confirmarVenta} disabled={guardando || items.length === 0 || alLimiteVentas || !cajaAbierta}
          className="btn-primary mt-1 w-full"
        >
          {!cajaAbierta ? "Abre la caja para vender" : guardando ? "Guardando…" : "Confirmar venta"}
        </button>
      </div>

      <div className="table-card mt-6">
        <div className="table-filter-bar">
          <select value={filtroMetodo} onChange={(e) => setFiltroMetodo(e.target.value)} className="select">
            <option value="todos">Todos los métodos</option>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="yape">Yape</option>
            <option value="plin">Plin</option>
            <option value="transferencia">Transferencia</option>
          </select>
          <DateRangePicker desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); }} />
        </div>

        <Skeleton name="ventas-tabla" loading={!ready}>
        {/* Desktop: tabla completa sin cambios (Método ya visible acá). */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Fecha</th>
                <th className="table-head-cell">Cliente</th>
                <th className="table-head-cell">Método</th>
                <th className="table-head-cell">Total</th>
                <th className="table-head-cell">Estado</th>
                <th className="table-head-cell text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((v) => (
                <tr key={v.id} className="table-row align-top">
                  <td className="table-body-cell text-slate-600 dark:text-slate-300" suppressHydrationWarning>
                    {new Date(v.fecha).toLocaleString("es-PE", { timeZone: "America/Lima" })}
                  </td>
                  <td className="table-body-cell">
                    <div className="flex items-center gap-3">
                      <span className="row-avatar"><Receipt size={16} /></span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{nombreCliente(v.clienteId)}</span>
                    </div>
                  </td>
                  <td className="table-body-cell capitalize text-slate-600 dark:text-slate-300">{v.metodoPago}</td>
                  <td className="table-body-cell">
                    <span className="font-medium text-slate-900 dark:text-slate-100">S/ {v.total.toFixed(2)}</span>
                    <div className="text-xs text-slate-500 dark:text-slate-500">
                      {ventaItems.filter((it) => it.ventaId === v.id).map((it) => it.descripcion).join(", ")}
                    </div>
                  </td>
                  <td className="table-body-cell">
                    <span className={`badge ${v.estado === "anulada" ? "badge-neutral" : "badge-success"}`}>
                      {v.estado === "anulada" ? "Anulada" : "Pagada"}
                    </span>
                  </td>
                  <td className="table-body-cell text-right">
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

        {/* Mobile: sin scroll horizontal — cada venta es una tarjeta
           colapsada (fecha/cliente/total/estado) y el chevron despliega lo
           que antes exigía scrollear: Método de pago + Imprimir/Anular. */}
        <div className="space-y-2 md:hidden">
          {visibles.map((v) => {
            const expandida = filaExpandidaId === v.id;
            return (
              <div key={v.id} className="card p-3 text-sm">
                <button
                  type="button"
                  onClick={() => setFilaExpandidaId(expandida ? null : v.id)}
                  aria-expanded={expandida}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <span className="row-avatar shrink-0"><Receipt size={16} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-slate-900 dark:text-slate-100">{nombreCliente(v.clienteId)}</span>
                      <span className="shrink-0 font-medium text-slate-900 dark:text-slate-100">S/ {v.total.toFixed(2)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-500">
                      <span suppressHydrationWarning>{new Date(v.fecha).toLocaleString("es-PE", { timeZone: "America/Lima" })}</span>
                      <span className={`badge shrink-0 ${v.estado === "anulada" ? "badge-neutral" : "badge-success"}`}>
                        {v.estado === "anulada" ? "Anulada" : "Pagada"}
                      </span>
                    </span>
                  </span>
                  <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${expandida ? "rotate-180" : ""}`} />
                </button>

                {expandida && (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      {ventaItems.filter((it) => it.ventaId === v.id).map((it) => it.descripcion).join(", ")}
                    </p>
                    <p className="text-xs capitalize text-slate-600 dark:text-slate-300">Método: {v.metodoPago}</p>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => imprimirRecibo(v)}
                        className="btn-outline h-11 flex-1 gap-1.5 text-sm"
                      >
                        <Printer size={15} /> Imprimir
                      </button>
                      {v.estado !== "anulada" && (
                        <button
                          onClick={() => setConfirmarAnular(v)}
                          disabled={anulandoId === v.id}
                          className="btn-outline h-11 flex-1 gap-1.5 text-sm text-red-600 disabled:opacity-50 dark:text-red-400"
                        >
                          <Trash2 size={15} /> Anular
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {ordenadas.length === 0 && (
            <div className="table-empty">
              <Receipt size={28} className="text-slate-300 dark:text-slate-600" />
              Sin ventas todavía.
            </div>
          )}
        </div>
        </Skeleton>
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

      <EscanerCodigoBarras abierto={escanerAbierto} onCerrar={() => setEscanerAbierto(false)} onDetectado={agregarItemEscaneado} />
    </main>
  );
}
