"use client";

/* ================= DATA PROVIDER — FUENTE ÚNICA DE VERDAD =================
   Store global compartido por TODOS los roles dentro de un mismo negocio. El
   navegador nunca mantiene estado paralelo por rol: toda lectura sale de
   aquí y toda escritura va por add()/update()/delete(). `cargar()` fetchea las
   tablas en paralelo y se suscribe a postgres_changes → cualquier cambio
   re-fetchea y todos los useData() consumidores se re-renderizan.

   Entidades: capa de auth/tenant (`empleados`, `negocio`, `suscripcion`) +
   módulo de dominio de la óptica (`clientes`, `citas`, `recetas`,
   `productos` —ya fusionados con su stock de `inventario`—,
   `movimientosStock`, `ventas`, `ventaItems`, `gastos`). Recuerda: campo
   nuevo de DB ⇒ tipo aquí + mappers (ambos sentidos) + supabase-schema.sql. */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  rowToEmpleado, empleadoToRow, rowToNegocio, negocioToRow, rowToSuscripcion,
  rowToCliente, clienteToRow, rowToCita, citaToRow, rowToReceta, recetaToRow,
  rowToProducto, productoToRow, rowToMovimientoStock, rowToVenta, ventaToRow,
  rowToVentaItem, rowToGasto, gastoToRow,
} from "@/lib/data/mappers";

/* ================= TIPOS: capa de auth/tenant ================= */
export type Rol = "administrador" | "encargado" | "trabajador";

export interface Empleado {
  id:            string;
  negocioId:     string | null;
  nombres:       string;
  apellidos:     string;
  rol:           Rol;
  email?:        string;
  telefono?:     string;
  avatarBase64?: string;
  activo:        boolean;
}

export interface Negocio {
  id:         string;
  nombre:     string;
  subdominio: string;
  ruc?:       string;
  telefono?:  string;
  direccion?: string;
  logoUrl?:   string;
  activo:     boolean;
}

export interface Suscripcion {
  id:               string;
  negocioId:        string;
  plan:             string;
  estado:           string;
  trialInicio:      string;
  trialFin:         string;
  fechaPagoUltimo?: string;
  proximoCobro?:    string;
}

/* ================= TIPOS: módulo de dominio ================= */
export interface Cliente {
  id: string; negocioId: string;
  nombres: string; apellidos: string;
  documentoTipo: string; documentoNumero?: string;
  telefono?: string; email?: string; fechaNacimiento?: string;
  direccion?: string; notas?: string;
}

export interface Cita {
  id: string; negocioId: string; clienteId: string; empleadoId?: string;
  fechaHora: string; motivo?: string; estado: string; notas?: string;
}

export interface Receta {
  id: string; negocioId: string; clienteId: string; citaId?: string;
  fecha: string; tipo: string;
  odEsfera?: number; odCilindro?: number; odEje?: number; odAdicion?: number;
  oiEsfera?: number; oiCilindro?: number; oiEje?: number; oiAdicion?: number;
  dip?: number; notas?: string;
}

export interface Producto {
  id: string; negocioId: string; codigo?: string; nombre: string; categoria: string;
  marca?: string; descripcion?: string; precioVenta: number; precioCosto: number;
  imagenUrl?: string; activo: boolean;
  stockActual: number; stockMinimo: number;
}

export interface MovimientoStock {
  id: string; negocioId: string; productoId: string; tipo: string;
  cantidad: number; motivo?: string; fecha: string;
}

export interface Venta {
  id: string; negocioId: string; clienteId?: string; fecha: string;
  subtotal: number; igv: number; total: number;
  metodoPago: string; estado: string; montoPagado: number; notas?: string;
}

export interface VentaItem {
  id: string; ventaId: string; productoId?: string;
  descripcion: string; cantidad: number; precioUnitario: number; subtotal: number;
}

export interface Gasto {
  id: string; negocioId: string; categoria: string;
  descripcion?: string; monto: number; fecha: string;
}

interface DataCtx {
  empleados:        Empleado[];
  negocio:          Negocio | null;
  suscripcion:      Suscripcion | null;
  clientes:         Cliente[];
  citas:            Cita[];
  recetas:          Receta[];
  productos:        Producto[];
  movimientosStock: MovimientoStock[];
  ventas:           Venta[];
  ventaItems:       VentaItem[];
  gastos:           Gasto[];
  ready:            boolean;
  /* CRUD (la mutación va a Supabase; Realtime re-fetchea). */
  updateEmpleado: (id: string, patch: Partial<Empleado>) => Promise<void>;
  updateNegocio:  (patch: Partial<Negocio>) => Promise<void>;
  addCliente:     (c: Partial<Cliente>) => Promise<string | null>;
  updateCliente:  (id: string, patch: Partial<Cliente>) => Promise<void>;
  deleteCliente:  (id: string) => Promise<void>;
  addCita:        (c: Partial<Cita>) => Promise<string | null>;
  updateCita:     (id: string, patch: Partial<Cita>) => Promise<void>;
  deleteCita:     (id: string) => Promise<void>;
  addReceta:      (r: Partial<Receta>) => Promise<void>;
  addProducto:    (p: Partial<Producto>, stockInicial: number, stockMinimo: number) => Promise<void>;
  updateProducto: (id: string, patch: Partial<Producto>) => Promise<void>;
  ajustarStock:   (productoId: string, tipo: string, cantidad: number, motivo?: string) => Promise<void>;
  addVenta:       (v: Partial<Venta>, items: Array<Omit<VentaItem, "id" | "ventaId">>) => Promise<void>;
  addGasto:       (g: Partial<Gasto>) => Promise<void>;
  deleteGasto:    (id: string) => Promise<void>;
}

const Ctx = createContext<DataCtx | null>(null);

const TABLAS_DOMINIO = [
  "clientes", "citas", "recetas", "productos", "inventario",
  "movimientos_stock", "ventas", "venta_items", "gastos",
] as const;

/* ================= PROVIDER ================= */
export function DataProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [empleados, setEmpleados]     = useState<Empleado[]>([]);
  const [negocio, setNegocio]         = useState<Negocio | null>(null);
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null);
  const [clientes, setClientes]       = useState<Cliente[]>([]);
  const [citas, setCitas]             = useState<Cita[]>([]);
  const [recetas, setRecetas]         = useState<Receta[]>([]);
  const [productos, setProductos]     = useState<Producto[]>([]);
  const [movimientosStock, setMovimientosStock] = useState<MovimientoStock[]>([]);
  const [ventas, setVentas]           = useState<Venta[]>([]);
  const [ventaItems, setVentaItems]   = useState<VentaItem[]>([]);
  const [gastos, setGastos]           = useState<Gasto[]>([]);
  const [ready, setReady]             = useState(false);

  /* ====== Carga inicial (todas las tablas en paralelo) + Realtime ======
     `cargar` vive DENTRO del efecto para que el fetch se dispare como
     reacción al montaje, no como una llamada a setState "suelta" en el
     cuerpo del efecto. `activo` evita setState tras desmontar. */
  useEffect(() => {
    let activo = true;

    async function cargar() {
      const [e, n, s, cl, ci, re, pr, inv, ms, ve, vi, ga] = await Promise.all([
        supabase.from("empleados").select("*"),
        supabase.from("negocios").select("*"),
        supabase.from("suscripciones").select("*"),
        supabase.from("clientes").select("*"),
        supabase.from("citas").select("*"),
        supabase.from("recetas").select("*"),
        supabase.from("productos").select("*"),
        supabase.from("inventario").select("*"),
        supabase.from("movimientos_stock").select("*"),
        supabase.from("ventas").select("*"),
        supabase.from("venta_items").select("*"),
        supabase.from("gastos").select("*"),
      ]);
      if (!activo) return;

      /* El stock (`inventario`) es 1:1 con `productos` — se fusiona aquí para
         que la UI trabaje con un solo objeto Producto por fila. */
      const stockPorProducto = new Map<string, { stock_actual: unknown; stock_minimo: unknown }>();
      for (const row of inv.data ?? []) {
        stockPorProducto.set(String(row.producto_id), row);
      }
      const productosConStock = (pr.data ?? []).map((row) => {
        const base = rowToProducto(row);
        const stock = stockPorProducto.get(base.id);
        return stock
          ? { ...base, stockActual: Number(stock.stock_actual ?? 0), stockMinimo: Number(stock.stock_minimo ?? 0) }
          : base;
      });

      setEmpleados((e.data ?? []).map(rowToEmpleado));
      setNegocio((n.data ?? []).map(rowToNegocio)[0] ?? null);
      setSuscripcion((s.data ?? []).map(rowToSuscripcion)[0] ?? null);
      setClientes((cl.data ?? []).map(rowToCliente));
      setCitas((ci.data ?? []).map(rowToCita));
      setRecetas((re.data ?? []).map(rowToReceta));
      setProductos(productosConStock);
      setMovimientosStock((ms.data ?? []).map(rowToMovimientoStock));
      setVentas((ve.data ?? []).map(rowToVenta));
      setVentaItems((vi.data ?? []).map(rowToVentaItem));
      setGastos((ga.data ?? []).map(rowToGasto));
      setReady(true);
    }

    void cargar();
    let canal = supabase
      .channel("tenant:all")
      .on("postgres_changes", { event: "*", schema: "public", table: "empleados" }, () => void cargar())
      .on("postgres_changes", { event: "*", schema: "public", table: "negocios" }, () => void cargar())
      .on("postgres_changes", { event: "*", schema: "public", table: "suscripciones" }, () => void cargar());
    for (const t of TABLAS_DOMINIO) {
      canal = canal.on("postgres_changes", { event: "*", schema: "public", table: t }, () => void cargar());
    }
    const ch = canal.subscribe();
    return () => { activo = false; void supabase.removeChannel(ch); };
  }, [supabase]);

  /* ====== Mutaciones (Realtime refresca; no setState optimista) ====== */
  const updateEmpleado = useCallback(async (id: string, patch: Partial<Empleado>) => {
    await supabase.from("empleados").update(empleadoToRow(patch)).eq("id", id);
  }, [supabase]);

  const updateNegocio = useCallback(async (patch: Partial<Negocio>) => {
    if (!negocio) return;
    await supabase.from("negocios").update(negocioToRow(patch)).eq("id", negocio.id);
  }, [supabase, negocio]);

  const addCliente = useCallback(async (c: Partial<Cliente>) => {
    if (!negocio) return null;
    const { data } = await supabase.from("clientes").insert({ ...clienteToRow(c), negocio_id: negocio.id }).select("id").single();
    return data ? String(data.id) : null;
  }, [supabase, negocio]);
  const updateCliente = useCallback(async (id: string, patch: Partial<Cliente>) => {
    await supabase.from("clientes").update(clienteToRow(patch)).eq("id", id);
  }, [supabase]);
  const deleteCliente = useCallback(async (id: string) => {
    await supabase.from("clientes").delete().eq("id", id);
  }, [supabase]);

  const addCita = useCallback(async (c: Partial<Cita>) => {
    if (!negocio) return null;
    const { data } = await supabase.from("citas").insert({ ...citaToRow(c), negocio_id: negocio.id }).select("id").single();
    return data ? String(data.id) : null;
  }, [supabase, negocio]);
  const updateCita = useCallback(async (id: string, patch: Partial<Cita>) => {
    await supabase.from("citas").update(citaToRow(patch)).eq("id", id);
  }, [supabase]);
  const deleteCita = useCallback(async (id: string) => {
    await supabase.from("citas").delete().eq("id", id);
  }, [supabase]);

  const addReceta = useCallback(async (r: Partial<Receta>) => {
    if (!negocio) return;
    await supabase.from("recetas").insert({ ...recetaToRow(r), negocio_id: negocio.id });
  }, [supabase, negocio]);

  const addProducto = useCallback(async (p: Partial<Producto>, stockInicial: number, stockMinimo: number) => {
    if (!negocio) return;
    const { data } = await supabase.from("productos").insert({ ...productoToRow(p), negocio_id: negocio.id }).select("id").single();
    if (data) {
      await supabase.from("inventario").insert({ producto_id: data.id, stock_actual: stockInicial, stock_minimo: stockMinimo });
    }
  }, [supabase, negocio]);
  const updateProducto = useCallback(async (id: string, patch: Partial<Producto>) => {
    await supabase.from("productos").update(productoToRow(patch)).eq("id", id);
  }, [supabase]);

  /* Ajuste de stock: registra el movimiento (trazabilidad) y actualiza el
     contador en `inventario` — ver invariante en docs/architecture.md sobre
     por qué se guarda el movimiento y no solo el número. */
  const ajustarStock = useCallback(async (productoId: string, tipo: string, cantidad: number, motivo?: string) => {
    if (!negocio) return;
    const producto = productos.find((p) => p.id === productoId);
    if (!producto) return;
    const delta = tipo === "salida" ? -cantidad : cantidad;
    const nuevoStock = tipo === "ajuste" ? cantidad : Math.max(0, producto.stockActual + delta);

    await supabase.from("movimientos_stock").insert({
      negocio_id: negocio.id, producto_id: productoId, tipo, cantidad, motivo,
    });
    await supabase.from("inventario").update({ stock_actual: nuevoStock }).eq("producto_id", productoId);
  }, [supabase, negocio, productos]);

  /* Alta de venta + sus ítems. Simplificación de MVP: dos escrituras
     secuenciales (no hay transacción multi-tabla desde el cliente sin una
     función RPC en Postgres) — si el 2º paso fallara, quedaría una venta sin
     ítems; aceptable para el volumen de una óptica pyme, a revisar si se
     vuelve un problema real. */
  const addVenta = useCallback(async (v: Partial<Venta>, items: Array<Omit<VentaItem, "id" | "ventaId">>) => {
    if (!negocio) return;
    const { data } = await supabase.from("ventas").insert({ ...ventaToRow(v), negocio_id: negocio.id }).select("id").single();
    if (!data) return;
    const ventaId = String(data.id);
    if (items.length > 0) {
      await supabase.from("venta_items").insert(
        items.map((it) => ({
          venta_id: ventaId, producto_id: it.productoId || null,
          descripcion: it.descripcion, cantidad: it.cantidad,
          precio_unitario: it.precioUnitario, subtotal: it.subtotal,
        })),
      );
    }
    /* Descuenta stock de los ítems con producto asociado. */
    for (const it of items) {
      if (it.productoId) {
        await ajustarStock(it.productoId, "salida", it.cantidad, `Venta ${ventaId}`);
      }
    }
  }, [supabase, negocio, ajustarStock]);

  const addGasto = useCallback(async (g: Partial<Gasto>) => {
    if (!negocio) return;
    await supabase.from("gastos").insert({ ...gastoToRow(g), negocio_id: negocio.id });
  }, [supabase, negocio]);
  const deleteGasto = useCallback(async (id: string) => {
    await supabase.from("gastos").delete().eq("id", id);
  }, [supabase]);

  const value: DataCtx = {
    empleados, negocio, suscripcion, clientes, citas, recetas, productos,
    movimientosStock, ventas, ventaItems, gastos, ready,
    updateEmpleado, updateNegocio,
    addCliente, updateCliente, deleteCliente,
    addCita, updateCita, deleteCita,
    addReceta, addProducto, updateProducto, ajustarStock,
    addVenta, addGasto, deleteGasto,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ================= HOOK ================= */
export function useData(): DataCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useData debe usarse dentro de <DataProvider>");
  return v;
}
