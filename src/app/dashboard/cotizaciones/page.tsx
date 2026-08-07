"use client";

import { useMemo, useState } from "react";
import { useData, type CotizacionItem } from "@/components/providers/DataProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { DatePicker } from "@/components/calendario/DatePicker";
import { buscarDescuentoValido, montoDescuento } from "@/lib/descuentos";
import { CajaCerradaBanner } from "@/components/dashboard/CajaCerradaBanner";
import { SettingsTabs, type TabDeAjustes } from "@/components/dashboard/SettingsTabs";

const TABS_COTIZACIONES: TabDeAjustes[] = [
  { href: "/dashboard/cotizaciones", label: "Nueva cotización" },
  { href: "/dashboard/cotizaciones/historial", label: "Cotizaciones realizadas" },
];

/* Label visible arriba de cada campo del formulario "Nueva cotización" — el
   `placeholder`/`aria-label` de los selects y de DatePicker desaparece en
   cuanto el usuario elige un valor, así que sin esto no hay forma de
   recordar qué campo es cada uno una vez lleno (queja real de usuario). */
function Campo({ label, obligatorio, children }: { label: string; obligatorio?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="form-label">{label}{obligatorio && <> <span className="text-red-500">*</span></>}</label>
      {children}
    </div>
  );
}

const IGV = 0.18;
type ItemForm = Omit<CotizacionItem, "id" | "cotizacionId">;

/* Extraído del research de competencia (sistema de facturación SUNAT):
   documento previo a la venta, no toca stock ni caja hasta que se
   convierte — ver convertirCotizacionAVenta en DataProvider.tsx. */
export default function CotizacionesPage() {
  const { clientes, productos, descuentos, cajas, addCotizacion, updateDescuento } = useData();
  const cajaAbierta = cajas.some((c) => c.estado === "abierta");
  const toast = useToast();
  const [clienteId, setClienteId] = useState("");
  const [vigenciaHasta, setVigenciaHasta] = useState("");
  const [items, setItems] = useState<ItemForm[]>([]);
  const [modoItem, setModoItem] = useState<"catalogo" | "personalizado">("catalogo");
  const [productoId, setProductoId] = useState("");
  const [descripcionManual, setDescripcionManual] = useState("");
  const [precioManual, setPrecioManual] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [codigoDescuento, setCodigoDescuento] = useState("");
  const [guardando, setGuardando] = useState(false);

  const itemsTotal = useMemo(() => items.reduce((acc, it) => acc + it.subtotal, 0), [items]);
  /* Mismo filtro que ventas/page.tsx (código de descuento pasó de texto
     libre a lista de cupones vigentes) — duplicado en vez de compartido
     porque el único punto de contacto real, `buscarDescuentoValido`, ya
     vive en lib/descuentos.ts y ahí SÍ es una función compartida. */
  const descuentosDisponibles = useMemo(
    () => descuentos.filter((d) => {
      if (!d.activo) return false;
      if (d.aplicaA !== "ambos" && d.aplicaA !== "cotizaciones") return false;
      if (d.limiteUsos != null && d.usos >= d.limiteUsos) return false;
      const hoy = new Date().toISOString().slice(0, 10);
      if (d.vigenciaDesde && hoy < d.vigenciaDesde) return false;
      if (d.vigenciaHasta && hoy > d.vigenciaHasta) return false;
      return true;
    }),
    [descuentos],
  );
  const descuentoAplicado = useMemo(
    () => buscarDescuentoValido(descuentos, codigoDescuento, "cotizaciones"),
    [descuentos, codigoDescuento],
  );
  const descuentoMonto = descuentoAplicado ? montoDescuento(descuentoAplicado, itemsTotal) : 0;
  const total = itemsTotal - descuentoMonto;
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

  /* Ítem "personalizado": para negocios que recién arrancan y todavía no
     tienen todo su catálogo cargado en Stock, o para conceptos que nunca
     son un producto propio (montura + luna + antireflejo/UV, cada uno con
     su propio precio a mano). Sin `productoId`, igual que cualquier línea
     que no venga del catálogo (ver tipo CotizacionItem). */
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

  async function confirmarCotizacion() {
    if (items.length === 0 || !cajaAbierta) return;
    setGuardando(true);
    await addCotizacion(
      { clienteId: clienteId || undefined, vigenciaHasta: vigenciaHasta || undefined, subtotal, igv, total, estado: "pendiente" },
      items,
    );
    if (descuentoAplicado) {
      await updateDescuento(descuentoAplicado.id, { usos: descuentoAplicado.usos + 1 });
    }
    setGuardando(false);
    setItems([]);
    setClienteId("");
    setVigenciaHasta("");
    setCodigoDescuento("");
    toast("Cotización creada.");
  }

  return (
    <main>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Cotizaciones</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Envía un presupuesto antes de la venta. No descuenta stock hasta que se convierte en venta.
      </p>
      <SettingsTabs tabs={TABS_COTIZACIONES} />

      {!cajaAbierta && (
        <div className="mt-4">
          <CajaCerradaBanner />
        </div>
      )}

      <div className="card mt-4 p-4">
        <h2 className="font-medium">Nueva cotización</h2>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Campo label="Cliente">
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="select h-11 w-full sm:h-auto">
              <option value="">Sin cliente</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>)}
            </select>
          </Campo>
          <Campo label="Vigente hasta">
            <DatePicker etiqueta="Vigente hasta" placeholder="Sin fecha límite" valor={vigenciaHasta} onChange={setVigenciaHasta} />
          </Campo>
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
          <div className="mt-2 space-y-2">
            <Campo label="Producto" obligatorio>
              <select value={productoId} onChange={(e) => setProductoId(e.target.value)} className="select h-11 w-full sm:h-auto">
                <option value="">Elegir producto…</option>
                {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre} — S/ {p.precioVenta.toFixed(2)}</option>)}
              </select>
            </Campo>
            <div className="flex items-end gap-2">
              <Campo label="Cantidad">
                <input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} className="input h-11 w-20 sm:h-auto" />
              </Campo>
              <button type="button" onClick={agregarItem} disabled={!productoId} className="btn-outline mb-0.5 h-11 px-3 py-2 text-sm disabled:opacity-50 sm:h-auto">
                Agregar ítem
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <Campo label="Descripción (ej. montura, luna, antireflejo, UV…)" obligatorio>
              <input value={descripcionManual} onChange={(e) => setDescripcionManual(e.target.value)} placeholder="Ej. Luna con antireflejo" className="input h-11 w-full sm:h-auto" />
            </Campo>
            <div className="flex items-end gap-2">
              <Campo label="Precio unitario (S/)" obligatorio>
                <input type="number" min={0} step="0.01" value={precioManual} onChange={(e) => setPrecioManual(Number(e.target.value))} className="input h-11 w-28 sm:h-auto" />
              </Campo>
              <Campo label="Cantidad">
                <input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} className="input h-11 w-20 sm:h-auto" />
              </Campo>
              <button type="button" onClick={agregarItemManual} disabled={!descripcionManual.trim() || precioManual <= 0} className="btn-outline mb-0.5 h-11 px-3 py-2 text-sm disabled:opacity-50 sm:h-auto">
                Agregar ítem
              </button>
            </div>
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

        {items.length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
            <Campo label="Código de descuento (opcional)">
              <select
                value={codigoDescuento} onChange={(e) => setCodigoDescuento(e.target.value)}
                className="select h-11 w-full sm:h-auto sm:w-48"
              >
                <option value="">Sin descuento</option>
                {descuentosDisponibles.map((d) => (
                  <option key={d.id} value={d.codigo}>
                    {d.codigo} — {d.tipo === "porcentaje" ? `${d.valor}%` : `S/ ${d.valor.toFixed(2)}`}
                  </option>
                ))}
              </select>
            </Campo>
            <div className="text-right text-sm sm:ml-auto">
              {descuentoAplicado && (
                <p className="text-accent">
                  {descuentoAplicado.codigo} aplicado: −S/ {descuentoMonto.toFixed(2)}
                </p>
              )}
              <p className="font-medium">Total: S/ {total.toFixed(2)} (IGV incl.)</p>
            </div>
          </div>
        )}

        <p className="mt-3 text-xs text-slate-500 dark:text-slate-500"><span className="text-red-500">*</span> Campo obligatorio</p>
        <button
          onClick={confirmarCotizacion} disabled={guardando || items.length === 0 || !cajaAbierta}
          className="btn-primary mt-1 h-11 w-full sm:h-auto"
        >
          {!cajaAbierta ? "Abre la caja para cotizar" : guardando ? "Guardando…" : "Crear cotización"}
        </button>
      </div>
    </main>
  );
}
