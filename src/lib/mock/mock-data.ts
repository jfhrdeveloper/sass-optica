import type {
  Empleado, Negocio, Suscripcion, Cliente, Cita, Receta,
  Producto, MovimientoStock, Venta, VentaItem, Gasto, Descuento, CampaniaEmail,
  Proveedor, Cotizacion, CotizacionItem,
} from "@/components/providers/DataProvider";

/* Datos de ejemplo para el modo mock — ver mock-mode.ts. Un solo negocio,
   un solo empleado (administrador), un puñado de filas por entidad para que
   el dashboard y las listas no se vean vacías. */

export const MOCK_NEGOCIO: Negocio = {
  id: "mock-negocio-1",
  nombre: "Óptica Demo",
  subdominio: "optica-demo",
  ruc: "10123456789",
  telefono: "999 999 999",
  direccion: "Av. Siempre Viva 123, Lima",
  activo: true,
};

export const MOCK_EMPLEADO: Empleado = {
  id: "mock-empleado-1",
  negocioId: MOCK_NEGOCIO.id,
  nombres: "Ana",
  apellidos: "Demo",
  rol: "administrador",
  email: "demo@optica.pe",
  permisos: {},
  activo: true,
};

export const MOCK_SUSCRIPCION: Suscripcion = {
  id: "mock-sub-1",
  negocioId: MOCK_NEGOCIO.id,
  plan: "trial",
  estado: "trial",
  trialInicio: new Date().toISOString().slice(0, 10),
  trialFin: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
};

export const MOCK_CLIENTES: Cliente[] = [
  { id: "cli-1", negocioId: MOCK_NEGOCIO.id, nombres: "Carlos", apellidos: "Ramírez", documentoTipo: "DNI", documentoNumero: "45678912", telefono: "987654321" },
  { id: "cli-2", negocioId: MOCK_NEGOCIO.id, nombres: "María", apellidos: "López", documentoTipo: "DNI", documentoNumero: "41234567", telefono: "912345678" },
];

export const MOCK_CITAS: Cita[] = [
  { id: "cit-1", negocioId: MOCK_NEGOCIO.id, clienteId: "cli-1", fechaHora: new Date().toISOString(), motivo: "Control anual", estado: "programada" },
];

export const MOCK_RECETAS: Receta[] = [];

export const MOCK_PRODUCTOS: Producto[] = [
  { id: "prod-1", negocioId: MOCK_NEGOCIO.id, proveedorId: "prov-1", nombre: "Armazón Ray-Ban RB2140", categoria: "montura", marca: "Ray-Ban", precioVenta: 350, precioCosto: 180, activo: true, stockActual: 5, stockMinimo: 2 },
  { id: "prod-2", negocioId: MOCK_NEGOCIO.id, nombre: "Luna antireflejo 1.56", categoria: "luna", precioVenta: 120, precioCosto: 60, activo: true, stockActual: 1, stockMinimo: 3 },
];

export const MOCK_MOVIMIENTOS_STOCK: MovimientoStock[] = [];

export const MOCK_VENTAS: Venta[] = [
  { id: "ven-1", negocioId: MOCK_NEGOCIO.id, clienteId: "cli-2", fecha: new Date().toISOString(), subtotal: 296.61, igv: 53.39, total: 350, metodoPago: "tarjeta", estado: "pagada", montoPagado: 350 },
];

export const MOCK_VENTA_ITEMS: VentaItem[] = [
  { id: "vi-1", ventaId: "ven-1", productoId: "prod-1", descripcion: "Armazón Ray-Ban RB2140", cantidad: 1, precioUnitario: 350, subtotal: 350 },
];

export const MOCK_GASTOS: Gasto[] = [
  { id: "gas-1", negocioId: MOCK_NEGOCIO.id, categoria: "alquiler", descripcion: "Alquiler del local", monto: 1200, fecha: new Date().toISOString().slice(0, 10) },
  { id: "gas-2", negocioId: MOCK_NEGOCIO.id, proveedorId: "prov-1", categoria: "insumos", descripcion: "Compra de armazones", monto: 850, fecha: new Date().toISOString().slice(0, 10) },
];

export const MOCK_DESCUENTOS: Descuento[] = [
  { id: "desc-1", negocioId: MOCK_NEGOCIO.id, codigo: "VERANO10", tipo: "porcentaje", valor: 10, limiteUsos: 50, usos: 12, activo: true },
];

export const MOCK_CAMPANIAS: CampaniaEmail[] = [];

export const MOCK_PROVEEDORES: Proveedor[] = [
  { id: "prov-1", negocioId: MOCK_NEGOCIO.id, nombre: "Óptica Distribuidora SAC", ruc: "20345678901", contacto: "Jorge Salinas", telefono: "01 234 5678", email: "ventas@opticadist.pe", activo: true },
  { id: "prov-2", negocioId: MOCK_NEGOCIO.id, nombre: "Lentes del Sur EIRL", ruc: "20456789012", contacto: "Rocío Vargas", telefono: "01 987 6543", activo: true },
];

export const MOCK_COTIZACIONES: Cotizacion[] = [
  {
    id: "cot-1", negocioId: MOCK_NEGOCIO.id, clienteId: "cli-1",
    fecha: new Date().toISOString().slice(0, 10),
    vigenciaHasta: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    subtotal: 296.61, igv: 53.39, total: 350, estado: "pendiente",
  },
];

export const MOCK_COTIZACION_ITEMS: CotizacionItem[] = [
  { id: "coti-1", cotizacionId: "cot-1", productoId: "prod-1", descripcion: "Armazón Ray-Ban RB2140", cantidad: 1, precioUnitario: 350, subtotal: 350 },
];
