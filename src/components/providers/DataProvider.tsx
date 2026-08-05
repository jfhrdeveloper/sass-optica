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
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  rowToEmpleado, empleadoToRow, rowToRolPersonalizado, rolPersonalizadoToRow, rowToNegocio, negocioToRow, rowToSuscripcion,
  rowToSucursal, sucursalToRow,
  rowToCliente, clienteToRow, rowToCita, citaToRow, rowToReceta, recetaToRow,
  rowToExamenOptometrico, examenOptometricoToRow,
  rowToProducto, productoToRow, rowToMovimientoStock, rowToVenta, ventaToRow,
  rowToVentaItem, rowToGasto, gastoToRow, rowToDescuento, descuentoToRow,
  rowToProveedor, proveedorToRow,
  rowToCotizacion, cotizacionToRow, rowToCotizacionItem,
  rowToOrdenLaboratorio, ordenLaboratorioToRow,
  rowToCaja, cajaToRow,
  rowToAsistencia, asistenciaToRow, rowToAsistenciaFoto, asistenciaFotoToRow, rowToPagoSueldo, pagoSueldoToRow,
} from "@/lib/data/mappers";
import { isMockMode } from "@/lib/mock/mock-mode";
import { contarVentasDelMes, puedeRegistrarVenta } from "@/lib/limites-plan";
import { LIMITE_VENTAS_MES_GRATIS } from "@/lib/precios";
import { calcularCuadreCaja, sumaDesglose, efectivoDeDesglose } from "@/lib/caja";
import {
  MOCK_NEGOCIO, MOCK_EMPLEADOS, MOCK_ROLES_PERSONALIZADOS, MOCK_SUSCRIPCION, MOCK_SUCURSALES, MOCK_CLIENTES, MOCK_CITAS,
  MOCK_RECETAS, MOCK_EXAMENES_OPTOMETRICOS, MOCK_PRODUCTOS, MOCK_MOVIMIENTOS_STOCK, MOCK_VENTAS, MOCK_VENTA_ITEMS, MOCK_ORDENES_LABORATORIO, MOCK_CAJAS, MOCK_GASTOS,
  MOCK_DESCUENTOS, MOCK_PROVEEDORES, MOCK_COTIZACIONES, MOCK_COTIZACION_ITEMS, MOCK_ASISTENCIAS, MOCK_ASISTENCIA_FOTOS, MOCK_PAGOS_SUELDO,
} from "@/lib/mock/mock-data";

/* Mismo formato que `to_char(fecha, 'DD/MM/YYYY')` del trigger SQL
   fn_pago_sueldo_sync_gasto() — la rama mock replica esa descripción a mano
   (no hay triggers de DB en modo mock). */
function fechaCorta(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

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
  /* Permisos LEGADO por encima del rol principal fijo — ver columna
     `permisos` en supabase-schema.sql y src/lib/permisos.ts (MODULOS_DELEGABLES,
     valores 'lectura' | 'escritura'). Se IGNORA por completo si
     `rolPersonalizadoId` está asignado (ver ese campo). Nunca incluye
     gestión de empleados/ajustes, eso queda siempre exclusivo de
     `administrador`. */
  permisos:      Record<string, string>;
  /* Rol personalizado opcional (ver interface RolPersonalizado más abajo) —
     si está asignado, sus permisos reemplazan a `permisos` de arriba (nunca
     se combinan), Y reemplaza también el piso de acceso por defecto del rol
     principal — ver puede_gestionar()/sin_rol_personalizado() en el schema. */
  rolPersonalizadoId?: string;
  // % de comisión sobre sus propias ventas (estado "pagada") — ver lib/comisiones.ts.
  comisionPct:   number;
  // NULL = ve/gestiona todas las sedes del negocio (caso común). Ver current_sucursal() en el schema.
  sucursalId?:   string;
  /* Asistencia/sueldos — config por empleado (no por negocio, cada uno puede
     tener un turno distinto). Editable SOLO por administrador — ver el
     trigger bloquear_autoescalada_empleado() en supabase-schema.sql, que
     bloquea el auto-edit de estos campos igual que ya hacía con rol/permisos. */
  horaEntradaEsperada?: string; // "HH:mm"
  horaSalidaEsperada?:  string; // "HH:mm"
  toleranciaTardanzaMin: number; // minutos de gracia antes de "tarde", default 10
  tipoPago?:      TipoPeriodoPago;
  montoPagoBase?: number;
  activo:        boolean;
}

/* Frecuencia de pago de sueldo — compartida por Empleado.tipoPago (el
   default que se pre-llena al registrar un pago) y PagoSueldo.tipoPeriodo
   (el valor real de cada pago, editable caso por caso). */
export type TipoPeriodoPago = "diario" | "semanal" | "quincenal" | "mensual";

/* Preset de permisos delegables reutilizable, aplicable a varios empleados
   de una vez — ver public.roles_personalizados en supabase-schema.sql. Sin
   distinción de a qué rol principal aplica: el mismo rol personalizado
   sirve igual para un encargado que para un trabajador (nunca se asigna a
   un administrador — eso se resuelve en la UI, /dashboard/empleados no
   muestra el selector para esa fila). */
export interface RolPersonalizado {
  id:         string;
  negocioId:  string;
  nombre:     string;
  /** Un valor por módulo delegable (ver MODULOS_DELEGABLES en permisos.ts):
   *  'lectura' | 'escritura'. Ausente = ninguno. */
  permisos:   Record<string, string>;
}

export interface Negocio {
  id:         string;
  nombre:     string;
  subdominio: string;
  ruc?:       string;
  telefono?:  string;
  direccion?: string;
  logoUrl?:   string;
  colorPrimario?: string;
  activo:     boolean;
}

/* Multisedes, opcional — la mayoría de negocios no crea ninguna. Ver
   comentario de la tabla `sucursales` en supabase-schema.sql. */
export interface Sucursal {
  id: string; negocioId: string; nombre: string;
  direccion?: string; telefono?: string; activo: boolean;
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
  /* Papelera (soft delete): si tiene valor, el cliente está eliminado pero
     recuperable — se purga solo a los 30 días (pg_cron, ver
     purgar_clientes_papelera() en supabase-schema.sql). `deleteCliente` solo
     setea este campo; el borrado real de fila queda en `purgarCliente`. */
  eliminadoEn?: string;
}

export interface Cita {
  id: string; negocioId: string; clienteId: string; empleadoId?: string; sucursalId?: string;
  fechaHora: string; motivo?: string; estado: string; notas?: string;
  /** Minutos que dura la cita — opcional: si no viene (citas antiguas o
   *  agendadas sin arrastrar), la UI asume DURACION_DEFECTO_MIN (30). */
  duracionMin?: number;
}

export interface Receta {
  id: string; negocioId: string; clienteId: string; citaId?: string;
  fecha: string; tipo: string;
  odEsfera?: number; odCilindro?: number; odEje?: number; odAdicion?: number;
  oiEsfera?: number; oiCilindro?: number; oiEje?: number; oiAdicion?: number;
  dip?: number; notas?: string;
}

/* Separado de Receta a propósito — ver comentario de la tabla en
   supabase-schema.sql: un examen no siempre coincide 1:1 con una receta. */
export interface ExamenOptometrico {
  id: string; negocioId: string; clienteId: string; citaId?: string; recetaId?: string;
  fecha: string;
  odAvSc?: string; odAvCc?: string; oiAvSc?: string; oiAvCc?: string;
  odK1?: number; odK2?: number; odEjeK?: number;
  oiK1?: number; oiK2?: number; oiEjeK?: number;
  anamnesis?: string; notas?: string;
}

export interface Producto {
  id: string; negocioId: string; proveedorId?: string; codigo?: string; nombre: string; categoria: string;
  marca?: string; descripcion?: string; precioVenta: number; precioCosto: number;
  // Solo aplican si categoria === "lente_contacto" (ver check de la tabla productos).
  curvaBase?: number; diametro?: number; potencia?: number;
  /** Solo lente_contacto — días de uso que rinde una caja/paquete. Con la
   *  fecha de venta se calcula la próxima reposición esperada del cliente
   *  (ver lib/seguimiento-clientes.ts). */
  duracionReposicionDias?: number;
  /** Meses de garantía del proveedor — aplica a cualquier categoría. */
  garantiaMeses?: number;
  imagenUrl?: string; activo: boolean;
  stockActual: number; stockMinimo: number;
}

export interface MovimientoStock {
  id: string; negocioId: string; productoId: string; sucursalId?: string; tipo: string;
  cantidad: number; motivo?: string; fecha: string;
}

export interface Venta {
  id: string; negocioId: string; clienteId?: string; empleadoId?: string; sucursalId?: string; fecha: string;
  subtotal: number; igv: number; total: number;
  metodoPago: string; estado: string; montoPagado: number; notas?: string;
}

export interface VentaItem {
  id: string; ventaId: string; productoId?: string;
  descripcion: string; cantidad: number; precioUnitario: number; subtotal: number;
}

export type EstadoOrdenLaboratorio =
  | "generado" | "enviado" | "en_proceso" | "terminado"
  | "en_transito" | "recibido" | "entregado" | "cancelado";

/* Seguimiento del armado de lentes en el laboratorio/taller — ver
   src/lib/laboratorio.ts para las transiciones válidas entre estados. */
export interface OrdenLaboratorio {
  id: string; negocioId: string;
  ventaId?: string; ventaItemId?: string; clienteId?: string; recetaId?: string; empleadoId?: string;
  sucursalOrigenId?: string; sucursalDestinoId?: string;
  laboratorioNombre?: string;
  estado: EstadoOrdenLaboratorio;
  fechaGenerado: string; fechaEstimada?: string; avisadoWhatsappEn?: string;
  notas?: string;
}

export type EstadoCaja = "abierta" | "cerrada";

/** Un ítem del desglose de apertura de caja — método/etiqueta libre (ej.
 *  "Efectivo", "Yape", "Fondo fijo") + monto. Ver `lib/caja.ts`. */
export interface ItemAperturaCaja { metodo: string; monto: number }

/* Apertura/cierre diario con cuadre por método de pago — ver
   src/lib/caja.ts para el cálculo de los totales congelados al cerrar. */
export interface Caja {
  id: string; negocioId: string; sucursalId?: string;
  empleadoAperturaId?: string; empleadoCierreId?: string;
  fechaApertura: string; fechaCierre?: string;
  montoInicial: number;
  desgloseApertura: ItemAperturaCaja[];
  totalEfectivo: number; totalTarjeta: number; totalYape: number; totalPlin: number; totalTransferencia: number;
  montoEfectivoEsperado: number; montoEfectivoContado?: number; diferencia?: number;
  estado: EstadoCaja;
  notas?: string;
}

export interface Gasto {
  id: string; negocioId: string; proveedorId?: string; categoria: string;
  descripcion?: string; monto: number; fecha: string;
}

export interface Proveedor {
  id: string; negocioId: string; nombre: string; ruc?: string;
  contacto?: string; telefono?: string; email?: string; direccion?: string;
  notas?: string; activo: boolean;
}

/* Documento previo a la venta (idea de UX tomada de research de
   competencia): mismo shape que Venta+VentaItem pero SIN tocar stock ni
   caja — solo se refleja en el negocio de verdad cuando se "convierte" en
   una Venta real (ver convertirCotizacionAVenta más abajo). */
export interface Cotizacion {
  id: string; negocioId: string; clienteId?: string; ventaId?: string;
  fecha: string; vigenciaHasta?: string;
  subtotal: number; igv: number; total: number;
  estado: "pendiente" | "aceptada" | "rechazada" | "vencida";
  notas?: string;
}

export interface CotizacionItem {
  id: string; cotizacionId: string; productoId?: string;
  descripcion: string; cantidad: number; precioUnitario: number; subtotal: number;
}

export interface Descuento {
  id: string; negocioId: string; codigo: string;
  tipo: "porcentaje" | "monto"; valor: number;
  /** A qué documento se le puede aplicar este cupón. */
  aplicaA: "cotizaciones" | "ventas" | "ambos";
  vigenciaDesde?: string; vigenciaHasta?: string;
  limiteUsos?: number; usos: number; activo: boolean;
}

export type EstadoAsistencia = "presente" | "tarde" | "falta" | "permiso";

/* 1 fila por empleado por día — ver comentario largo de la tabla en
   supabase-schema.sql. El estado se SUGIERE en el cliente (lib/asistencia.ts)
   comparando horaEntrada contra el horario esperado del empleado, pero
   siempre queda editable a mano después ("todo debe ser modificable",
   pedido explícito) — por eso viaja como campo propio, no derivado. */
export interface Asistencia {
  id: string; negocioId: string; empleadoId: string;
  // Sede del día — se fija al marcar ENTRADA (solo si es distinta a la
  // habitual del empleado); la salida la hereda, no se vuelve a preguntar.
  sucursalId?: string;
  fecha: string; // "YYYY-MM-DD"
  horaEntrada?: string; // "HH:mm"
  horaSalida?:  string; // "HH:mm"
  estado: EstadoAsistencia;
  marcadoPor: "empleado" | "admin";
  // Flags baratos (la foto en sí vive en AsistenciaFoto, aparte).
  fotoEntrada: boolean;
  fotoSalida:  boolean;
  // Verificación SEPARADA por evento — cada marca se aprueba independiente,
  // no un solo booleano para el día (mismo criterio que tramys-rrhh).
  verificadoEntradaPor?: string;
  verificadoEntradaAt?:  string;
  verificadoSalidaPor?:  string;
  verificadoSalidaAt?:   string;
  notas?: string;
}

/** Foto de evidencia opcional de una marca — separada de Asistencia a
 *  propósito (el base64 no debe viajar en cada fetch de la lista, solo
 *  cuando se pide ver la foto puntual). Retención 15 días en el servidor
 *  real (pg_cron); en mock no se purga sola. */
export interface AsistenciaFoto {
  id: string; asistenciaId: string; tipo: "entrada" | "salida"; fotoBase64: string;
}

/* Registro de pago (NO planilla peruana completa, sin AFP/ONP/gratificación/
   CTS — ver comentario de la tabla en supabase-schema.sql). `gastoId` lo
   mantiene el propio `addPagoSueldo`/`deletePagoSueldo` en modo mock (en
   Supabase real lo hacen los triggers `fn_pago_sueldo_sync_gasto`/
   `fn_pago_sueldo_borra_gasto`) — nunca se escribe a mano desde la UI. */
export interface PagoSueldo {
  id: string; negocioId: string; empleadoId: string;
  tipoPeriodo: TipoPeriodoPago;
  periodoDesde: string; periodoHasta: string;
  fechaPago: string;
  monto: number;
  metodoPago: string;
  notas?: string;
  gastoId?: string;
  registradoPor?: string;
}

interface DataCtx {
  empleados:        Empleado[];
  rolesPersonalizados: RolPersonalizado[];
  negocio:          Negocio | null;
  suscripcion:      Suscripcion | null;
  sucursales:       Sucursal[];
  clientes:         Cliente[];
  citas:            Cita[];
  recetas:          Receta[];
  examenesOptometricos: ExamenOptometrico[];
  productos:        Producto[];
  movimientosStock: MovimientoStock[];
  ventas:           Venta[];
  ventaItems:       VentaItem[];
  ordenesLaboratorio: OrdenLaboratorio[];
  cajas:            Caja[];
  gastos:           Gasto[];
  asistencias:      Asistencia[];
  asistenciaFotos:  AsistenciaFoto[];
  pagosSueldo:      PagoSueldo[];
  descuentos:       Descuento[];
  proveedores:      Proveedor[];
  cotizaciones:     Cotizacion[];
  cotizacionItems:  CotizacionItem[];
  ready:            boolean;
  /* Multisedes: sede elegida en el selector del topbar (`DashboardTopbar.tsx`),
     persistida en localStorage. `null` = todas las sedes. Es SOLO un filtro
     de conveniencia sobre datos que RLS ya aprobó — las páginas de citas y
     ventas lo consumen para acotar sus listas cuando el empleado puede ver
     más de una sede. */
  sucursalFiltro:    string | null;
  setSucursalFiltro: (id: string | null) => void;
  /* CRUD (la mutación va a Supabase; Realtime re-fetchea). */
  updateEmpleado: (id: string, patch: Partial<Empleado>) => Promise<void>;
  addRolPersonalizado:    (p: Partial<RolPersonalizado>) => Promise<void>;
  updateRolPersonalizado: (id: string, patch: Partial<RolPersonalizado>) => Promise<void>;
  deleteRolPersonalizado: (id: string) => Promise<void>;
  updateNegocio:  (patch: Partial<Negocio>) => Promise<void>;
  addSucursal:    (s: Partial<Sucursal>) => Promise<string | null>;
  updateSucursal: (id: string, patch: Partial<Sucursal>) => Promise<void>;
  /* Reparto de stock inicial (Multisedes Fase B): al crear la PRIMERA
     sucursal de un negocio que ya tenía productos con stock, ese stock
     vive en `inventario` y `stock_sucursal` todavía no tiene ninguna fila
     — sin este paso, el stock de esos productos "desaparecería" de los
     reportes por sede (ver comentario junto a `stock_sucursal` en
     supabase-schema.sql). `reparto` es SIEMPRE un valor ABSOLUTO por
     producto (no un delta) — normalmente el stock actual completo, la UI
     lo deja editar para repartos parciales. */
  repartirStockInicial: (sucursalId: string, reparto: Record<string, number>) => Promise<void>;
  addCliente:     (c: Partial<Cliente>) => Promise<string | null>;
  updateCliente:  (id: string, patch: Partial<Cliente>) => Promise<void>;
  deleteCliente:  (id: string) => Promise<void>;
  restaurarCliente: (id: string) => Promise<void>;
  purgarCliente:  (id: string) => Promise<void>;
  addCita:        (c: Partial<Cita>) => Promise<string | null>;
  updateCita:     (id: string, patch: Partial<Cita>) => Promise<void>;
  deleteCita:     (id: string) => Promise<void>;
  addReceta:      (r: Partial<Receta>) => Promise<void>;
  addExamenOptometrico:    (e: Partial<ExamenOptometrico>) => Promise<void>;
  updateExamenOptometrico: (id: string, patch: Partial<ExamenOptometrico>) => Promise<void>;
  addProducto:    (p: Partial<Producto>, stockInicial: number, stockMinimo: number) => Promise<void>;
  updateProducto: (id: string, patch: Partial<Producto>) => Promise<void>;
  ajustarStock:   (productoId: string, tipo: string, cantidad: number, motivo?: string, sucursalId?: string) => Promise<void>;
  addVenta:       (v: Partial<Venta>, items: Array<Omit<VentaItem, "id" | "ventaId">>) => Promise<{ id: string | null; error: string | null }>;
  anularVenta:    (id: string) => Promise<void>;
  addOrdenLaboratorio:    (o: Partial<OrdenLaboratorio>) => Promise<void>;
  updateOrdenLaboratorio: (id: string, patch: Partial<OrdenLaboratorio>) => Promise<void>;
  abrirCaja:      (desglose: ItemAperturaCaja[], empleadoId?: string, sucursalId?: string) => Promise<void>;
  cerrarCaja:     (id: string, montoContado: number, empleadoId?: string) => Promise<void>;
  addGasto:       (g: Partial<Gasto>) => Promise<void>;
  deleteGasto:    (id: string) => Promise<void>;
  /* Upsert de "mi propia asistencia de hoy" (self-registro, cualquier
     empleado) — inserta si no marcó nada todavía en `patch.fecha` (default
     hoy), actualiza si ya existe. `updateAsistencia` es la corrección de
     admin/encargado sobre la fila de OTRO empleado. */
  marcarAsistencia: (patch: Partial<Asistencia> & { fotoBase64?: string }) => Promise<void>;
  updateAsistencia: (id: string, patch: Partial<Asistencia>) => Promise<void>;
  /* Aprueba UN evento (entrada o salida) por separado — nunca "el día
     completo" (mismo criterio que tramys-rrhh). `verificadorId` lo pasa el
     caller (la página ya conoce al empleado de la sesión vía useSession();
     DataProvider no depende de ese provider). */
  verificarAsistencia: (id: string, evento: "entrada" | "salida", verificadorId: string) => Promise<void>;
  addPagoSueldo:    (p: Partial<PagoSueldo>) => Promise<string | null>;
  deletePagoSueldo: (id: string) => Promise<void>;
  addDescuento:    (d: Partial<Descuento>) => Promise<void>;
  updateDescuento: (id: string, patch: Partial<Descuento>) => Promise<void>;
  deleteDescuento: (id: string) => Promise<void>;
  addProveedor:    (p: Partial<Proveedor>) => Promise<void>;
  updateProveedor: (id: string, patch: Partial<Proveedor>) => Promise<void>;
  deleteProveedor: (id: string) => Promise<void>;
  addCotizacion:    (c: Partial<Cotizacion>, items: Array<Omit<CotizacionItem, "id" | "cotizacionId">>) => Promise<void>;
  updateCotizacion: (id: string, patch: Partial<Cotizacion>) => Promise<void>;
  deleteCotizacion: (id: string) => Promise<void>;
  convertirCotizacionAVenta: (cotizacionId: string) => Promise<{ ok: boolean; error: string | null }>;
}

const Ctx = createContext<DataCtx | null>(null);
const SUCURSAL_FILTRO_STORAGE_KEY = "sucursal_filtro";

const TABLAS_DOMINIO = [
  "sucursales", "clientes", "citas", "recetas", "examenes_optometricos", "productos", "inventario", "stock_sucursal",
  "movimientos_stock", "ventas", "venta_items", "ordenes_laboratorio", "cajas", "gastos",
  "descuentos", "roles_personalizados",
  "proveedores", "cotizaciones", "cotizacion_items", "asistencias", "pagos_sueldo",
  // asistencia_fotos NO lleva Realtime a propósito (mismo criterio que
  // tramys-rrhh: la foto se carga bajo demanda, no vale la pena suscribirse
  // a sus cambios) — igual se trae una vez en el Promise.all de `cargar()`.
] as const;

/* ================= PROVIDER ================= */
export function DataProvider({ children }: { children: React.ReactNode }) {
  const mock = isMockMode();
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const [sucursalFiltro, setSucursalFiltroState] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage no existe en SSR
    setSucursalFiltroState(window.localStorage.getItem(SUCURSAL_FILTRO_STORAGE_KEY));
  }, []);
  const setSucursalFiltro = useCallback((id: string | null) => {
    if (id) window.localStorage.setItem(SUCURSAL_FILTRO_STORAGE_KEY, id);
    else window.localStorage.removeItem(SUCURSAL_FILTRO_STORAGE_KEY);
    setSucursalFiltroState(id);
  }, []);
  const [empleados, setEmpleados]     = useState<Empleado[]>(mock ? MOCK_EMPLEADOS : []);
  const [rolesPersonalizados, setRolesPersonalizados] = useState<RolPersonalizado[]>(mock ? MOCK_ROLES_PERSONALIZADOS : []);
  const [negocio, setNegocio]         = useState<Negocio | null>(mock ? MOCK_NEGOCIO : null);
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(mock ? MOCK_SUSCRIPCION : null);
  const [sucursales, setSucursales]   = useState<Sucursal[]>(mock ? MOCK_SUCURSALES : []);
  const [clientes, setClientes]       = useState<Cliente[]>(mock ? MOCK_CLIENTES : []);
  const [citas, setCitas]             = useState<Cita[]>(mock ? MOCK_CITAS : []);
  const [recetas, setRecetas]         = useState<Receta[]>(mock ? MOCK_RECETAS : []);
  const [examenesOptometricos, setExamenesOptometricos] = useState<ExamenOptometrico[]>(mock ? MOCK_EXAMENES_OPTOMETRICOS : []);
  const [productos, setProductos]     = useState<Producto[]>(mock ? MOCK_PRODUCTOS : []);
  const [movimientosStock, setMovimientosStock] = useState<MovimientoStock[]>(mock ? MOCK_MOVIMIENTOS_STOCK : []);
  /* Filas crudas de `stock_sucursal` (Multisedes Fase B) — no se expone en
     DataCtx (ninguna página necesita hoy el detalle por sede, solo el total
     ya fusionado en `Producto.stockActual`); `ajustarStock` sí la consulta
     para saber el stock ANTES de aplicar un delta en una sede puntual. */
  const [stockSucursalRaw, setStockSucursalRaw] = useState<{ producto_id: string; sucursal_id: string; stock_actual: unknown; stock_minimo: unknown }[]>([]);
  const [ventas, setVentas]           = useState<Venta[]>(mock ? MOCK_VENTAS : []);
  const [ventaItems, setVentaItems]   = useState<VentaItem[]>(mock ? MOCK_VENTA_ITEMS : []);
  const [ordenesLaboratorio, setOrdenesLaboratorio] = useState<OrdenLaboratorio[]>(mock ? MOCK_ORDENES_LABORATORIO : []);
  const [cajas, setCajas]             = useState<Caja[]>(mock ? MOCK_CAJAS : []);
  const [gastos, setGastos]           = useState<Gasto[]>(mock ? MOCK_GASTOS : []);
  const [asistencias, setAsistencias] = useState<Asistencia[]>(mock ? MOCK_ASISTENCIAS : []);
  /* Cargada de punta a punta igual que el resto (mismo Promise.all de abajo)
     por simplicidad/consistencia con el resto del provider — a diferencia
     de tramys-rrhh, que carga esto bajo demanda solo al ver una foto
     puntual. Si el volumen de fotos crece en un negocio real, vale la pena
     revisar esto (traer solo metadata + un fetch aparte por foto), pero hoy
     no hay Supabase real conectado y esto no complica el modo mock. */
  const [asistenciaFotos, setAsistenciaFotos] = useState<AsistenciaFoto[]>(mock ? MOCK_ASISTENCIA_FOTOS : []);
  const [pagosSueldo, setPagosSueldo] = useState<PagoSueldo[]>(mock ? MOCK_PAGOS_SUELDO : []);
  const [descuentos, setDescuentos]   = useState<Descuento[]>(mock ? MOCK_DESCUENTOS : []);
  const [proveedores, setProveedores] = useState<Proveedor[]>(mock ? MOCK_PROVEEDORES : []);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>(mock ? MOCK_COTIZACIONES : []);
  const [cotizacionItems, setCotizacionItems] = useState<CotizacionItem[]>(mock ? MOCK_COTIZACION_ITEMS : []);
  const [ready, setReady]             = useState(mock);

  /* ====== Carga inicial (todas las tablas en paralelo) + Realtime ======
     `cargar` vive DENTRO del efecto para que el fetch se dispare como
     reacción al montaje, no como una llamada a setState "suelta" en el
     cuerpo del efecto. `activo` evita setState tras desmontar.

     En modo mock (ver mock-mode.ts) el estado ya arrancó poblado desde
     mock-data.ts arriba — no hay Supabase real al cual conectarse ni
     Realtime que suscribir. */
  useEffect(() => {
    if (mock) return;
    let activo = true;

    async function cargar() {
      const [e, rp, n, s, su, cl, ci, re, eo, pr, inv, ss, ms, ve, vi, ol, caj, ga, de, pv, co, coi, asi, asf, ps] = await Promise.all([
        supabase.from("empleados").select("*"),
        supabase.from("roles_personalizados").select("*"),
        supabase.from("negocios").select("*"),
        supabase.from("suscripciones").select("*"),
        supabase.from("sucursales").select("*"),
        supabase.from("clientes").select("*"),
        supabase.from("citas").select("*"),
        supabase.from("recetas").select("*"),
        supabase.from("examenes_optometricos").select("*"),
        supabase.from("productos").select("*"),
        supabase.from("inventario").select("*"),
        supabase.from("stock_sucursal").select("*"),
        supabase.from("movimientos_stock").select("*"),
        supabase.from("ventas").select("*"),
        supabase.from("venta_items").select("*"),
        supabase.from("ordenes_laboratorio").select("*"),
        supabase.from("cajas").select("*"),
        supabase.from("gastos").select("*"),
        supabase.from("descuentos").select("*"),
        supabase.from("proveedores").select("*"),
        supabase.from("cotizaciones").select("*"),
        supabase.from("cotizacion_items").select("*"),
        supabase.from("asistencias").select("*"),
        supabase.from("asistencia_fotos").select("*"),
        supabase.from("pagos_sueldo").select("*"),
      ]);
      if (!activo) return;

      /* El stock se fusiona aquí para que la UI trabaje con un solo objeto
         Producto por fila. Regla binaria de Multisedes Fase B: sin ninguna
         sucursal creada (el caso común), `inventario` (1:1 con productos)
         sigue siendo la fuente de verdad, cero cambio de comportamiento. Con
         al menos una sucursal, el stock de un producto pasa a ser la SUMA
         de sus filas en `stock_sucursal` — nunca se persiste ese total
         duplicado en DB, se calcula acá en cada carga. */
      const hayMultisedes = (su.data ?? []).length > 0;
      setStockSucursalRaw((ss.data ?? []) as { producto_id: string; sucursal_id: string; stock_actual: unknown; stock_minimo: unknown }[]);

      const stockPorProducto = new Map<string, { stock_actual: unknown; stock_minimo: unknown }>();
      if (hayMultisedes) {
        for (const row of ss.data ?? []) {
          const id = String(row.producto_id);
          const previo = stockPorProducto.get(id);
          stockPorProducto.set(id, {
            stock_actual: Number(previo?.stock_actual ?? 0) + Number(row.stock_actual ?? 0),
            stock_minimo: Number(previo?.stock_minimo ?? 0) + Number(row.stock_minimo ?? 0),
          });
        }
      } else {
        for (const row of inv.data ?? []) {
          stockPorProducto.set(String(row.producto_id), row);
        }
      }
      const productosConStock = (pr.data ?? []).map((row) => {
        const base = rowToProducto(row);
        const stock = stockPorProducto.get(base.id);
        return stock
          ? { ...base, stockActual: Number(stock.stock_actual ?? 0), stockMinimo: Number(stock.stock_minimo ?? 0) }
          : base;
      });

      setEmpleados((e.data ?? []).map(rowToEmpleado));
      setRolesPersonalizados((rp.data ?? []).map(rowToRolPersonalizado));
      setNegocio((n.data ?? []).map(rowToNegocio)[0] ?? null);
      setSuscripcion((s.data ?? []).map(rowToSuscripcion)[0] ?? null);
      setSucursales((su.data ?? []).map(rowToSucursal));
      setClientes((cl.data ?? []).map(rowToCliente));
      setCitas((ci.data ?? []).map(rowToCita));
      setRecetas((re.data ?? []).map(rowToReceta));
      setExamenesOptometricos((eo.data ?? []).map(rowToExamenOptometrico));
      setProductos(productosConStock);
      setMovimientosStock((ms.data ?? []).map(rowToMovimientoStock));
      setVentas((ve.data ?? []).map(rowToVenta));
      setVentaItems((vi.data ?? []).map(rowToVentaItem));
      setOrdenesLaboratorio((ol.data ?? []).map(rowToOrdenLaboratorio));
      setCajas((caj.data ?? []).map(rowToCaja));
      setGastos((ga.data ?? []).map(rowToGasto));
      setDescuentos((de.data ?? []).map(rowToDescuento));
      setProveedores((pv.data ?? []).map(rowToProveedor));
      setCotizaciones((co.data ?? []).map(rowToCotizacion));
      setCotizacionItems((coi.data ?? []).map(rowToCotizacionItem));
      setAsistencias((asi.data ?? []).map(rowToAsistencia));
      setAsistenciaFotos((asf.data ?? []).map(rowToAsistenciaFoto));
      setPagosSueldo((ps.data ?? []).map(rowToPagoSueldo));
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
  }, [supabase, mock]);

  /* ====== Telemetría de uso (panel admin) ======
     Un evento por cada módulo del dashboard que se visita — insert-only,
     "fire and forget": si falla (offline, RLS, lo que sea) no debe romper ni
     avisarle nada al usuario del negocio, es solo la señal de adopción que
     lee admin.dominio (ver docs/supabase-schema.sql: eventos_uso). No se
     registra nada en modo mock (no hay Supabase real al cual escribir) ni
     fuera de /dashboard (login, registro, landing no son "uso del
     sistema"). Se re-dispara en cada cambio de ruta, nunca por re-render:
     la dependencia es `pathname`, no un timer. */
  useEffect(() => {
    if (mock || !negocio || !pathname?.startsWith("/dashboard")) return;
    let cancelado = false;
    void (async () => {
      try {
        if (!cancelado) await supabase.from("eventos_uso").insert({ negocio_id: negocio.id, ruta: pathname });
      } catch {
        /* best-effort — ver comentario arriba */
      }
    })();
    return () => { cancelado = true; };
  }, [supabase, negocio, mock, pathname]);

  /* ====== Mutaciones (Realtime refresca; no setState optimista) ======
     Cada una arranca con una rama `if (mock)` que opera sobre el estado
     local en vez de llamar a Supabase — ver mock-mode.ts. Esas ramas son
     temporales, se quitan junto con el resto del modo mock. */
  const updateEmpleado = useCallback(async (id: string, patch: Partial<Empleado>) => {
    if (mock) { setEmpleados((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e))); return; }
    await supabase.from("empleados").update(empleadoToRow(patch)).eq("id", id);
  }, [supabase, mock]);

  const updateNegocio = useCallback(async (patch: Partial<Negocio>) => {
    if (!negocio) return;
    if (mock) { setNegocio((prev) => (prev ? { ...prev, ...patch } : prev)); return; }
    await supabase.from("negocios").update(negocioToRow(patch)).eq("id", negocio.id);
  }, [supabase, negocio, mock]);

  const addSucursal = useCallback(async (s: Partial<Sucursal>) => {
    if (!negocio) return null;
    if (mock) {
      const id = crypto.randomUUID();
      setSucursales((prev) => [...prev, { id, negocioId: negocio.id, nombre: "", activo: true, ...s }]);
      return id;
    }
    const { data } = await supabase.from("sucursales").insert({ ...sucursalToRow(s), negocio_id: negocio.id }).select("id").single();
    return data ? String(data.id) : null;
  }, [supabase, negocio, mock]);

  const repartirStockInicial = useCallback(async (sucursalId: string, reparto: Record<string, number>) => {
    if (!negocio) return;
    const entradas = Object.entries(reparto).filter(([, cantidad]) => cantidad > 0);
    if (entradas.length === 0) return;
    if (mock) {
      const idsRepartidos = new Set(entradas.map(([productoId]) => productoId));
      setStockSucursalRaw((prev) => {
        const resto = prev.filter((r) => !(r.sucursal_id === sucursalId && idsRepartidos.has(r.producto_id)));
        const nuevas = entradas.map(([productoId, cantidad]) => ({
          producto_id: productoId, sucursal_id: sucursalId, stock_actual: cantidad,
          stock_minimo: productos.find((p) => p.id === productoId)?.stockMinimo ?? 0,
        }));
        return [...resto, ...nuevas];
      });
      setMovimientosStock((prev) => [
        ...prev,
        ...entradas.map(([productoId, cantidad]) => ({
          id: crypto.randomUUID(), negocioId: negocio.id, productoId, sucursalId,
          tipo: "ajuste", cantidad, motivo: "Reparto inicial multisedes", fecha: new Date().toISOString(),
        })),
      ]);
      return;
    }
    await supabase.from("stock_sucursal").upsert(entradas.map(([productoId, cantidad]) => ({
      producto_id: productoId, sucursal_id: sucursalId, stock_actual: cantidad,
      stock_minimo: productos.find((p) => p.id === productoId)?.stockMinimo ?? 0,
    })));
    await supabase.from("movimientos_stock").insert(entradas.map(([productoId, cantidad]) => ({
      negocio_id: negocio.id, producto_id: productoId, sucursal_id: sucursalId, tipo: "ajuste", cantidad, motivo: "Reparto inicial multisedes",
    })));
  }, [supabase, negocio, productos, mock]);

  const updateSucursal = useCallback(async (id: string, patch: Partial<Sucursal>) => {
    if (mock) {
      setSucursales((prev) => prev.map((su) => (su.id === id ? { ...su, ...patch } : su)));
      return;
    }
    await supabase.from("sucursales").update(sucursalToRow(patch)).eq("id", id);
  }, [supabase, mock]);

  const addCliente = useCallback(async (c: Partial<Cliente>) => {
    if (!negocio) return null;
    if (mock) {
      const id = crypto.randomUUID();
      setClientes((prev) => [...prev, { id, negocioId: negocio.id, nombres: "", apellidos: "", documentoTipo: "DNI", ...c }]);
      return id;
    }
    const { data } = await supabase.from("clientes").insert({ ...clienteToRow(c), negocio_id: negocio.id }).select("id").single();
    return data ? String(data.id) : null;
  }, [supabase, negocio, mock]);
  const updateCliente = useCallback(async (id: string, patch: Partial<Cliente>) => {
    if (mock) { setClientes((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c))); return; }
    await supabase.from("clientes").update(clienteToRow(patch)).eq("id", id);
  }, [supabase, mock]);
  /* "Eliminar" desde la tabla es soft delete (papelera): solo marca
     eliminado_en, la fila sigue existiendo hasta que alguien la restaure o
     hasta la purga automática a los 30 días (pg_cron, ver
     purgar_clientes_papelera() en supabase-schema.sql). El borrado real de
     fila queda en `purgarCliente`, solo desde la papelera. */
  const deleteCliente = useCallback(async (id: string) => {
    const eliminadoEn = new Date().toISOString();
    if (mock) { setClientes((prev) => prev.map((c) => (c.id === id ? { ...c, eliminadoEn } : c))); return; }
    await supabase.from("clientes").update({ eliminado_en: eliminadoEn }).eq("id", id);
  }, [supabase, mock]);
  const restaurarCliente = useCallback(async (id: string) => {
    if (mock) { setClientes((prev) => prev.map((c) => (c.id === id ? { ...c, eliminadoEn: undefined } : c))); return; }
    await supabase.from("clientes").update({ eliminado_en: null }).eq("id", id);
  }, [supabase, mock]);
  const purgarCliente = useCallback(async (id: string) => {
    if (mock) { setClientes((prev) => prev.filter((c) => c.id !== id)); return; }
    await supabase.from("clientes").delete().eq("id", id);
  }, [supabase, mock]);

  const addCita = useCallback(async (c: Partial<Cita>) => {
    if (!negocio) return null;
    if (mock) {
      const id = crypto.randomUUID();
      setCitas((prev) => [...prev, { id, negocioId: negocio.id, clienteId: "", fechaHora: new Date().toISOString(), estado: "programada", ...c }]);
      return id;
    }
    const { data } = await supabase.from("citas").insert({ ...citaToRow(c), negocio_id: negocio.id }).select("id").single();
    return data ? String(data.id) : null;
  }, [supabase, negocio, mock]);
  const updateCita = useCallback(async (id: string, patch: Partial<Cita>) => {
    if (mock) { setCitas((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c))); return; }
    await supabase.from("citas").update(citaToRow(patch)).eq("id", id);
  }, [supabase, mock]);
  const deleteCita = useCallback(async (id: string) => {
    if (mock) { setCitas((prev) => prev.filter((c) => c.id !== id)); return; }
    await supabase.from("citas").delete().eq("id", id);
  }, [supabase, mock]);

  const addReceta = useCallback(async (r: Partial<Receta>) => {
    if (!negocio) return;
    if (mock) {
      setRecetas((prev) => [...prev, { id: crypto.randomUUID(), negocioId: negocio.id, clienteId: "", fecha: new Date().toISOString().slice(0, 10), tipo: "lejos", ...r }]);
      return;
    }
    await supabase.from("recetas").insert({ ...recetaToRow(r), negocio_id: negocio.id });
  }, [supabase, negocio, mock]);

  const addExamenOptometrico = useCallback(async (e: Partial<ExamenOptometrico>) => {
    if (!negocio) return;
    if (mock) {
      setExamenesOptometricos((prev) => [...prev, { id: crypto.randomUUID(), negocioId: negocio.id, clienteId: "", fecha: new Date().toISOString().slice(0, 10), ...e }]);
      return;
    }
    await supabase.from("examenes_optometricos").insert({ ...examenOptometricoToRow(e), negocio_id: negocio.id });
  }, [supabase, negocio, mock]);

  const updateExamenOptometrico = useCallback(async (id: string, patch: Partial<ExamenOptometrico>) => {
    if (mock) {
      setExamenesOptometricos((prev) => prev.map((ex) => (ex.id === id ? { ...ex, ...patch } : ex)));
      return;
    }
    await supabase.from("examenes_optometricos").update(examenOptometricoToRow(patch)).eq("id", id);
  }, [supabase, mock]);

  const addProducto = useCallback(async (p: Partial<Producto>, stockInicial: number, stockMinimo: number) => {
    if (!negocio) return;
    if (mock) {
      setProductos((prev) => [...prev, {
        id: crypto.randomUUID(), negocioId: negocio.id, nombre: "", categoria: "montura",
        precioVenta: 0, precioCosto: 0, activo: true, stockActual: stockInicial, stockMinimo, ...p,
      }]);
      return;
    }
    const { data } = await supabase.from("productos").insert({ ...productoToRow(p), negocio_id: negocio.id }).select("id").single();
    if (data) {
      await supabase.from("inventario").insert({ producto_id: data.id, stock_actual: stockInicial, stock_minimo: stockMinimo });
    }
  }, [supabase, negocio, mock]);
  const updateProducto = useCallback(async (id: string, patch: Partial<Producto>) => {
    if (mock) { setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))); return; }
    await supabase.from("productos").update(productoToRow(patch)).eq("id", id);
  }, [supabase, mock]);

  /* Ajuste de stock: registra el movimiento (trazabilidad) y actualiza el
     contador en `inventario` — ver invariante en docs/architecture.md sobre
     por qué se guarda el movimiento y no solo el número. */
  /* Multisedes Fase B: si se pasa `sucursalId` Y el negocio tiene al menos
     una sucursal creada, el ajuste aplica sobre la fila de ESA sede en
     `stock_sucursal` (no sobre el total fusionado de `Producto.stockActual`,
     que sería el número equivocado para calcular un delta de una sede
     puntual). Sin `sucursalId` (el 100% de los llamadores hoy, ninguna
     página tiene todavía un selector de sede en el formulario de ajuste) o
     sin sucursales creadas, el comportamiento es EXACTAMENTE el de antes:
     escribe en `inventario`, cero cambio para el caso común. */
  const ajustarStock = useCallback(async (productoId: string, tipo: string, cantidad: number, motivo?: string, sucursalId?: string) => {
    if (!negocio) return;
    const producto = productos.find((p) => p.id === productoId);
    if (!producto) return;
    const delta = tipo === "salida" ? -cantidad : cantidad;

    if (sucursalId && sucursales.length > 0) {
      const filaPrevia = stockSucursalRaw.find((r) => r.producto_id === productoId && r.sucursal_id === sucursalId);
      const stockPrevioSede = Number(filaPrevia?.stock_actual ?? 0);
      const stockMinimoSede = filaPrevia ? Number(filaPrevia.stock_minimo ?? 0) : producto.stockMinimo;
      const nuevoStockSede = tipo === "ajuste" ? cantidad : Math.max(0, stockPrevioSede + delta);

      if (mock) {
        setStockSucursalRaw((prev) => {
          const resto = prev.filter((r) => !(r.producto_id === productoId && r.sucursal_id === sucursalId));
          return [...resto, { producto_id: productoId, sucursal_id: sucursalId, stock_actual: nuevoStockSede, stock_minimo: stockMinimoSede }];
        });
        setProductos((prev) => prev.map((p) => (p.id === productoId ? { ...p, stockActual: p.stockActual - stockPrevioSede + nuevoStockSede } : p)));
        setMovimientosStock((prev) => [...prev, { id: crypto.randomUUID(), negocioId: negocio.id, productoId, sucursalId, tipo, cantidad, motivo, fecha: new Date().toISOString() }]);
        return;
      }
      await supabase.from("movimientos_stock").insert({
        negocio_id: negocio.id, producto_id: productoId, sucursal_id: sucursalId, tipo, cantidad, motivo,
      });
      await supabase.from("stock_sucursal").upsert({
        producto_id: productoId, sucursal_id: sucursalId, stock_actual: nuevoStockSede, stock_minimo: stockMinimoSede,
      });
      return;
    }

    const nuevoStock = tipo === "ajuste" ? cantidad : Math.max(0, producto.stockActual + delta);
    if (mock) {
      setProductos((prev) => prev.map((p) => (p.id === productoId ? { ...p, stockActual: nuevoStock } : p)));
      setMovimientosStock((prev) => [...prev, { id: crypto.randomUUID(), negocioId: negocio.id, productoId, tipo, cantidad, motivo, fecha: new Date().toISOString() }]);
      return;
    }
    await supabase.from("movimientos_stock").insert({
      negocio_id: negocio.id, producto_id: productoId, tipo, cantidad, motivo,
    });
    await supabase.from("inventario").update({ stock_actual: nuevoStock }).eq("producto_id", productoId);
  }, [supabase, negocio, productos, sucursales, stockSucursalRaw, mock]);

  /* Alta de venta + sus ítems. Simplificación de MVP: dos escrituras
     secuenciales (no hay transacción multi-tabla desde el cliente sin una
     función RPC en Postgres) — si el 2º paso fallara, quedaría una venta sin
     ítems; aceptable para el volumen de una óptica pyme, a revisar si se
     vuelve un problema real.

     Devuelve `{id, error}` en vez de solo el id (o null): antes el `error`
     de Supabase se descartaba en silencio (`const { data } = ...`) y el
     caller no tenía forma de distinguir "falló" de "no había nada que
     hacer". El chequeo del límite de Gratis va PRIMERO, antes de tocar
     Supabase/mock — evita el viaje de red para un caso que ya se sabe que
     va a fallar (el trigger `bloquear_venta_limite_gratis` de la base es la
     aplicación real; esto es solo para no depender del mensaje crudo de
     Postgres y para que funcione igual en modo mock, que no tiene DB). */
  const addVenta = useCallback(async (
    v: Partial<Venta>, items: Array<Omit<VentaItem, "id" | "ventaId">>,
  ): Promise<{ id: string | null; error: string | null }> => {
    if (!negocio) return { id: null, error: "No hay negocio activo." };
    if (suscripcion && !puedeRegistrarVenta(suscripcion.plan, contarVentasDelMes(ventas))) {
      return { id: null, error: `Llegaste a las ${LIMITE_VENTAS_MES_GRATIS} ventas de este mes en el plan Gratis.` };
    }
    if (mock) {
      const ventaId = crypto.randomUUID();
      setVentas((prev) => [...prev, {
        id: ventaId, negocioId: negocio.id, fecha: new Date().toISOString(),
        subtotal: 0, igv: 0, total: 0, metodoPago: "efectivo", estado: "pagada", montoPagado: 0, ...v,
      }]);
      setVentaItems((prev) => [...prev, ...items.map((it) => ({ ...it, id: crypto.randomUUID(), ventaId }))]);
      for (const it of items) {
        if (it.productoId) await ajustarStock(it.productoId, "salida", it.cantidad, `Venta ${ventaId}`);
      }
      return { id: ventaId, error: null };
    }
    const { data, error } = await supabase.from("ventas").insert({ ...ventaToRow(v), negocio_id: negocio.id }).select("id").single();
    if (error || !data) {
      const limite = /límite de \d+ ventas/i.test(error?.message ?? "");
      return { id: null, error: limite ? error!.message : "No se pudo registrar la venta." };
    }
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
    return { id: ventaId, error: null };
  }, [supabase, negocio, suscripcion, ventas, ajustarStock, mock]);

  /* Anular ≠ borrar: la venta queda como registro (trazabilidad para SUNAT
     y para caja), pero el stock que descontó `addVenta` se devuelve vía
     "devolucion" — el mismo tipo de movimiento que ya existe para cuando un
     cliente devuelve un producto, es exactamente esa semántica. */
  const anularVenta = useCallback(async (id: string) => {
    const venta = ventas.find((v) => v.id === id);
    if (!venta || venta.estado === "anulada") return;
    const items = ventaItems.filter((it) => it.ventaId === id);
    for (const it of items) {
      if (it.productoId) await ajustarStock(it.productoId, "devolucion", it.cantidad, `Anulación de venta`);
    }
    if (mock) { setVentas((prev) => prev.map((v) => (v.id === id ? { ...v, estado: "anulada" } : v))); return; }
    await supabase.from("ventas").update({ estado: "anulada" }).eq("id", id);
  }, [supabase, ventas, ventaItems, ajustarStock, mock]);

  const addOrdenLaboratorio = useCallback(async (o: Partial<OrdenLaboratorio>) => {
    if (!negocio) return;
    if (mock) {
      setOrdenesLaboratorio((prev) => [...prev, {
        id: crypto.randomUUID(), negocioId: negocio.id,
        estado: "generado", fechaGenerado: new Date().toISOString(), ...o,
      }]);
      return;
    }
    await supabase.from("ordenes_laboratorio").insert({ ...ordenLaboratorioToRow(o), negocio_id: negocio.id });
  }, [supabase, negocio, mock]);

  const updateOrdenLaboratorio = useCallback(async (id: string, patch: Partial<OrdenLaboratorio>) => {
    if (mock) {
      setOrdenesLaboratorio((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
      return;
    }
    await supabase.from("ordenes_laboratorio").update(ordenLaboratorioToRow(patch)).eq("id", id);
  }, [supabase, mock]);

  const abrirCaja = useCallback(async (desglose: ItemAperturaCaja[], empleadoId?: string, sucursalId?: string) => {
    if (!negocio) return;
    const montoInicial = sumaDesglose(desglose);
    const efectivoInicial = efectivoDeDesglose(desglose, montoInicial);
    const nueva: Partial<Caja> = {
      sucursalId, empleadoAperturaId: empleadoId, montoInicial, desgloseApertura: desglose,
      totalEfectivo: 0, totalTarjeta: 0, totalYape: 0, totalPlin: 0, totalTransferencia: 0,
      montoEfectivoEsperado: efectivoInicial, estado: "abierta",
    };
    if (mock) {
      setCajas((prev) => [...prev, { id: crypto.randomUUID(), negocioId: negocio.id, fechaApertura: new Date().toISOString(), ...nueva } as Caja]);
      return;
    }
    await supabase.from("cajas").insert({ ...cajaToRow(nueva), negocio_id: negocio.id });
  }, [supabase, negocio, mock]);

  /* El cuadre se calcula sobre `ventas` YA CARGADAS en el store (mismo
     criterio que `addVenta` calculando stock antes de escribir) y se
     congela en la fila al cerrar — si una venta de ese rango se anula
     después, el historial de caja ya cerrado no cambia. */
  const cerrarCaja = useCallback(async (id: string, montoContado: number, empleadoId?: string) => {
    const caja = cajas.find((c) => c.id === id);
    if (!caja || caja.estado === "cerrada") return;
    const ahora = new Date().toISOString();
    const efectivoInicial = efectivoDeDesglose(caja.desgloseApertura, caja.montoInicial);
    const cuadre = calcularCuadreCaja(ventas, efectivoInicial, caja.fechaApertura.slice(0, 10), ahora.slice(0, 10), caja.sucursalId);
    const patch: Partial<Caja> = {
      ...cuadre, montoEfectivoContado: montoContado, estado: "cerrada",
      fechaCierre: ahora, empleadoCierreId: empleadoId,
    };
    if (mock) {
      setCajas((prev) => prev.map((c) => (c.id === id
        ? { ...c, ...patch, diferencia: Math.round((montoContado - cuadre.montoEfectivoEsperado) * 100) / 100 }
        : c)));
      return;
    }
    await supabase.from("cajas").update(cajaToRow(patch)).eq("id", id);
  }, [supabase, cajas, ventas, mock]);

  const addGasto = useCallback(async (g: Partial<Gasto>) => {
    if (!negocio) return;
    if (mock) {
      setGastos((prev) => [...prev, { id: crypto.randomUUID(), negocioId: negocio.id, categoria: "otro", monto: 0, fecha: new Date().toISOString().slice(0, 10), ...g }]);
      return;
    }
    await supabase.from("gastos").insert({ ...gastoToRow(g), negocio_id: negocio.id });
  }, [supabase, negocio, mock]);
  const deleteGasto = useCallback(async (id: string) => {
    if (mock) { setGastos((prev) => prev.filter((g) => g.id !== id)); return; }
    await supabase.from("gastos").delete().eq("id", id);
  }, [supabase, mock]);

  /* Self-registro de asistencia: upsert sobre (empleadoId, fecha) — 1 fila
     por día por el unique de la tabla. `patch.fecha` default hoy porque el
     caller típico es "marcar mi entrada/salida de hoy", no una fecha
     arbitraria (eso lo cubre `updateAsistencia` para corregir un día
     pasado). */
  const marcarAsistencia = useCallback(async (patch: Partial<Asistencia> & { fotoBase64?: string }) => {
    if (!negocio || !patch.empleadoId) return;
    const { fotoBase64, ...resto } = patch;
    const fecha = resto.fecha ?? new Date().toISOString().slice(0, 10);
    const existente = asistencias.find((a) => a.empleadoId === resto.empleadoId && a.fecha === fecha);
    /* El evento se infiere de qué campo de hora trae el patch — el caller
       (marcar entrada vs. marcar salida) siempre manda uno u otro, nunca
       ambos a la vez. Solo importa para saber en qué flag/foto aplicar. */
    const evento: "entrada" | "salida" | null =
      resto.horaEntrada !== undefined ? "entrada" : resto.horaSalida !== undefined ? "salida" : null;
    const conFoto: Partial<Asistencia> = {
      ...resto,
      ...(fotoBase64 && evento === "entrada" ? { fotoEntrada: true } : {}),
      ...(fotoBase64 && evento === "salida" ? { fotoSalida: true } : {}),
    };

    if (mock) {
      const asistenciaId = existente?.id ?? crypto.randomUUID();
      if (existente) {
        setAsistencias((prev) => prev.map((a) => (a.id === existente.id ? { ...a, ...conFoto, fecha } : a)));
      } else {
        setAsistencias((prev) => [...prev, {
          id: asistenciaId, negocioId: negocio.id, sucursalId: undefined,
          estado: "presente", marcadoPor: "empleado", fotoEntrada: false, fotoSalida: false,
          ...conFoto, empleadoId: resto.empleadoId!, fecha,
        }]);
      }
      if (fotoBase64 && evento) {
        setAsistenciaFotos((prev) => [
          ...prev.filter((f) => !(f.asistenciaId === asistenciaId && f.tipo === evento)),
          { id: crypto.randomUUID(), asistenciaId, tipo: evento, fotoBase64 },
        ]);
      }
      return;
    }

    let asistenciaId = existente?.id;
    if (existente) {
      await supabase.from("asistencias").update(asistenciaToRow(conFoto)).eq("id", existente.id);
    } else {
      const { data } = await supabase.from("asistencias").insert({
        ...asistenciaToRow({ ...conFoto, fecha }), negocio_id: negocio.id, empleado_id: resto.empleadoId,
      }).select("id").single();
      asistenciaId = data ? String(data.id) : undefined;
    }
    /* upsert (no insert): si el empleado reemplaza una marca ya hecha hoy
       (mismo criterio que tramys — "sobrescribe"), la foto anterior de ese
       mismo evento se reemplaza en vez de acumular filas. */
    if (fotoBase64 && evento && asistenciaId) {
      await supabase.from("asistencia_fotos").upsert(
        asistenciaFotoToRow({ asistenciaId, tipo: evento, fotoBase64 }),
        { onConflict: "asistencia_id,tipo" },
      );
    }
  }, [supabase, negocio, mock, asistencias]);

  /* Corrección por admin/encargado sobre la fila de OTRO empleado (o la
     propia) — a diferencia de marcarAsistencia, acá el id YA se conoce
     (viene de la tabla del equipo), no hay que buscar/upsert por fecha. */
  const updateAsistencia = useCallback(async (id: string, patch: Partial<Asistencia>) => {
    if (mock) { setAsistencias((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a))); return; }
    await supabase.from("asistencias").update(asistenciaToRow(patch)).eq("id", id);
  }, [supabase, mock]);

  /* Aprueba UN evento (entrada o salida) por separado — nunca "el día
     completo" (mismo criterio que tramys-rrhh: cada marca se aprueba
     independiente, puede llegar en momentos distintos). `verificadorId` lo
     manda el caller porque DataProvider no depende de SessionProvider. */
  const verificarAsistencia = useCallback(async (id: string, evento: "entrada" | "salida", verificadorId: string) => {
    const ahora = new Date().toISOString();
    const patch: Partial<Asistencia> = evento === "entrada"
      ? { verificadoEntradaPor: verificadorId, verificadoEntradaAt: ahora }
      : { verificadoSalidaPor: verificadorId, verificadoSalidaAt: ahora };
    if (mock) { setAsistencias((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a))); return; }
    await supabase.from("asistencias").update(asistenciaToRow(patch)).eq("id", id);
  }, [supabase, mock]);

  /* En Supabase real, los triggers fn_pago_sueldo_sync_gasto()/
     fn_pago_sueldo_borra_gasto() crean/borran el Gasto espejo (categoría
     'sueldos') solos — acá en mock no hay triggers de DB, así que se
     replica esa misma lógica a mano en el cliente. */
  const addPagoSueldo = useCallback(async (p: Partial<PagoSueldo>): Promise<string | null> => {
    if (!negocio || !p.empleadoId) return null;
    if (mock) {
      const id = crypto.randomUUID();
      const empleado = empleados.find((e) => e.id === p.empleadoId);
      const tipoPeriodo = p.tipoPeriodo ?? "mensual";
      const periodoDesde = p.periodoDesde ?? new Date().toISOString().slice(0, 10);
      const periodoHasta = p.periodoHasta ?? periodoDesde;
      const fechaPago = p.fechaPago ?? new Date().toISOString().slice(0, 10);
      const monto = p.monto ?? 0;
      const gastoId = crypto.randomUUID();
      const descripcion = `Pago de sueldo (${tipoPeriodo}) del ${fechaCorta(periodoDesde)} al ${fechaCorta(periodoHasta)}`
        + (empleado ? ` — ${empleado.nombres} ${empleado.apellidos}` : "");
      setGastos((prev) => [...prev, { id: gastoId, negocioId: negocio.id, categoria: "sueldos", descripcion, monto, fecha: fechaPago }]);
      setPagosSueldo((prev) => [...prev, {
        id, negocioId: negocio.id, tipoPeriodo, periodoDesde, periodoHasta, fechaPago, monto, metodoPago: "efectivo",
        ...p, empleadoId: p.empleadoId!, gastoId,
      }]);
      return id;
    }
    const { data } = await supabase.from("pagos_sueldo").insert({ ...pagoSueldoToRow(p), negocio_id: negocio.id, empleado_id: p.empleadoId }).select("id").single();
    return data ? String(data.id) : null;
  }, [supabase, negocio, mock, empleados]);

  const deletePagoSueldo = useCallback(async (id: string) => {
    if (mock) {
      const pago = pagosSueldo.find((p) => p.id === id);
      setPagosSueldo((prev) => prev.filter((p) => p.id !== id));
      if (pago?.gastoId) setGastos((prev) => prev.filter((g) => g.id !== pago.gastoId));
      return;
    }
    await supabase.from("pagos_sueldo").delete().eq("id", id);
  }, [supabase, mock, pagosSueldo]);

  const addDescuento = useCallback(async (d: Partial<Descuento>) => {
    if (!negocio) return;
    if (mock) {
      setDescuentos((prev) => [...prev, { id: crypto.randomUUID(), negocioId: negocio.id, codigo: "", tipo: "porcentaje", valor: 0, aplicaA: "ambos", usos: 0, activo: true, ...d }]);
      return;
    }
    await supabase.from("descuentos").insert({ ...descuentoToRow(d), negocio_id: negocio.id });
  }, [supabase, negocio, mock]);
  const updateDescuento = useCallback(async (id: string, patch: Partial<Descuento>) => {
    if (mock) { setDescuentos((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d))); return; }
    await supabase.from("descuentos").update(descuentoToRow(patch)).eq("id", id);
  }, [supabase, mock]);
  const deleteDescuento = useCallback(async (id: string) => {
    if (mock) { setDescuentos((prev) => prev.filter((d) => d.id !== id)); return; }
    await supabase.from("descuentos").delete().eq("id", id);
  }, [supabase, mock]);

  const addRolPersonalizado = useCallback(async (p: Partial<RolPersonalizado>) => {
    if (!negocio) return;
    if (mock) {
      setRolesPersonalizados((prev) => [...prev, { id: crypto.randomUUID(), negocioId: negocio.id, nombre: "", permisos: {}, ...p }]);
      return;
    }
    await supabase.from("roles_personalizados").insert({ ...rolPersonalizadoToRow(p), negocio_id: negocio.id });
  }, [supabase, negocio, mock]);
  const updateRolPersonalizado = useCallback(async (id: string, patch: Partial<RolPersonalizado>) => {
    if (mock) { setRolesPersonalizados((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))); return; }
    await supabase.from("roles_personalizados").update(rolPersonalizadoToRow(patch)).eq("id", id);
  }, [supabase, mock]);
  const deleteRolPersonalizado = useCallback(async (id: string) => {
    if (mock) { setRolesPersonalizados((prev) => prev.filter((p) => p.id !== id)); return; }
    await supabase.from("roles_personalizados").delete().eq("id", id);
  }, [supabase, mock]);

  const addProveedor = useCallback(async (p: Partial<Proveedor>) => {
    if (!negocio) return;
    if (mock) {
      setProveedores((prev) => [...prev, { id: crypto.randomUUID(), negocioId: negocio.id, nombre: "", activo: true, ...p }]);
      return;
    }
    await supabase.from("proveedores").insert({ ...proveedorToRow(p), negocio_id: negocio.id });
  }, [supabase, negocio, mock]);
  const updateProveedor = useCallback(async (id: string, patch: Partial<Proveedor>) => {
    if (mock) { setProveedores((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))); return; }
    await supabase.from("proveedores").update(proveedorToRow(patch)).eq("id", id);
  }, [supabase, mock]);
  const deleteProveedor = useCallback(async (id: string) => {
    if (mock) { setProveedores((prev) => prev.filter((p) => p.id !== id)); return; }
    await supabase.from("proveedores").delete().eq("id", id);
  }, [supabase, mock]);

  /* Cotización: mismo patrón de dos escrituras que addVenta, pero SIN pasar
     por ajustarStock — es un documento previo, todavía no compromete
     inventario ni caja (ver convertirCotizacionAVenta). */
  const addCotizacion = useCallback(async (c: Partial<Cotizacion>, items: Array<Omit<CotizacionItem, "id" | "cotizacionId">>) => {
    if (!negocio) return;
    if (mock) {
      const cotizacionId = crypto.randomUUID();
      setCotizaciones((prev) => [...prev, {
        id: cotizacionId, negocioId: negocio.id, fecha: new Date().toISOString().slice(0, 10),
        subtotal: 0, igv: 0, total: 0, estado: "pendiente", ...c,
      }]);
      setCotizacionItems((prev) => [...prev, ...items.map((it) => ({ ...it, id: crypto.randomUUID(), cotizacionId }))]);
      return;
    }
    const { data } = await supabase.from("cotizaciones").insert({ ...cotizacionToRow(c), negocio_id: negocio.id }).select("id").single();
    if (!data) return;
    const cotizacionId = String(data.id);
    if (items.length > 0) {
      await supabase.from("cotizacion_items").insert(
        items.map((it) => ({
          cotizacion_id: cotizacionId, producto_id: it.productoId || null,
          descripcion: it.descripcion, cantidad: it.cantidad,
          precio_unitario: it.precioUnitario, subtotal: it.subtotal,
        })),
      );
    }
  }, [supabase, negocio, mock]);
  const updateCotizacion = useCallback(async (id: string, patch: Partial<Cotizacion>) => {
    if (mock) { setCotizaciones((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c))); return; }
    await supabase.from("cotizaciones").update(cotizacionToRow(patch)).eq("id", id);
  }, [supabase, mock]);
  const deleteCotizacion = useCallback(async (id: string) => {
    if (mock) { setCotizaciones((prev) => prev.filter((c) => c.id !== id)); return; }
    await supabase.from("cotizaciones").delete().eq("id", id);
  }, [supabase, mock]);

  /* Convierte una cotización aceptada en una Venta real: recién ahí se
     descuenta stock y se registra en caja (ver addVenta). La cotización
     queda enlazada vía ventaId para no perder la trazabilidad. */
  const convertirCotizacionAVenta = useCallback(async (cotizacionId: string) => {
    const cot = cotizaciones.find((c) => c.id === cotizacionId);
    if (!cot) return { ok: false, error: "Cotización no encontrada." };
    const items = cotizacionItems.filter((it) => it.cotizacionId === cotizacionId);
    const { id: ventaId, error } = await addVenta(
      { clienteId: cot.clienteId, subtotal: cot.subtotal, igv: cot.igv, total: cot.total, notas: cot.notas },
      items.map((it) => ({ productoId: it.productoId, descripcion: it.descripcion, cantidad: it.cantidad, precioUnitario: it.precioUnitario, subtotal: it.subtotal })),
    );
    if (!ventaId) return { ok: false, error };
    await updateCotizacion(cotizacionId, { estado: "aceptada", ventaId });
    return { ok: true, error: null };
  }, [cotizaciones, cotizacionItems, addVenta, updateCotizacion]);

  const value: DataCtx = {
    empleados, rolesPersonalizados, negocio, suscripcion, sucursales, clientes, citas, recetas, examenesOptometricos, productos,
    movimientosStock, ventas, ventaItems, ordenesLaboratorio, cajas, gastos, asistencias, asistenciaFotos, pagosSueldo, descuentos,
    proveedores, cotizaciones, cotizacionItems, ready,
    sucursalFiltro, setSucursalFiltro,
    updateEmpleado, addRolPersonalizado, updateRolPersonalizado, deleteRolPersonalizado, updateNegocio, addSucursal, updateSucursal, repartirStockInicial,
    addCliente, updateCliente, deleteCliente, restaurarCliente, purgarCliente,
    addCita, updateCita, deleteCita,
    addReceta, addExamenOptometrico, updateExamenOptometrico, addProducto, updateProducto, ajustarStock,
    addVenta, anularVenta, addOrdenLaboratorio, updateOrdenLaboratorio, abrirCaja, cerrarCaja, addGasto, deleteGasto,
    marcarAsistencia, updateAsistencia, verificarAsistencia, addPagoSueldo, deletePagoSueldo,
    addDescuento, updateDescuento, deleteDescuento,
    addProveedor, updateProveedor, deleteProveedor,
    addCotizacion, updateCotizacion, deleteCotizacion, convertirCotizacionAVenta,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ================= HOOK ================= */
export function useData(): DataCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useData debe usarse dentro de <DataProvider>");
  return v;
}
