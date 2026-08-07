"use client";

import { useMemo, useState } from "react";
import { ScanBarcode, Lock } from "lucide-react";
import { EscanerCodigoBarras } from "@/components/ui/EscanerCodigoBarras";
import { ClienteCombobox } from "@/components/clientes/ClienteCombobox";
import { ProductoCombobox } from "@/components/ventas/ProductoCombobox";
import { SucursalCombobox } from "@/components/ventas/SucursalCombobox";
import { DescuentoCombobox } from "@/components/ventas/DescuentoCombobox";
import { productosRelacionados } from "@/lib/venta-cruzada";
import { useData, type VentaItem, type Producto } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { buscarDescuentoValido, montoDescuento } from "@/lib/descuentos";
import { contarVentasDelMes, puedeRegistrarVenta } from "@/lib/limites-plan";
import { LIMITE_VENTAS_MES_GRATIS } from "@/lib/precios";
import { LimitePlanBanner } from "@/components/dashboard/LimitePlanBanner";
import { CajaCerradaBanner } from "@/components/dashboard/CajaCerradaBanner";
import { SettingsTabs, type TabDeAjustes } from "@/components/dashboard/SettingsTabs";

const TABS_VENTAS: TabDeAjustes[] = [
  { href: "/dashboard/ventas", label: "Nueva venta" },
  { href: "/dashboard/ventas/historial", label: "Ventas realizadas" },
];

const IGV = 0.18;
/* Recargo por default si `negocio` todavía no cargó (o para un negocio sin
   el campo seteado en mock antiguo) — el valor real y editable vive en
   `negocio.recargoTarjetaPct` (Ajustes → Datos del negocio), ya no está
   hardcodeado acá. */
const RECARGO_TARJETA_PCT_DEFECTO = 5;
type ItemForm = Omit<VentaItem, "id" | "ventaId">;

/* Editable en Ajustes con paso de 0.5 (numeric(5,2) en el schema) — sin
   decimales de sobra en el copy cuando el negocio dejó un entero (ej. "5%",
   no "5.0%"), pero respeta el decimal real si lo tiene (ej. "5.5%"). */
function fmtPct(pct: number): string {
  return pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1);
}

/* Ver el mismo componente en cotizaciones/page.tsx: el placeholder/label
   nativo de un &lt;select&gt; desaparece al elegir un valor, así que sin esto no
   hay forma de recordar qué campo es cada uno una vez lleno. */
function Campo({ label, obligatorio, className, children }: { label: string; obligatorio?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="form-label">{label}{obligatorio && <> <span className="text-red-500">*</span></>}</label>
      {children}
    </div>
  );
}

export default function VentasPage() {
  const { ventas, ventaItems, clientes, productos, descuentos, negocio, suscripcion, cajas, sucursales, sucursalFiltro, addVenta, updateDescuento } = useData();
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
  const recargoTarjetaPct = negocio?.recargoTarjetaPct ?? RECARGO_TARJETA_PCT_DEFECTO;
  /* El recargo solo se aplica si el método es tarjeta Y el usuario marcó la
     casilla (algunas ópticas absorben el fee, otras lo trasladan al
     cliente — no es automático por el solo hecho de pagar con tarjeta) y se
     calcula SOBRE el monto ya con descuento aplicado, no sobre el bruto. */
  const aplicaRecargoTarjeta = metodoPago === "tarjeta" && recargoTarjeta;
  const montoRecargoTarjeta = aplicaRecargoTarjeta ? (itemsTotal - descuentoMonto) * (recargoTarjetaPct / 100) : 0;
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
    if (aplicaRecargoTarjeta) notasPartes.push(`Recargo tarjeta (${fmtPct(recargoTarjetaPct)}%): +S/ ${montoRecargoTarjeta.toFixed(2)}`);
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

  // "Nuevo" para ClienteCombobox = sin compras previas (a diferencia de
  // Citas, acá el historial relevante es `ventas`, no `citas`).
  const esNuevoCliente = (id: string) => !ventas.some((v) => v.clienteId === id);

  return (
    <main>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Ventas</h1>
      <SettingsTabs tabs={TABS_VENTAS} gridMobile2 />

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

          {/* Mismo esqueleto en los dos modos (campo(s) arriba, "Agregar ítem"
             a ancho completo abajo) — antes el botón vivía metido en la
             misma fila que Cantidad, con un ancho que dependía de cuántos
             inputs tenía al lado (2 en catálogo, 3 en personalizado), así
             que terminaba viéndose "diferenciado" entre pestañas. Ahora
             Cantidad (y Precio unitario en personalizado) tienen su propio
             ancho fijo sin importar el modo, y el botón siempre ocupa toda
             la fila de abajo. */}
          {modoItem === "catalogo" ? (
            <div className="mt-2 space-y-2">
              <Campo label="Producto" obligatorio>
                <ProductoCombobox productos={productos} productoId={productoId} onChange={setProductoId} />
              </Campo>
              <Campo label="Cantidad">
                <input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} className="input w-24" />
              </Campo>
              <button type="button" onClick={agregarItem} disabled={!productoId} className="btn-outline w-full disabled:opacity-50">
                Agregar ítem
              </button>
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <Campo label="Descripción (ej. montura, luna, antireflejo, UV…)" obligatorio>
                <input value={descripcionManual} onChange={(e) => setDescripcionManual(e.target.value)} placeholder="Ej. Luna con antireflejo" className="input w-full" />
              </Campo>
              <div className="grid grid-cols-2 gap-2">
                <Campo label="Precio unitario (S/)" obligatorio>
                  <input type="number" min={0} step="0.01" value={precioManual} onChange={(e) => setPrecioManual(Number(e.target.value))} className="input w-full" />
                </Campo>
                <Campo label="Cantidad">
                  <input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} className="input w-full" />
                </Campo>
              </div>
              <button type="button" onClick={agregarItemManual} disabled={!descripcionManual.trim() || precioManual <= 0} className="btn-outline w-full disabled:opacity-50">
                Agregar ítem
              </button>
            </div>
          )}
        </div>

        {/* Card propio para los ítems ya agregados — separado del card de
           descuento/total de más abajo (dos cards distintos, no uno solo
           con todo adentro: pedido explícito del usuario), pero con el
           MISMO color celeste (bg-primary-light) que ese — pedido explícito
           también. Vive acá arriba, pegado a donde se están agregando los
           ítems, no allá abajo junto al resto del formulario de pago. */}
        {items.length > 0 && (
          <div className="mt-3 rounded-lg bg-primary-light p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary">Ítems de la venta</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {items.map((it, i) => (
                <li key={i} className="flex items-center justify-between text-slate-700 dark:text-slate-200">
                  <span>{it.cantidad}× {it.descripcion}</span>
                  <span>
                    S/ {it.subtotal.toFixed(2)}{" "}
                    <button onClick={() => quitarItem(i)} className="link-danger">quitar</button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
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
          {/* Orden en mobile (grid de 1 columna, el orden visual lo decide
             `order-*`, no la posición en el DOM): Método de pago → recargo
             (si aplica) → Sede → Descuento → Total. Antes el recargo caía
             DESPUÉS de Sede solo porque así estaba escrito el JSX — quedaba
             separado de "Método de pago", con el que en realidad va de la
             mano (solo aparece si el método es tarjeta). Desktop no se toca
             (`sm:order-none`): ahí el `flex-wrap` ya acomodaba todo bien. */}
          <Campo label="Método de pago" className="order-1 sm:order-none">
            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="select w-full">
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="yape">Yape</option>
              <option value="plin">Plin</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </Campo>
          {metodoPago === "tarjeta" && (
            <label className="order-2 flex items-center gap-1.5 text-xs text-slate-600 sm:order-none dark:text-slate-300">
              <input type="checkbox" checked={recargoTarjeta} onChange={(e) => setRecargoTarjeta(e.target.checked)} className="checkbox" />
              Incluir recargo por tarjeta ({fmtPct(recargoTarjetaPct)}%)
            </label>
          )}
          {sucursales.length > 0 && (
            <Campo label="Sede" className="order-3 sm:order-none">
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
                <SucursalCombobox sucursales={sucursales} sucursalId={sucursalVentaId} onChange={setSucursalVentaId} />
              )}
            </Campo>
          )}
          {/* Antes solo aparecía con items.length > 0 — "a veces sí, a veces
             no" reportado por el usuario. Siempre visible ahora (un
             descuento sin ítems simplemente no tiene nada sobre qué
             aplicarse, pero el campo en sí no depende de eso). */}
          <Campo label="Código de descuento (opcional)" className="order-4 sm:order-none">
            <DescuentoCombobox descuentos={descuentosDisponibles} codigo={codigoDescuento} onChange={setCodigoDescuento} />
          </Campo>
        </div>

        {/* Card independiente del de "Ítems de la venta" de más arriba —
           dos cards distintos a propósito, no uno solo (pedido explícito
           del usuario). Color propio (bg-primary-light) para diferenciarse
           del resto del card "Nueva venta", tanto en mobile como en
           desktop. Solo aparece con al menos 1 ítem — un total de un
           carrito vacío no aporta nada. */}
        {items.length > 0 && (
          <div className="mt-3 space-y-1 rounded-lg bg-primary-light p-4 text-right">
            {descuentoAplicado && (
              <p className="text-sm font-medium text-accent">
                {descuentoAplicado.codigo} aplicado: −S/ {descuentoMonto.toFixed(2)}
              </p>
            )}
            {aplicaRecargoTarjeta && (
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Recargo tarjeta: +S/ {montoRecargoTarjeta.toFixed(2)}</p>
            )}
            <p className="text-2xl font-bold leading-tight text-primary">S/ {total.toFixed(2)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-500">Total (IGV incl.)</p>
          </div>
        )}

        <p className="mt-3 text-xs text-slate-500 dark:text-slate-500"><span className="text-red-500">*</span> Campo obligatorio</p>
        <button
          onClick={confirmarVenta} disabled={guardando || items.length === 0 || alLimiteVentas || !cajaAbierta}
          className="btn-primary mt-1 w-full"
        >
          {!cajaAbierta ? "Abre la caja para vender" : guardando ? "Guardando…" : "Confirmar venta"}
        </button>
      </div>

      <EscanerCodigoBarras abierto={escanerAbierto} onCerrar={() => setEscanerAbierto(false)} onDetectado={agregarItemEscaneado} />
    </main>
  );
}
