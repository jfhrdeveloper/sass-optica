import type {
  Empleado, PlantillaRol, Negocio, Suscripcion, Sucursal, Cliente, Cita, Receta, ExamenOptometrico,
  Producto, MovimientoStock, Venta, VentaItem, OrdenLaboratorio, Caja, Gasto, Descuento,
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
  comisionPct: 5,
  activo: true,
};

/* Encargado/Vendedor mock — solo para el selector rápido de perfil de
   /login (mock mode), no representan un flujo de alta real (ver
   AuthPage.tsx). Con permisos vacíos: cada rol ve exactamente lo que le
   corresponde por defecto (RLS/proxy.ts), sin depender de un permiso
   granular delegado para que el selector sirva tal cual. */
export const MOCK_EMPLEADO_ENCARGADO: Empleado = {
  id: "mock-empleado-2",
  negocioId: MOCK_NEGOCIO.id,
  nombres: "Carlos",
  apellidos: "Encargado",
  rol: "encargado",
  email: "encargado@optica.pe",
  permisos: {},
  comisionPct: 5,
  activo: true,
};

export const MOCK_EMPLEADO_TRABAJADOR: Empleado = {
  id: "mock-empleado-3",
  negocioId: MOCK_NEGOCIO.id,
  nombres: "Sofía",
  apellidos: "Vendedora",
  rol: "trabajador",
  email: "vendedor@optica.pe",
  permisos: {},
  comisionPct: 5,
  activo: true,
};

export const MOCK_EMPLEADOS: Empleado[] = [MOCK_EMPLEADO, MOCK_EMPLEADO_ENCARGADO, MOCK_EMPLEADO_TRABAJADOR];

/* Plantillas de rol de ejemplo (ver /dashboard/roles) — ninguna está
   asignada a MOCK_EMPLEADO_TRABAJADOR por defecto (su `permisos: {}` de
   arriba sigue siendo el camino "sin plantilla"), para que el selector de
   plantilla en Empleados arranque en ese estado y se pueda probar el cambio. */
export const MOCK_PLANTILLAS_ROL: PlantillaRol[] = [
  { id: "plantilla-1", negocioId: MOCK_NEGOCIO.id, nombre: "Cajero", rolBase: "trabajador", permisos: { ventas: true, gastos: true } },
  { id: "plantilla-2", negocioId: MOCK_NEGOCIO.id, nombre: "Recepción", rolBase: "trabajador", permisos: { citas: true, clientes: true } },
];

export const MOCK_SUSCRIPCION: Suscripcion = {
  id: "mock-sub-1",
  negocioId: MOCK_NEGOCIO.id,
  plan: "gratis",
  estado: "activa",
  trialInicio: "",
  trialFin: "",
};

// Vacío por defecto: representa el caso común (negocio de una sola sede,
// sin multisedes) — el selector de sede y cualquier columna "Sede" no
// aparecen en la UI mientras esta lista esté vacía.
export const MOCK_SUCURSALES: Sucursal[] = [];

export const MOCK_CLIENTES: Cliente[] = [
  { id: "cli-1", negocioId: MOCK_NEGOCIO.id, nombres: "Carlos", apellidos: "Ramírez", documentoTipo: "DNI", documentoNumero: "45678912", telefono: "987654321" },
  { id: "cli-2", negocioId: MOCK_NEGOCIO.id, nombres: "María", apellidos: "López", documentoTipo: "DNI", documentoNumero: "41234567", telefono: "912345678" },
];

export const MOCK_CITAS: Cita[] = [
  { id: "cit-1", negocioId: MOCK_NEGOCIO.id, clienteId: "cli-1", fechaHora: new Date().toISOString(), motivo: "Control anual", estado: "programada" },
];

export const MOCK_RECETAS: Receta[] = [];

export const MOCK_EXAMENES_OPTOMETRICOS: ExamenOptometrico[] = [
  {
    id: "exam-1", negocioId: MOCK_NEGOCIO.id, clienteId: "cli-1", citaId: "cit-1",
    fecha: new Date().toISOString().slice(0, 10),
    odAvSc: "20/40", odAvCc: "20/20", oiAvSc: "20/50", oiAvCc: "20/20",
    odK1: 43.25, odK2: 44.0, odEjeK: 90,
    oiK1: 43.5, oiK2: 44.25, oiEjeK: 85,
    anamnesis: "Refiere visión borrosa de lejos hace 3 meses, sin antecedentes familiares relevantes.",
  },
];

export const MOCK_PRODUCTOS: Producto[] = [
  { id: "prod-1", negocioId: MOCK_NEGOCIO.id, proveedorId: "prov-1", nombre: "Armazón Ray-Ban RB2140", categoria: "montura", marca: "Ray-Ban", precioVenta: 350, precioCosto: 180, activo: true, stockActual: 5, stockMinimo: 2 },
  { id: "prod-2", negocioId: MOCK_NEGOCIO.id, nombre: "Luna antireflejo 1.56", categoria: "luna", precioVenta: 120, precioCosto: 60, activo: true, stockActual: 1, stockMinimo: 3 },
  { id: "prod-3", negocioId: MOCK_NEGOCIO.id, nombre: "Acuvue Oasys mensual", categoria: "lente_contacto", marca: "Johnson & Johnson", precioVenta: 90, precioCosto: 55, curvaBase: 8.4, diametro: 14, potencia: -2.5, activo: true, stockActual: 12, stockMinimo: 4 },
];

export const MOCK_MOVIMIENTOS_STOCK: MovimientoStock[] = [];

export const MOCK_VENTAS: Venta[] = [
  { id: "ven-1", negocioId: MOCK_NEGOCIO.id, clienteId: "cli-2", empleadoId: MOCK_EMPLEADO.id, fecha: new Date().toISOString(), subtotal: 296.61, igv: 53.39, total: 350, metodoPago: "tarjeta", estado: "pagada", montoPagado: 350 },
];

export const MOCK_VENTA_ITEMS: VentaItem[] = [
  { id: "vi-1", ventaId: "ven-1", productoId: "prod-1", descripcion: "Armazón Ray-Ban RB2140", cantidad: 1, precioUnitario: 350, subtotal: 350 },
];

export const MOCK_ORDENES_LABORATORIO: OrdenLaboratorio[] = [
  {
    id: "lab-1", negocioId: MOCK_NEGOCIO.id, ventaId: "ven-1", clienteId: "cli-2",
    empleadoId: MOCK_EMPLEADO.id, laboratorioNombre: "Laboratorio Central Lima",
    estado: "en_proceso", fechaGenerado: new Date().toISOString(),
  },
];

export const MOCK_CAJAS: Caja[] = [
  {
    id: "caja-1", negocioId: MOCK_NEGOCIO.id, empleadoAperturaId: MOCK_EMPLEADO.id,
    fechaApertura: new Date().toISOString(), montoInicial: 100,
    desgloseApertura: [{ metodo: "Efectivo", monto: 100 }],
    totalEfectivo: 0, totalTarjeta: 0, totalYape: 0, totalPlin: 0, totalTransferencia: 0,
    montoEfectivoEsperado: 100, estado: "abierta",
  },
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
  { id: "adm-neg-6", nombre: "Óptica del Norte", subdominio: "optica-del-norte", ruc: null, telefono: "944 222 333", direccion: null, activo: true, created_at: new Date(Date.now() - 10 * 86400000).toISOString() },
];

/* Cobertura de los estados reales del modelo freemium — se preserva la
   historia de cada negocio (pagos_saas/eventos_uso más abajo ya cuentan una
   historia puntual por id, no hay que romperla):
   - adm-neg-1: "recién arrancando", sin pagos — probando Premium, a 25 días
     de que venza el trial de 30 (arrancó hace 5).
   - adm-neg-2: paga de verdad (4 pagos exitosos de Premium, ver
     MOCK_ADMIN_PAGOS) — el negocio "más comprometido".
   - adm-neg-3: paga de verdad (3 pagos exitosos de Básico) — activa.
   - adm-neg-4: pagó Básico UNA vez hace 2 meses y no renovó — vencida es la
     lectura correcta acá (cobro recurrente que dejó de renovarse, no un
     trial nunca pagado); ese estado sigue existiendo para este caso futuro.
   - adm-neg-5: sin pagos, probando Básico, a 3 días de que venza — el caso
     de "por vencer" que debe aparecer en ese widget del panel admin.
   - adm-neg-6: Gratis permanente, nunca probó un plan pago — el caso nuevo
     que no existía antes de este cambio. */
export const MOCK_ADMIN_SUSCRIPCIONES = [
  { negocio_id: "adm-neg-1", plan: "premium", estado: "trial", trial_fin: new Date(Date.now() + 25 * 86400000).toISOString().slice(0, 10) },
  { negocio_id: "adm-neg-2", plan: "premium", estado: "activa", trial_fin: "" },
  { negocio_id: "adm-neg-3", plan: "basico", estado: "activa", trial_fin: "" },
  { negocio_id: "adm-neg-4", plan: "basico", estado: "vencida", trial_fin: "" },
  { negocio_id: "adm-neg-5", plan: "basico", estado: "trial", trial_fin: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) },
  { negocio_id: "adm-neg-6", plan: "gratis", estado: "activa", trial_fin: "" },
];

export const MOCK_ADMIN_EMPLEADOS = [
  { id: "adm-emp-1", negocio_id: "adm-neg-1", nombres: "Ana", apellidos: "Demo", rol: "administrador", email: "demo@optica.pe", activo: true },
  { id: "adm-emp-2", negocio_id: "adm-neg-2", nombres: "Rosa", apellidos: "Fernández", rol: "administrador", email: "rosa@visionplus.pe", activo: true },
  { id: "adm-emp-3", negocio_id: "adm-neg-2", nombres: "Luis", apellidos: "Chávez", rol: "trabajador", email: "luis@visionplus.pe", activo: true },
  { id: "adm-emp-4", negocio_id: "adm-neg-3", nombres: "Miguel", apellidos: "Torres", rol: "administrador", email: "miguel@losolivos.pe", activo: true },
  { id: "adm-emp-5", negocio_id: "adm-neg-3", nombres: "Karina", apellidos: "Solís", rol: "encargado", email: "karina@losolivos.pe", activo: true },
  { id: "adm-emp-6", negocio_id: "adm-neg-4", nombres: "Jorge", apellidos: "Ramos", rol: "administrador", email: "jorge@puentepiedra.pe", activo: true },
  { id: "adm-emp-7", negocio_id: "adm-neg-5", nombres: "Vanessa", apellidos: "Quispe", rol: "administrador", email: "vanessa@opticasjl.pe", activo: true },
  { id: "adm-emp-8", negocio_id: "adm-neg-6", nombres: "Renzo", apellidos: "Vega", rol: "administrador", email: "renzo@opticadelnorte.pe", activo: true },
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

/* libro_reclamaciones simulado — 2 casos: uno pendiente de responder (el
   que le importa ver al dueño del SaaS) y uno ya atendido (para probar que
   el badge/estado cambia). */
export const MOCK_ADMIN_RECLAMOS = [
  {
    id: "rec-1", numero: "RC-000001", tipo: "reclamo",
    consumidor_nombres: "María", consumidor_apellidos: "Gonzáles",
    consumidor_documento_tipo: "DNI", consumidor_documento_numero: "45678912",
    consumidor_domicilio: "Jr. Las Flores 456, Los Olivos", consumidor_telefono: "51987654321",
    consumidor_email: "maria.gonzales@example.com", es_menor_edad: false, apoderado_nombre: null,
    bien_tipo: "servicio", bien_descripcion: "Plan Premium — cobro de julio",
    monto_reclamado: 149.9,
    detalle: "Se me cobró el plan Premium dos veces en el mismo mes.",
    pedido: "Que se me devuelva el cobro duplicado.",
    estado: "pendiente", respuesta: null, created_at: haceMeses(0, 22),
  },
  {
    id: "rec-2", numero: "RC-000002", tipo: "queja",
    consumidor_nombres: "Carlos", consumidor_apellidos: "Ramírez",
    consumidor_documento_tipo: "DNI", consumidor_documento_numero: "78912345",
    consumidor_domicilio: "Av. Universitaria 789, Puente Piedra", consumidor_telefono: null,
    consumidor_email: "carlos.ramirez@example.com", es_menor_edad: false, apoderado_nombre: null,
    bien_tipo: "servicio", bien_descripcion: "Soporte por WhatsApp",
    monto_reclamado: null,
    detalle: "Tardaron 2 días en responder una consulta de soporte.",
    pedido: "Reducir el tiempo de respuesta de soporte.",
    estado: "atendido", respuesta: "Reforzamos el equipo de soporte; el tiempo de respuesta ahora es menor a 24h.",
    created_at: haceMeses(1, 5),
  },
];

/* eventos_uso simulados — alimentan la analítica de actividad del admin
   panel (frecuencia, día/hora pico, módulos más usados). Deterministas (sin
   Math.random) para que la demo se vea siempre igual entre recargas. Cada
   negocio tiene un patrón distinto a propósito, para poder ver los 3 casos
   reales que le importan al dueño del SaaS: uso sano y reciente, uso que ya
   se apagó (riesgo de abandono) y un trial que se enfrió antes de decidir. */
const RUTAS_MODULO_MOCK = [
  "/dashboard", "/dashboard/clientes", "/dashboard/citas", "/dashboard/ventas",
  "/dashboard/productos", "/dashboard/cotizaciones", "/dashboard/gastos",
  "/dashboard/proveedores", "/dashboard/informes", "/dashboard/descuentos",
] as const;

/** Genera eventos de uso para un negocio, `eventosPorDiaActivo` por cada día
 *  que caiga en `diasActivos` (0=lunes..6=domingo), concentrados alrededor
 *  de `horaPico`. `offsetDiasFin` desplaza toda la ventana hacia el pasado
 *  (0 = la actividad llega hasta hoy; 20 = la actividad se cortó hace 20
 *  días) — así se simula tanto un negocio activo como uno que dejó de
 *  entrar, sin necesitar dos funciones distintas. */
function generarEventosUsoMock(
  negocioId: string, dias: number, eventosPorDiaActivo: number, horaPico: number,
  diasActivos: number[], offsetDiasFin = 0,
): { id: string; negocio_id: string; ruta: string; created_at: string }[] {
  const eventos: { id: string; negocio_id: string; ruta: string; created_at: string }[] = [];
  let contador = 0;
  for (let i = dias - 1 + offsetDiasFin; i >= offsetDiasFin; i--) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i);
    const diaSemana = (fecha.getDay() + 6) % 7; // 0=lunes, igual que DIAS_SEMANA en lib/uso.ts
    if (!diasActivos.includes(diaSemana)) continue;
    for (let j = 0; j < eventosPorDiaActivo; j++) {
      const hora = (horaPico + (j % 3) - 1 + 24) % 24;
      const ts = new Date(fecha);
      ts.setHours(hora, (j * 17) % 60, 0, 0);
      eventos.push({
        id: `evt-${negocioId}-${contador}`, negocio_id: negocioId,
        ruta: RUTAS_MODULO_MOCK[(contador + j) % RUTAS_MODULO_MOCK.length],
        created_at: ts.toISOString(),
      });
      contador++;
    }
  }
  return eventos;
}

export const MOCK_ADMIN_EVENTOS_USO = [
  // adm-neg-1: trial de 5 días, recién arrancando — uso liviano pero fresco.
  ...generarEventosUsoMock("adm-neg-1", 5, 3, 10, [0, 1, 2, 3, 4]),
  // adm-neg-2: premium, el negocio más comprometido — activo casi todos los
  // días, pico fuerte en la mañana (abre temprano, típico de óptica).
  ...generarEventosUsoMock("adm-neg-2", 30, 8, 9, [0, 1, 2, 3, 4, 5]),
  // adm-neg-3: básico, uso constante mode-moderado, pico en la tarde.
  ...generarEventosUsoMock("adm-neg-3", 30, 4, 16, [0, 1, 2, 3, 4]),
  // adm-neg-4: trial vencido y SIN pagar — dejó de entrar hace 20 días, el
  // caso que el admin panel debe poder señalar como riesgo real de abandono.
  ...generarEventosUsoMock("adm-neg-4", 15, 5, 11, [0, 1, 2, 3, 4], 20),
  // adm-neg-5: trial por vencer en 3 días — usó el sistema al registrarse y
  // luego se enfrió (nada en los últimos 12 días): la señal de alerta más
  // sutil, porque `suscripciones` sola no la muestra (sigue "en trial").
  ...generarEventosUsoMock("adm-neg-5", 4, 6, 14, [0, 1, 2, 3, 4, 5, 6], 12),
];

export const MOCK_COTIZACION_ITEMS: CotizacionItem[] = [
  { id: "coti-1", cotizacionId: "cot-1", productoId: "prod-1", descripcion: "Armazón Ray-Ban RB2140", cantidad: 1, precioUnitario: 350, subtotal: 350 },
];

/* audit_log simulado (ver supabase-schema.sql: fn_audit()) — solo un negocio
   en modo mock, así que no hace falta filtrar por negocio_id como en la
   tabla real. Alimenta /dashboard/ajustes/auditoria (admin-only). */
export const MOCK_AUDIT_LOG = [
  { id: 6, ts: new Date(Date.now() - 2 * 3600000).toISOString(), actor_id: MOCK_EMPLEADO.id, accion: "UPDATE", tabla: "productos", fila_id: "prod-1" },
  { id: 5, ts: new Date(Date.now() - 5 * 3600000).toISOString(), actor_id: MOCK_EMPLEADO_ENCARGADO.id, accion: "INSERT", tabla: "clientes", fila_id: "cli-9" },
  { id: 4, ts: new Date(Date.now() - 26 * 3600000).toISOString(), actor_id: MOCK_EMPLEADO.id, accion: "UPDATE", tabla: "empleados", fila_id: MOCK_EMPLEADO_TRABAJADOR.id },
  { id: 3, ts: new Date(Date.now() - 30 * 3600000).toISOString(), actor_id: MOCK_EMPLEADO_ENCARGADO.id, accion: "INSERT", tabla: "gastos", fila_id: "gas-3" },
  { id: 2, ts: new Date(Date.now() - 3 * 86400000).toISOString(), actor_id: MOCK_EMPLEADO.id, accion: "DELETE", tabla: "proveedores", fila_id: "prov-2" },
  { id: 1, ts: new Date(Date.now() - 6 * 86400000).toISOString(), actor_id: null, accion: "UPDATE", tabla: "suscripciones", fila_id: MOCK_SUSCRIPCION.id },
];

/* notas_soporte simuladas (ver docs/supabase-schema.sql) — historial inicial
   de "Notas internas" en /admin-panel/negocios/[id]; las notas nuevas que se
   agreguen en modo mock viven en una cookie aparte (ver mock-admin-overrides.ts),
   nunca mutando este array — mismo criterio que MOCK_ADMIN_NEGOCIOS. */
export const MOCK_ADMIN_NOTAS_SOPORTE = [
  { id: "nota-1", negocio_id: "adm-neg-4", autor: "Soporte", texto: "Llamó por WhatsApp preguntando por qué se bloqueó el acceso. Se le explicó que la suscripción venció sin renovar.", created_at: haceMeses(1, 15) },
  { id: "nota-2", negocio_id: "adm-neg-5", autor: "Soporte", texto: "Se le avisó por correo que el trial vence en 3 días.", created_at: haceMeses(0, 20) },
];

/* Buzón de mejoras — mock del lado del NEGOCIO (/dashboard/mejoras), ya en
   forma de tablero anonimizado (mismo shape que la vista mejoras_publicas):
   nunca expone negocio_id de un tercero, solo `esMia`/`yoVote` relativos al
   único negocio mock (MOCK_NEGOCIO). "es mía" en 2 de 5 es puramente
   presentacional (en modo mock real solo existe un negocio; sirve para
   probar ambos estados de la UI). */
export const MOCK_MEJORAS = [
  { id: "mej-1", titulo: "Recordatorio de citas por SMS", descripcion: "Además de WhatsApp, poder mandar el recordatorio por SMS para clientes sin WhatsApp.", estado: "planificado", createdAt: haceMeses(1, 3), esMia: true, totalVotos: 14, yoVote: true },
  { id: "mej-2", titulo: "Selector de sede en reportes", descripcion: "Filtrar Informes/Reportes por sucursal, no solo el negocio completo.", estado: "en_progreso", createdAt: haceMeses(2, 10), esMia: false, totalVotos: 9, yoVote: false },
  { id: "mej-3", titulo: "Facturación electrónica SUNAT", descripcion: "Emitir boleta/factura electrónica real desde una venta, no solo el recibo interno.", estado: "pendiente", createdAt: haceMeses(0, 22), esMia: false, totalVotos: 21, yoVote: true },
  { id: "mej-4", titulo: "Impresión de etiquetas de precio", descripcion: "Imprimir etiquetas con código de barras para monturas nuevas.", estado: "pendiente", createdAt: haceMeses(0, 5), esMia: true, totalVotos: 3, yoVote: false },
  { id: "mej-5", titulo: "Recordatorio de revisión anual", descripcion: "Aviso automático a los 12 meses de la última cita del cliente.", estado: "completado", createdAt: haceMeses(4, 1), esMia: false, totalVotos: 17, yoVote: true },
];

/* Buzón de mejoras — mock del lado del ADMIN-PANEL (/admin-panel/mejoras):
   datos CRUDOS cross-tenant (con negocio_id real), porque acá el dueño del
   SaaS sí ve qué óptica propuso y quién votó cada cosa — sin la
   anonimización de la vista mejoras_publicas. */
export const MOCK_ADMIN_MEJORAS = [
  { id: "mej-1", negocio_id: "adm-neg-2", titulo: "Recordatorio de citas por SMS", descripcion: "Además de WhatsApp, poder mandar el recordatorio por SMS para clientes sin WhatsApp.", estado: "planificado", created_at: haceMeses(1, 3) },
  { id: "mej-2", negocio_id: "adm-neg-3", titulo: "Selector de sede en reportes", descripcion: "Filtrar Informes/Reportes por sucursal, no solo el negocio completo.", estado: "en_progreso", created_at: haceMeses(2, 10) },
  { id: "mej-3", negocio_id: "adm-neg-1", titulo: "Facturación electrónica SUNAT", descripcion: "Emitir boleta/factura electrónica real desde una venta, no solo el recibo interno.", estado: "pendiente", created_at: haceMeses(0, 22) },
  { id: "mej-4", negocio_id: "adm-neg-5", titulo: "Impresión de etiquetas de precio", descripcion: "Imprimir etiquetas con código de barras para monturas nuevas.", estado: "pendiente", created_at: haceMeses(0, 5) },
  { id: "mej-5", negocio_id: "adm-neg-2", titulo: "Recordatorio de revisión anual", descripcion: "Aviso automático a los 12 meses de la última cita del cliente.", estado: "completado", created_at: haceMeses(4, 1) },
];

export const MOCK_ADMIN_MEJORAS_VOTOS = [
  { mejora_id: "mej-1", negocio_id: "adm-neg-1" }, { mejora_id: "mej-1", negocio_id: "adm-neg-2" }, { mejora_id: "mej-1", negocio_id: "adm-neg-3" },
  { mejora_id: "mej-2", negocio_id: "adm-neg-3" }, { mejora_id: "mej-2", negocio_id: "adm-neg-4" },
  { mejora_id: "mej-3", negocio_id: "adm-neg-1" }, { mejora_id: "mej-3", negocio_id: "adm-neg-2" }, { mejora_id: "mej-3", negocio_id: "adm-neg-5" }, { mejora_id: "mej-3", negocio_id: "adm-neg-6" },
  { mejora_id: "mej-4", negocio_id: "adm-neg-4" },
  { mejora_id: "mej-5", negocio_id: "adm-neg-1" }, { mejora_id: "mej-5", negocio_id: "adm-neg-3" },
];

/* "Ver como negocio" — vista de solo lectura (/admin-panel/negocios/[id]/vista).
   Datos crudos por negocio-tenant (namespace adm-neg-*, no confundir con
   MOCK_CLIENTES/MOCK_CITAS/etc. de arriba, que son el ÚNICO negocio logueado
   en el dashboard mock). Solo se completan adm-neg-1 y adm-neg-2 a propósito:
   el resto queda vacío para poder probar también el estado "sin datos" de
   cada sección sin tener que inventar contenido para los 6 negocios. */
export const MOCK_ADMIN_VISTA_CLIENTES = [
  { id: "vcli-1", negocio_id: "adm-neg-1", nombres: "Pedro", apellidos: "Huamán", telefono: "944 123 456", created_at: haceMeses(0, 20) },
  { id: "vcli-2", negocio_id: "adm-neg-1", nombres: "Lucía", apellidos: "Campos", telefono: "955 234 567", created_at: haceMeses(0, 15) },
  { id: "vcli-3", negocio_id: "adm-neg-2", nombres: "Fernando", apellidos: "Ríos", telefono: "966 345 678", created_at: haceMeses(0, 22) },
];

export const MOCK_ADMIN_VISTA_CITAS = [
  { id: "vcit-1", negocio_id: "adm-neg-1", fecha_hora: new Date(Date.now() + 2 * 86400000).toISOString(), motivo: "Control anual", estado: "programada", cliente_nombre: "Pedro Huamán" },
  { id: "vcit-2", negocio_id: "adm-neg-2", fecha_hora: new Date(Date.now() + 1 * 86400000).toISOString(), motivo: "Entrega de lentes", estado: "programada", cliente_nombre: "Fernando Ríos" },
];

export const MOCK_ADMIN_VISTA_VENTAS = [
  { id: "vven-1", negocio_id: "adm-neg-1", fecha: haceMeses(0, 21), total: 280, metodo_pago: "efectivo", estado: "pagada", cliente_nombre: "Pedro Huamán" },
  { id: "vven-2", negocio_id: "adm-neg-2", fecha: haceMeses(0, 23), total: 410, metodo_pago: "tarjeta", estado: "pagada", cliente_nombre: "Fernando Ríos" },
];

export const MOCK_ADMIN_VISTA_STOCK_BAJO = [
  { producto_id: "vprod-1", negocio_id: "adm-neg-1", nombre: "Luna antireflejo 1.56", stock_actual: 1, stock_minimo: 3 },
  { producto_id: "vprod-2", negocio_id: "adm-neg-2", nombre: "Armazón Ray-Ban RB2140", stock_actual: 0, stock_minimo: 2 },
];
