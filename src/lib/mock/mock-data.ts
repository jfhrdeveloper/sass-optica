import type {
  Empleado, Negocio, Suscripcion, Cliente, Cita, Receta,
  Producto, MovimientoStock, Venta, VentaItem, Gasto, Descuento,
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
  { id: "desc-1", negocioId: MOCK_NEGOCIO.id, codigo: "VERANO10", tipo: "porcentaje", valor: 10, aplicaA: "ambos", limiteUsos: 50, usos: 12, activo: true },
];

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

/* ================= Vista cross-tenant del admin-panel =================
   No reutiliza MOCK_NEGOCIO/MOCK_SUSCRIPCION de arriba (esas son el ÚNICO
   negocio "logueado" en el dashboard mock) — acá se simulan VARIOS negocios
   ajenos, tal como los vería el dueño del SaaS en admin.dominio, con sus
   filas crudas (mismo shape que las queries reales en admin-panel/(protegido)/*). */
export const MOCK_ADMIN_NEGOCIOS = [
  { id: "adm-neg-1", nombre: "Óptica Demo", subdominio: "optica-demo", ruc: "10123456789", telefono: "999 999 999", direccion: "Av. Siempre Viva 123, Lima", activo: true, created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: "adm-neg-2", nombre: "Óptica Visión Plus", subdominio: "vision-plus", ruc: "20512345678", telefono: "988 111 222", direccion: "Jr. Las Begonias 456, San Isidro", activo: true, created_at: new Date(Date.now() - 120 * 86400000).toISOString() },
  { id: "adm-neg-3", nombre: "Óptica Los Olivos", subdominio: "los-olivos", ruc: "20598765432", telefono: "977 333 444", direccion: "Av. Carlos Izaguirre 890, Los Olivos", activo: true, created_at: new Date(Date.now() - 95 * 86400000).toISOString() },
  { id: "adm-neg-4", nombre: "Óptica Puente Piedra", subdominio: "puente-piedra", ruc: "20487654321", telefono: "966 555 666", direccion: "Av. Zarumilla 321, Puente Piedra", activo: false, created_at: new Date(Date.now() - 90 * 86400000).toISOString() },
  { id: "adm-neg-5", nombre: "Óptica San Juan", subdominio: "optica-sjl", ruc: null, telefono: "955 777 888", direccion: null, activo: true, created_at: new Date(Date.now() - 27 * 86400000).toISOString() },
];

export const MOCK_ADMIN_SUSCRIPCIONES = [
  { negocio_id: "adm-neg-1", plan: "trial", estado: "trial", trial_fin: new Date(Date.now() + 25 * 86400000).toISOString().slice(0, 10) },
  { negocio_id: "adm-neg-2", plan: "premium", estado: "activa", trial_fin: new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10) },
  { negocio_id: "adm-neg-3", plan: "basico", estado: "activa", trial_fin: new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 10) },
  { negocio_id: "adm-neg-4", plan: "basico", estado: "vencida", trial_fin: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10) },
  /* A 3 días de vencer — pensado para verse en el filtro "por vencer". */
  { negocio_id: "adm-neg-5", plan: "trial", estado: "trial", trial_fin: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) },
];

export const MOCK_ADMIN_EMPLEADOS = [
  { id: "adm-emp-1", negocio_id: "adm-neg-1", nombres: "Ana", apellidos: "Demo", rol: "administrador", email: "demo@optica.pe", activo: true },
  { id: "adm-emp-2", negocio_id: "adm-neg-2", nombres: "Rosa", apellidos: "Fernández", rol: "administrador", email: "rosa@visionplus.pe", activo: true },
  { id: "adm-emp-3", negocio_id: "adm-neg-2", nombres: "Luis", apellidos: "Chávez", rol: "trabajador", email: "luis@visionplus.pe", activo: true },
  { id: "adm-emp-4", negocio_id: "adm-neg-3", nombres: "Miguel", apellidos: "Torres", rol: "administrador", email: "miguel@losolivos.pe", activo: true },
  { id: "adm-emp-5", negocio_id: "adm-neg-3", nombres: "Karina", apellidos: "Solís", rol: "encargado", email: "karina@losolivos.pe", activo: true },
  { id: "adm-emp-6", negocio_id: "adm-neg-4", nombres: "Jorge", apellidos: "Ramos", rol: "administrador", email: "jorge@puentepiedra.pe", activo: true },
  { id: "adm-emp-7", negocio_id: "adm-neg-5", nombres: "Vanessa", apellidos: "Quispe", rol: "administrador", email: "vanessa@opticasjl.pe", activo: true },
];

/* pagos_saas simulados — varios meses de historia para el gráfico de MRR de
   /admin-panel/pagos. Montos calzan con los precios reales de la landing
   (ver PreciosSection.tsx): Básico S/89.90/mes, Premium S/149.90/mes. */
function haceMeses(n: number, dia: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n, dia);
  return d.toISOString().slice(0, 10);
}
export const MOCK_ADMIN_PAGOS = [
  { id: "pago-1", negocio_id: "adm-neg-2", monto: 149.9, moneda: "PEN", metodo_pago: "tarjeta", culqi_cargo_id: "chr_mock_1", estado: "exitoso", created_at: haceMeses(3, 12) },
  { id: "pago-2", negocio_id: "adm-neg-2", monto: 149.9, moneda: "PEN", metodo_pago: "tarjeta", culqi_cargo_id: "chr_mock_2", estado: "exitoso", created_at: haceMeses(2, 12) },
  { id: "pago-3", negocio_id: "adm-neg-2", monto: 149.9, moneda: "PEN", metodo_pago: "tarjeta", culqi_cargo_id: "chr_mock_3", estado: "exitoso", created_at: haceMeses(1, 12) },
  { id: "pago-4", negocio_id: "adm-neg-2", monto: 149.9, moneda: "PEN", metodo_pago: "yape", culqi_cargo_id: "chr_mock_4", estado: "exitoso", created_at: haceMeses(0, 12) },
  { id: "pago-5", negocio_id: "adm-neg-3", monto: 89.9, moneda: "PEN", metodo_pago: "tarjeta", culqi_cargo_id: "chr_mock_5", estado: "exitoso", created_at: haceMeses(2, 20) },
  { id: "pago-6", negocio_id: "adm-neg-3", monto: 89.9, moneda: "PEN", metodo_pago: "tarjeta", culqi_cargo_id: "chr_mock_6", estado: "exitoso", created_at: haceMeses(1, 20) },
  { id: "pago-7", negocio_id: "adm-neg-3", monto: 89.9, moneda: "PEN", metodo_pago: "yape", culqi_cargo_id: "chr_mock_7", estado: "exitoso", created_at: haceMeses(0, 20) },
  { id: "pago-8", negocio_id: "adm-neg-4", monto: 89.9, moneda: "PEN", metodo_pago: "tarjeta", culqi_cargo_id: "chr_mock_8", estado: "exitoso", created_at: haceMeses(2, 5) },
];

export const MOCK_COTIZACION_ITEMS: CotizacionItem[] = [
  { id: "coti-1", cotizacionId: "cot-1", productoId: "prod-1", descripcion: "Armazón Ray-Ban RB2140", cantidad: 1, precioUnitario: 350, subtotal: 350 },
];
