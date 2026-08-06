import type {
  Empleado, RolPersonalizado, Negocio, Suscripcion, Sucursal, Cliente, Cita, Receta, ExamenOptometrico,
  Producto, MovimientoStock, Venta, VentaItem, OrdenLaboratorio, EstadoOrdenLaboratorio, Caja, Gasto, Descuento,
  Proveedor, Cotizacion, CotizacionItem, Asistencia, EstadoAsistencia, AsistenciaFoto, PagoSueldo,
} from "@/components/providers/DataProvider";

// Mismo formato que to_char(fecha, 'DD/MM/YYYY') del trigger SQL real
// (fn_pago_sueldo_sync_gasto) — usado por generarPagosSueldoStress más abajo
// para armar la descripción del Gasto espejo igual que en producción.
function fechaCortaMock(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/* Datos de ejemplo para el modo mock — ver mock-mode.ts. Un solo negocio,
   un solo empleado (administrador), un puñado de filas por entidad para que
   el dashboard y las listas no se vean vacías. */

// Nombres/apellidos compartidos por TODOS los generadores de volumen de este
// archivo (clientes, empleados, etc.) — arriba de todo para que cualquier
// generador pueda usarlos sin importar en qué orden se llamen entre sí.
const NOMBRES_STRESS = [
  "Carlos", "María", "Luis", "Ana", "José", "Rosa", "Miguel", "Carmen", "Jorge", "Patricia",
  "Pedro", "Lucía", "Fernando", "Sofía", "Diego", "Valeria", "Ricardo", "Gabriela", "Andrés", "Camila",
  "Manuel", "Daniela", "Javier", "Fiorella", "Raúl", "Milagros", "Alberto", "Katherine", "Óscar", "Pilar",
  "Julio", "Ximena", "Víctor", "Alejandra", "Enrique", "Yolanda", "Martín", "Nicole", "Iván", "Cecilia",
  "Franco", "Estefanía", "Gustavo", "Paola", "Hugo", "Marisol", "Sergio", "Grecia", "Alonso", "Brenda",
];
const APELLIDOS_STRESS = [
  "Ramírez", "López", "García", "Rodríguez", "Torres", "Flores", "Vargas", "Castillo", "Chávez", "Quispe",
  "Mendoza", "Rojas", "Salazar", "Gutiérrez", "Huamán", "Campos", "Ríos", "Paredes", "Cabrera", "Reyes",
  "Espinoza", "Ortiz", "Guerrero", "Medina", "Aguilar", "Vega", "Carrasco", "Peña", "Zúñiga", "Silva",
  "Chumpitaz", "Ponce", "Alva", "Cárdenas", "Bravo", "Núñez", "Salinas", "Herrera", "Solís", "Bautista",
  "Cruz", "Meza", "Bernal", "Cortez", "Loayza", "Yupanqui", "Palomino", "Del Valle", "Ibarra", "Contreras",
];

export const MOCK_NEGOCIO: Negocio = {
  id: "mock-negocio-1",
  nombre: "Óptica Demo",
  subdominio: "optica-demo",
  ruc: "10123456789",
  telefono: "999 999 999",
  direccion: "Av. Siempre Viva 123, Lima",
  activo: true,
};

/* Sucursales/empleados/roles de prueba — el usuario pidió explícitamente 50
   filas en TODOS los paneles, sede/empleados/roles incluidos (aunque una
   óptica pyme real nunca tendría 50 sedes ni 50 empleados — es a propósito
   para ver cómo responde la UI con ese volumen, no para que la demo se vea
   "realista"). Van ACÁ (antes de MOCK_EMPLEADO/MOCK_EMPLEADOS) porque cada
   empleado de prueba necesita un `sucursalId` real ya generado. */
const DISTRITOS_SEDE_STRESS = [
  "Miraflores", "San Isidro", "Surco", "La Molina", "San Borja", "Barranco", "Jesús María",
  "Lince", "Magdalena", "Pueblo Libre", "San Miguel", "Chorrillos", "Comas", "Los Olivos",
  "San Juan de Lurigancho", "Ate", "Villa El Salvador", "Callao", "Independencia", "Rímac",
];
function generarSucursalesStress(cantidad: number): Sucursal[] {
  return Array.from({ length: cantidad }, (_, i) => ({
    id: `suc-stress-${i + 1}`,
    negocioId: MOCK_NEGOCIO.id,
    nombre: `Sede ${DISTRITOS_SEDE_STRESS[i % DISTRITOS_SEDE_STRESS.length]}${i >= DISTRITOS_SEDE_STRESS.length ? ` ${Math.floor(i / DISTRITOS_SEDE_STRESS.length) + 1}` : ""}`,
    direccion: `Av. Principal ${100 + i * 3}, ${DISTRITOS_SEDE_STRESS[i % DISTRITOS_SEDE_STRESS.length]}`,
    telefono: `01 ${String(2000000 + i * 113).padStart(7, "0")}`,
    activo: i % 9 !== 0, // un puñado inactivas, para probar ese filtro con volumen
  }));
}
const SUCURSALES_STRESS = generarSucursalesStress(50);

// Diario/semanal/quincenal/mensual, con un monto base acorde a cada
// frecuencia (un sueldo diario ronda S/60-80, uno mensual S/1200-2500) —
// usado tanto por generarEmpleadosStress como por generarAsistenciaYPagosStress.
const TIPOS_PAGO_STRESS: Empleado["tipoPago"][] = ["diario", "semanal", "quincenal", "mensual"];
function montoBasePorTipoPago(tipo: Empleado["tipoPago"], i: number): number {
  switch (tipo) {
    case "diario": return 60 + (i % 5) * 5; // 60-80
    case "semanal": return 350 + (i % 5) * 30; // 350-470
    case "quincenal": return 700 + (i % 5) * 60; // 700-940
    default: return 1200 + (i % 6) * 220; // 1200-2300, "mensual"
  }
}

function generarEmpleadosStress(cantidad: number, sucursales: Sucursal[]): Empleado[] {
  const roles: Empleado["rol"][] = ["administrador", "encargado", "trabajador", "trabajador", "trabajador"];
  return Array.from({ length: cantidad }, (_, i) => {
    const tipoPago = TIPOS_PAGO_STRESS[i % TIPOS_PAGO_STRESS.length];
    return {
      id: `emp-stress-${i + 1}`,
      negocioId: MOCK_NEGOCIO.id,
      nombres: NOMBRES_STRESS[i % NOMBRES_STRESS.length],
      apellidos: APELLIDOS_STRESS[(i + 7) % APELLIDOS_STRESS.length],
      rol: roles[i % roles.length],
      email: `empleado${i + 1}@opticademo.pe`,
      telefono: `9${String(20000000 + i * 641).padStart(8, "0")}`,
      permisos: {},
      comisionPct: [0, 3, 5, 8, 10][i % 5],
      // 1 de cada 4 sin sede fija (ve/gestiona todas) — mismo criterio que el
      // resto de la app: `sucursalId` ausente = todas las sedes.
      sucursalId: i % 4 === 0 ? undefined : sucursales[i % sucursales.length].id,
      // Asistencia/sueldos — horario variado (7-9am entrada, 16-18 salida),
      // tolerancia 5-15 min, tipo/monto de pago rotando entre los 4 casos.
      horaEntradaEsperada: `0${7 + (i % 3)}:00`,
      horaSalidaEsperada: `1${6 + (i % 3)}:00`,
      toleranciaTardanzaMin: [5, 10, 15][i % 3],
      tipoPago,
      montoPagoBase: montoBasePorTipoPago(tipoPago, i),
      activo: i % 11 !== 0,
    };
  });
}

function generarRolesPersonalizadosStress(cantidad: number): RolPersonalizado[] {
  const nombres = [
    "Cajero", "Recepción", "Optometrista", "Vendedor senior", "Asistente", "Supervisor de sede",
    "Encargado de stock", "Atención al cliente", "Vendedor junior", "Técnico de laboratorio",
  ];
  const modulos = ["ventas", "citas", "clientes", "cotizaciones", "laboratorio", "productos", "gastos", "descuentos"];
  const niveles = ["lectura", "escritura"];
  return Array.from({ length: cantidad }, (_, i) => {
    const permisos: Record<string, string> = {};
    // Cada rol de prueba delega 2-3 módulos distintos (no todos), variando
    // el nivel — mismo criterio mixto que ya usaban "Cajero"/"Recepción".
    for (let m = 0; m < 3; m++) {
      const clave = modulos[(i + m * 3) % modulos.length];
      permisos[clave] = niveles[(i + m) % niveles.length];
    }
    return {
      id: `rol-stress-${i + 1}`,
      negocioId: MOCK_NEGOCIO.id,
      nombre: `${nombres[i % nombres.length]} ${Math.floor(i / nombres.length) + 1}`,
      permisos,
    };
  });
}

export const MOCK_EMPLEADO: Empleado = {
  id: "mock-empleado-1",
  negocioId: MOCK_NEGOCIO.id,
  nombres: "Ana",
  apellidos: "Demo",
  rol: "administrador",
  email: "demo@optica.pe",
  permisos: {},
  comisionPct: 5,
  horaEntradaEsperada: "09:00",
  horaSalidaEsperada: "18:00",
  toleranciaTardanzaMin: 10,
  tipoPago: "mensual",
  montoPagoBase: 2200,
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
  horaEntradaEsperada: "08:30",
  horaSalidaEsperada: "17:30",
  toleranciaTardanzaMin: 10,
  tipoPago: "quincenal",
  montoPagoBase: 850,
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
  horaEntradaEsperada: "09:00",
  horaSalidaEsperada: "18:00",
  toleranciaTardanzaMin: 15,
  tipoPago: "diario",
  montoPagoBase: 70,
  activo: true,
};

export const MOCK_EMPLEADOS: Empleado[] = [
  MOCK_EMPLEADO, MOCK_EMPLEADO_ENCARGADO, MOCK_EMPLEADO_TRABAJADOR,
  ...generarEmpleadosStress(50, SUCURSALES_STRESS),
];

/* Roles personalizados de ejemplo (ver /dashboard/roles) — ninguno está
   asignado a MOCK_EMPLEADO_TRABAJADOR por defecto (su `permisos: {}` de
   arriba sigue siendo el camino "sin rol personalizado"), para que el
   selector en Empleados arranque en ese estado y se pueda probar el cambio.
   "Cajero" mezcla a propósito escritura en un módulo y solo lectura en
   otro (Gastos) — para poder probar de entrada el caso mixto en la UI. */
export const MOCK_ROLES_PERSONALIZADOS: RolPersonalizado[] = [
  { id: "rol-1", negocioId: MOCK_NEGOCIO.id, nombre: "Cajero", permisos: { ventas: "escritura", gastos: "lectura" } },
  { id: "rol-2", negocioId: MOCK_NEGOCIO.id, nombre: "Recepción", permisos: { citas: "escritura", clientes: "escritura" } },
  ...generarRolesPersonalizadosStress(50),
];

/* Premium (plan top) a propósito — para poder ver en la demo del dashboard
   CUALQUIER función que esté condicionada por plan (sin banners de
   upgrade/trial de por medio), pedido explícito del usuario. */
export const MOCK_SUSCRIPCION: Suscripcion = {
  id: "mock-sub-1",
  negocioId: MOCK_NEGOCIO.id,
  plan: "premium",
  estado: "activa",
  trialInicio: "",
  trialFin: "",
};

// Antes vacío por defecto (caso común: negocio de una sola sede). Con 50
// sedes de prueba (pedido explícito del usuario) el selector de sede y la
// columna "Sede" SÍ aparecen en toda la UI — es el otro modo real de la app
// (multisede), no un bug.
export const MOCK_SUCURSALES: Sucursal[] = SUCURSALES_STRESS;

/* ================= DATOS DE PRUEBA DE VOLUMEN (stress test UI) =================
   ~50 filas de más por entidad (negocio Y admin-panel), generadas acá (no a
   mano) para ver cómo responde TODO el sistema con cantidad real:
   paginación, tablas largas, la grilla de Mes con días muy cargados,
   gráficos de Informes/Pagos con más puntos, etc. Deterministas (sin
   Math.random, mismo criterio que generarEventosUsoMock más abajo) para que
   la demo no cambie entre recargas. Ids con sufijo `-stress-N` para no
   chocar con los registros "de mano" de arriba/abajo, que otras secciones
   del mock (exámenes, votos de mejoras, etc.) siguen referenciando por id
   literal — el orden de las siguientes constantes/exports respeta las
   dependencias reales (ej. productos necesita proveedores ya generados). */
// Sin tildes/ñ, para armar emails deterministas tipo "nombre.apellido@correo.pe".
function quitarTildes(s: string): string {
  return s.normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "");
}
const NOTAS_CLIENTE_STRESS = [
  "Cliente frecuente", "Prefiere contacto por WhatsApp", "Alérgico a resinas específicas",
  "Recomendado por otro cliente", "Usa lentes progresivos", "Sensible a la luz, prefiere fotocromático",
  "Prefiere horario de tarde", "Trae receta de otro centro",
];

function generarClientesStress(cantidad: number): Cliente[] {
  return Array.from({ length: cantidad }, (_, i) => {
    const nombres = NOMBRES_STRESS[i % NOMBRES_STRESS.length];
    const apellidos = APELLIDOS_STRESS[i % APELLIDOS_STRESS.length];
    const fechaNac = new Date();
    fechaNac.setFullYear(fechaNac.getFullYear() - (18 + (i % 53)), i % 12, 1 + (i % 28)); // 18 a 70 años
    return {
      id: `cli-stress-${i + 1}`,
      negocioId: MOCK_NEGOCIO.id,
      nombres, apellidos,
      documentoTipo: "DNI",
      documentoNumero: String(40000000 + i * 271),
      telefono: `9${String(10000000 + i * 733).padStart(8, "0")}`,
      email: `${quitarTildes(nombres).toLowerCase()}.${quitarTildes(apellidos).toLowerCase()}@correo.pe`,
      fechaNacimiento: fechaNac.toISOString().slice(0, 10),
      direccion: `Av. Los Álamos ${100 + i * 7}, ${DISTRITOS_SEDE_STRESS[i % DISTRITOS_SEDE_STRESS.length]}`,
      notas: NOTAS_CLIENTE_STRESS[i % NOTAS_CLIENTE_STRESS.length],
    };
  });
}

const MOTIVOS_CITA_STRESS = [
  "Control anual", "Entrega de lentes", "Examen de refracción", "Ajuste de armazón",
  "Revisión post-operatoria", "Consulta general", "Adaptación de lentes de contacto",
];
const ESTADOS_CITA_STRESS = ["programada", "atendida", "cancelada", "no_asistio"];

function generarCitasStress(cantidad: number, clientes: Cliente[]): Cita[] {
  const empleados = [MOCK_EMPLEADO.id, MOCK_EMPLEADO_ENCARGADO.id, MOCK_EMPLEADO_TRABAJADOR.id];
  return Array.from({ length: cantidad }, (_, i) => {
    /* Las primeras 42 se reparten ~3 por día en 14 días (-7..+6 respecto a
       hoy); las últimas 8 se fuerzan TODAS a hoy a propósito — hoy ya recibe
       3 de la distribución normal, así que termina con 11 citas en un solo
       día: más que MAX_CHIPS_POR_DIA (3) y MAX_PUNTOS_POR_DIA (4) de
       CalendarioMes.tsx, para ver de verdad el caso "+N más"/popover cargado. */
    const diaOffset = i < 42 ? Math.floor(i / 3) - 7 : 0;
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + diaOffset);
    fecha.setHours(9 + (i % 8), (i % 4) * 15, 0, 0);
    return {
      id: `cit-stress-${i + 1}`,
      negocioId: MOCK_NEGOCIO.id,
      clienteId: clientes[(i * 7) % clientes.length].id,
      empleadoId: empleados[i % empleados.length],
      fechaHora: fecha.toISOString(),
      motivo: MOTIVOS_CITA_STRESS[i % MOTIVOS_CITA_STRESS.length],
      estado: ESTADOS_CITA_STRESS[i % ESTADOS_CITA_STRESS.length],
      duracionMin: [15, 30, 45, 60][i % 4],
    };
  });
}

const NOMBRES_PROVEEDOR_STRESS = [
  "Óptica Distribuidora", "Lentes Andinos", "Monturas Premium", "Import Óptico", "Grupo Visión",
  "Distribuidora Lima Óptica", "Comercial Óptica Sur", "Óptica Mayorista", "Lentes y Monturas", "Óptica Global Perú",
];
const SUFIJOS_EMPRESA_STRESS = ["SAC", "EIRL", "SRL", "SA"];

function generarProveedoresStress(cantidad: number): Proveedor[] {
  return Array.from({ length: cantidad }, (_, i) => ({
    id: `prov-stress-${i + 1}`,
    negocioId: MOCK_NEGOCIO.id,
    nombre: `${NOMBRES_PROVEEDOR_STRESS[i % NOMBRES_PROVEEDOR_STRESS.length]} ${i + 1} ${SUFIJOS_EMPRESA_STRESS[i % SUFIJOS_EMPRESA_STRESS.length]}`,
    ruc: String(20300000000 + i * 1013),
    contacto: `${NOMBRES_STRESS[i % NOMBRES_STRESS.length]} ${APELLIDOS_STRESS[i % APELLIDOS_STRESS.length]}`,
    telefono: `01 ${String(2000000 + i * 137).padStart(7, "0")}`,
    email: i % 5 === 0 ? undefined : `contacto${i + 1}@proveedor${i + 1}.pe`,
    activo: i % 11 !== 0,
  }));
}

/* Categorías reales del `<select>` de productos (src/app/dashboard/productos/page.tsx,
   const CATEGORIAS) — usar cualquier otro valor no rompería el tipo (Producto.categoria
   es `string` libre) pero sí el label/ícono que la UI real muestra para cada una. */
const CATEGORIAS_PRODUCTO_STRESS = ["montura", "luna", "lente_contacto", "liquido", "accesorio", "servicio"] as const;
const NOMBRES_PRODUCTO_STRESS: Record<string, string[]> = {
  montura: ["Armazón Oakley OX8046", "Armazón Vogue VO5052", "Armazón Persol PO3007", "Armazón Tom Ford FT5401", "Armazón Carrera 8846"],
  luna: ["Luna fotocromática 1.61", "Luna blue light 1.56", "Luna alto índice 1.67", "Luna bifocal 1.56", "Luna progresiva 1.6"],
  lente_contacto: ["Biofinity mensual", "Air Optix quincenal", "Dailies diario", "Freshlook color", "Acuvue Vita mensual"],
  liquido: ["Solución única Opti-Free", "Solución Renu", "Gotas humectantes", "Solución Biotrue", "Limpiador enzimático"],
  accesorio: ["Estuche rígido", "Paño de microfibra", "Cordón para lentes", "Kit de limpieza", "Cadena para armazón"],
  servicio: ["Ajuste de armazón", "Pulido de luna", "Soldadura de bisagra", "Cambio de plaquetas", "Revisión de armazón"],
};

function generarProductosStress(cantidad: number, proveedores: Proveedor[]): Producto[] {
  return Array.from({ length: cantidad }, (_, i) => {
    const categoria = CATEGORIAS_PRODUCTO_STRESS[i % CATEGORIAS_PRODUCTO_STRESS.length];
    const nombresCat = NOMBRES_PRODUCTO_STRESS[categoria];
    const precioCosto = 20 + (i % 30) * 8;
    const precioVenta = Math.round(precioCosto * 1.8);
    const stockMinimo = 2 + (i % 4);
    // Cada 6to producto queda en/bajo su mínimo a propósito, para ver el
    // estado "stock bajo" con volumen real (Productos e Informes).
    const stockActual = i % 6 === 0 ? Math.max(0, stockMinimo - 1) : stockMinimo + 1 + (i % 10);
    const esLenteContacto = categoria === "lente_contacto";
    return {
      id: `prod-stress-${i + 1}`,
      negocioId: MOCK_NEGOCIO.id,
      proveedorId: i % 3 === 0 ? undefined : proveedores[i % proveedores.length].id,
      nombre: `${nombresCat[i % nombresCat.length]} #${i + 1}`,
      categoria,
      marca: i % 4 === 0 ? undefined : ["Ray-Ban", "Oakley", "Vogue", "Persol", "Carrera", "Johnson & Johnson"][i % 6],
      precioVenta, precioCosto,
      ...(esLenteContacto ? { curvaBase: 8.4, diametro: 14, potencia: -0.5 - (i % 10) * 0.5, duracionReposicionDias: [1, 15, 30][i % 3] } : {}),
      garantiaMeses: categoria === "montura" ? 12 : undefined,
      activo: i % 13 !== 0,
      stockActual, stockMinimo,
    };
  });
}

/* Tipos reales del `<select>` de movimientos de stock
   (src/app/dashboard/productos/page.tsx, const TIPOS_MOVIMIENTO). */
const TIPOS_MOVIMIENTO_STRESS = ["entrada", "salida", "ajuste", "devolucion"] as const;

function generarMovimientosStockStress(cantidad: number, productos: Producto[]): MovimientoStock[] {
  return Array.from({ length: cantidad }, (_, i) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - (cantidad - i));
    const tipo = TIPOS_MOVIMIENTO_STRESS[i % TIPOS_MOVIMIENTO_STRESS.length];
    const motivos: Record<string, string> = {
      entrada: "Compra a proveedor", salida: "Venta", ajuste: "Ajuste de inventario", devolucion: "Devolución de cliente",
    };
    return {
      id: `mov-stress-${i + 1}`,
      negocioId: MOCK_NEGOCIO.id,
      productoId: productos[(i * 3) % productos.length].id,
      tipo,
      cantidad: tipo === "ajuste" ? 5 + (i % 20) : 1 + (i % 10),
      motivo: motivos[tipo],
      fecha: fecha.toISOString(),
    };
  });
}

/** Genera ventas + sus venta_items en pareja (mismo índice) — separarlos en
 *  dos funciones independientes arriesgaría desincronizar ids/montos entre
 *  ambos arrays. */
function generarVentasYItemsStress(
  cantidad: number, clientes: Cliente[], productos: Producto[],
): { ventas: Venta[]; items: VentaItem[] } {
  const metodos = ["efectivo", "tarjeta", "yape", "transferencia"];
  const empleados = [MOCK_EMPLEADO.id, MOCK_EMPLEADO_ENCARGADO.id, MOCK_EMPLEADO_TRABAJADOR.id];
  const ventas: Venta[] = [];
  const items: VentaItem[] = [];
  for (let i = 0; i < cantidad; i++) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - (cantidad - i)); // últimos `cantidad` días, terminando hoy
    fecha.setHours(10 + (i % 8), (i * 7) % 60, 0, 0);
    const producto = productos[i % productos.length];
    const cantidadItem = 1 + (i % 3);
    // precioUnitario * cantidad es el total CON IGV incluido (mismo criterio
    // que ven-1..4 de arriba: item.subtotal = total de la venta cuando hay
    // un solo ítem); subtotal/igv de la venta se derivan dividiendo entre 1.18.
    const totalItem = Number((producto.precioVenta * cantidadItem).toFixed(2));
    const subtotal = Number((totalItem / 1.18).toFixed(2));
    const igv = Number((totalItem - subtotal).toFixed(2));
    const ventaId = `ven-stress-${i + 1}`;
    const anulada = i % 17 === 0; // un puñado anuladas, para probar ese estado con volumen real
    ventas.push({
      id: ventaId, negocioId: MOCK_NEGOCIO.id, clienteId: clientes[(i * 3) % clientes.length].id,
      empleadoId: empleados[i % empleados.length], fecha: fecha.toISOString(),
      subtotal, igv, total: totalItem,
      metodoPago: metodos[i % metodos.length],
      estado: anulada ? "anulada" : "pagada",
      montoPagado: anulada ? 0 : totalItem,
    });
    items.push({
      id: `vi-stress-${i + 1}`, ventaId, productoId: producto.id,
      descripcion: producto.nombre, cantidad: cantidadItem, precioUnitario: producto.precioVenta, subtotal: totalItem,
    });
  }
  return { ventas, items };
}

const ESTADOS_LAB_STRESS: EstadoOrdenLaboratorio[] = [
  "generado", "enviado", "en_proceso", "terminado", "en_transito", "recibido", "entregado", "cancelado",
];
const LABORATORIOS_STRESS = ["Laboratorio Central Lima", "Óptica Lab Perú", "Laboratorio San Isidro", "Cristal Lab", "Laboratorio Andino"];

function generarOrdenesLaboratorioStress(cantidad: number, clientes: Cliente[]): OrdenLaboratorio[] {
  const empleados = [MOCK_EMPLEADO.id, MOCK_EMPLEADO_ENCARGADO.id, MOCK_EMPLEADO_TRABAJADOR.id];
  return Array.from({ length: cantidad }, (_, i) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - (cantidad - i));
    return {
      id: `lab-stress-${i + 1}`,
      negocioId: MOCK_NEGOCIO.id,
      clienteId: clientes[(i * 9) % clientes.length].id,
      empleadoId: empleados[i % empleados.length],
      laboratorioNombre: LABORATORIOS_STRESS[i % LABORATORIOS_STRESS.length],
      estado: ESTADOS_LAB_STRESS[i % ESTADOS_LAB_STRESS.length],
      fechaGenerado: fecha.toISOString(),
    };
  });
}

function generarCajasStress(cantidad: number): Caja[] {
  const empleados = [MOCK_EMPLEADO.id, MOCK_EMPLEADO_ENCARGADO.id, MOCK_EMPLEADO_TRABAJADOR.id];
  return Array.from({ length: cantidad }, (_, i) => {
    const apertura = new Date();
    apertura.setDate(apertura.getDate() - (cantidad - i));
    apertura.setHours(9, 0, 0, 0);
    const cierre = new Date(apertura);
    cierre.setHours(20, 0, 0, 0);
    const montoInicial = 100;
    const totalEfectivo = 150 + (i % 20) * 15;
    const totalTarjeta = 200 + (i % 15) * 20;
    const totalYape = 80 + (i % 10) * 12;
    const montoEfectivoEsperado = montoInicial + totalEfectivo;
    // La mayoría cuadra exacto; cada 8vo tiene una pequeña diferencia real,
    // para poder ver ese caso con volumen en el historial de cajas.
    const diferencia = i % 8 === 0 ? -5 - (i % 10) : 0;
    return {
      id: `caja-stress-${i + 1}`,
      negocioId: MOCK_NEGOCIO.id,
      empleadoAperturaId: empleados[i % empleados.length],
      empleadoCierreId: empleados[(i + 1) % empleados.length],
      fechaApertura: apertura.toISOString(),
      fechaCierre: cierre.toISOString(),
      montoInicial,
      desgloseApertura: [{ metodo: "Efectivo", monto: montoInicial }],
      totalEfectivo, totalTarjeta, totalYape, totalPlin: 0, totalTransferencia: 0,
      montoEfectivoEsperado, montoEfectivoContado: montoEfectivoEsperado + diferencia, diferencia,
      estado: "cerrada",
    };
  });
}

/* Categorías reales del `<select>` de gastos (src/app/dashboard/gastos/page.tsx,
   const CATEGORIAS). */
const CATEGORIAS_GASTO_STRESS = ["alquiler", "sueldos", "insumos", "servicios", "proveedor", "otro"] as const;
const CATEGORIA_GASTO_DESC_STRESS: Record<string, string> = {
  alquiler: "Alquiler del local", sueldos: "Pago de sueldos", insumos: "Compra de insumos",
  servicios: "Pago de servicios (luz/agua/internet)", proveedor: "Pago a proveedor", otro: "Gasto varios",
};

function generarGastosStress(cantidad: number, proveedores: Proveedor[]): Gasto[] {
  return Array.from({ length: cantidad }, (_, i) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i * 2); // repartidos cada 2 días hacia atrás (~100 días de historia)
    const categoria = CATEGORIAS_GASTO_STRESS[i % CATEGORIAS_GASTO_STRESS.length];
    return {
      id: `gas-stress-${i + 1}`,
      negocioId: MOCK_NEGOCIO.id,
      proveedorId: i % 3 === 0 ? proveedores[i % proveedores.length].id : undefined,
      categoria,
      descripcion: `${CATEGORIA_GASTO_DESC_STRESS[categoria]} #${i + 1}`,
      monto: Number((80 + (i % 40) * 35.5).toFixed(2)),
      fecha: fecha.toISOString().slice(0, 10),
    };
  });
}

const TIPOS_DESCUENTO_STRESS = ["porcentaje", "monto"] as const;
const APLICA_A_DESCUENTO_STRESS = ["cotizaciones", "ventas", "ambos"] as const;

function generarDescuentosStress(cantidad: number): Descuento[] {
  return Array.from({ length: cantidad }, (_, i) => {
    const tipo = TIPOS_DESCUENTO_STRESS[i % TIPOS_DESCUENTO_STRESS.length];
    return {
      id: `desc-stress-${i + 1}`,
      negocioId: MOCK_NEGOCIO.id,
      codigo: `PROMO${String(i + 1).padStart(3, "0")}`,
      tipo,
      valor: tipo === "porcentaje" ? 5 + (i % 6) * 5 : 10 + (i % 10) * 10,
      aplicaA: APLICA_A_DESCUENTO_STRESS[i % APLICA_A_DESCUENTO_STRESS.length],
      limiteUsos: i % 4 === 0 ? undefined : 20 + (i % 8) * 10,
      usos: i % 7,
      activo: i % 5 !== 0,
    };
  });
}

const ESTADOS_COTIZACION_STRESS = ["pendiente", "aceptada", "rechazada", "vencida"] as const;

/** Igual criterio que generarVentasYItemsStress: cotización + su(s) ítem(s)
 *  en pareja, mismo índice, para no desincronizar ids/montos. */
function generarCotizacionesYItemsStress(
  cantidad: number, clientes: Cliente[], productos: Producto[],
): { cotizaciones: Cotizacion[]; items: CotizacionItem[] } {
  const cotizaciones: Cotizacion[] = [];
  const items: CotizacionItem[] = [];
  for (let i = 0; i < cantidad; i++) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - (cantidad - i));
    const vigencia = new Date(fecha);
    vigencia.setDate(vigencia.getDate() + 7);
    const producto = productos[(i * 5) % productos.length];
    const cantidadItem = 1 + (i % 2);
    const totalItem = Number((producto.precioVenta * cantidadItem).toFixed(2));
    const subtotal = Number((totalItem / 1.18).toFixed(2));
    const igv = Number((totalItem - subtotal).toFixed(2));
    const cotId = `cot-stress-${i + 1}`;
    cotizaciones.push({
      id: cotId, negocioId: MOCK_NEGOCIO.id, clienteId: clientes[(i * 11) % clientes.length].id,
      fecha: fecha.toISOString().slice(0, 10),
      vigenciaHasta: vigencia.toISOString().slice(0, 10),
      subtotal, igv, total: totalItem,
      estado: ESTADOS_COTIZACION_STRESS[i % ESTADOS_COTIZACION_STRESS.length],
    });
    items.push({
      id: `coti-stress-${i + 1}`, cotizacionId: cotId, productoId: producto.id,
      descripcion: producto.nombre, cantidad: cantidadItem, precioUnitario: producto.precioVenta, subtotal: totalItem,
    });
  }
  return { cotizaciones, items };
}

/* ================= HISTORIAL PROFUNDO POR CLIENTE =================
   El usuario ya no quiere pocas filas repartidas entre muchos clientes —
   quiere que CUALQUIER cliente, al abrir su ficha (/dashboard/clientes/[id]),
   tenga 15 citas + 15 exámenes + 15 compras propias. Ids con prefijo
   `-perfil-<clienteIndex>-<n>` (no chocan con `-stress-N` de arriba). */
function generarCitasPerfilStress(clientes: Cliente[]): Cita[] {
  const empleados = [MOCK_EMPLEADO.id, MOCK_EMPLEADO_ENCARGADO.id, MOCK_EMPLEADO_TRABAJADOR.id];
  const citas: Cita[] = [];
  for (let ci = 0; ci < clientes.length; ci++) {
    const cliente = clientes[ci];
    for (let n = 0; n < 15; n++) {
      // Ventana de ~420 días (-360 a +60 respecto a hoy), desplazada por
      // cliente (ci) para que no todos caigan en los mismos días.
      const diaOffset = -360 + ((ci * 15 + n) * 17) % 420;
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + diaOffset);
      fecha.setHours(9 + (n % 8), (n % 4) * 15, 0, 0);
      citas.push({
        id: `cit-perfil-${ci + 1}-${n + 1}`,
        negocioId: MOCK_NEGOCIO.id,
        clienteId: cliente.id,
        empleadoId: empleados[(ci + n) % empleados.length],
        fechaHora: fecha.toISOString(),
        motivo: MOTIVOS_CITA_STRESS[(ci + n) % MOTIVOS_CITA_STRESS.length],
        estado: ESTADOS_CITA_STRESS[(ci + n) % ESTADOS_CITA_STRESS.length],
        duracionMin: [15, 30, 45, 60][n % 4],
      });
    }
  }
  return citas;
}

const AGUDEZAS_STRESS = ["20/20", "20/25", "20/30", "20/40", "20/50", "20/70"];
const ANAMNESIS_STRESS = [
  "Refiere visión borrosa de lejos, sin antecedentes familiares relevantes.",
  "Control de rutina, sin molestias visuales reportadas.",
  "Refiere fatiga visual tras uso prolongado de pantallas.",
  "Seguimiento de miopía progresiva.",
  "Primera consulta, refiere dolor de cabeza frecuente.",
  "Control post-adaptación de lentes de contacto.",
  "Refiere visión borrosa de cerca, sospecha de presbicia.",
];

function generarExamenesPerfilStress(clientes: Cliente[], citasPerfil: Cita[]): ExamenOptometrico[] {
  const examenes: ExamenOptometrico[] = [];
  for (let ci = 0; ci < clientes.length; ci++) {
    const cliente = clientes[ci];
    const citasCliente = citasPerfil.filter((c) => c.clienteId === cliente.id);
    for (let n = 0; n < 15; n++) {
      const diaOffset = -360 + ((ci * 15 + n) * 17) % 420;
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + diaOffset);
      // 1 de cada 3 exámenes enlaza una cita real del mismo cliente — el
      // resto queda suelto (un examen no siempre viene de una cita agendada).
      const ligarCita = n % 3 === 0 && citasCliente.length > 0;
      examenes.push({
        id: `exam-perfil-${ci + 1}-${n + 1}`,
        negocioId: MOCK_NEGOCIO.id,
        clienteId: cliente.id,
        citaId: ligarCita ? citasCliente[n % citasCliente.length].id : undefined,
        fecha: fecha.toISOString().slice(0, 10),
        odAvSc: AGUDEZAS_STRESS[(ci + n) % AGUDEZAS_STRESS.length],
        odAvCc: AGUDEZAS_STRESS[(ci + n + 1) % AGUDEZAS_STRESS.length],
        oiAvSc: AGUDEZAS_STRESS[(ci + n + 2) % AGUDEZAS_STRESS.length],
        oiAvCc: AGUDEZAS_STRESS[(ci + n + 3) % AGUDEZAS_STRESS.length],
        odK1: Number((41 + ((ci + n) % 50) / 10).toFixed(2)),
        odK2: Number((42 + ((ci + n) % 40) / 10).toFixed(2)),
        odEjeK: (ci * 7 + n * 13) % 181,
        oiK1: Number((41 + ((ci + n + 3) % 50) / 10).toFixed(2)),
        oiK2: Number((42 + ((ci + n + 3) % 40) / 10).toFixed(2)),
        oiEjeK: (ci * 11 + n * 9) % 181,
        anamnesis: ANAMNESIS_STRESS[(ci + n) % ANAMNESIS_STRESS.length],
      });
    }
  }
  return examenes;
}

/** Igual criterio que generarVentasYItemsStress: venta + su ítem en pareja. */
function generarVentasPerfilStress(clientes: Cliente[], productos: Producto[]): { ventas: Venta[]; items: VentaItem[] } {
  const metodos = ["efectivo", "tarjeta", "yape", "transferencia"];
  const empleados = [MOCK_EMPLEADO.id, MOCK_EMPLEADO_ENCARGADO.id, MOCK_EMPLEADO_TRABAJADOR.id];
  const ventas: Venta[] = [];
  const items: VentaItem[] = [];
  for (let ci = 0; ci < clientes.length; ci++) {
    const cliente = clientes[ci];
    for (let n = 0; n < 15; n++) {
      const diaOffset = -360 + ((ci * 15 + n) * 17) % 420;
      // Una venta no cae en el futuro (a diferencia de citas/exámenes) — se
      // recorta a hoy como máximo.
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + Math.min(diaOffset, 0));
      fecha.setHours(10 + (n % 8), (n * 7) % 60, 0, 0);
      const producto = productos[(ci * 15 + n) % productos.length];
      const cantidadItem = 1 + (n % 3);
      const totalItem = Number((producto.precioVenta * cantidadItem).toFixed(2));
      const subtotal = Number((totalItem / 1.18).toFixed(2));
      const igv = Number((totalItem - subtotal).toFixed(2));
      const ventaId = `ven-perfil-${ci + 1}-${n + 1}`;
      const anulada = n === 14 && ci % 6 === 0; // un puñado anuladas, con volumen real
      ventas.push({
        id: ventaId, negocioId: MOCK_NEGOCIO.id, clienteId: cliente.id,
        empleadoId: empleados[(ci + n) % empleados.length], fecha: fecha.toISOString(),
        subtotal, igv, total: totalItem,
        metodoPago: metodos[(ci + n) % metodos.length],
        estado: anulada ? "anulada" : "pagada",
        montoPagado: anulada ? 0 : totalItem,
      });
      items.push({
        id: `vi-perfil-${ci + 1}-${n + 1}`, ventaId, productoId: producto.id,
        descripcion: producto.nombre, cantidad: cantidadItem, precioUnitario: producto.precioVenta, subtotal: totalItem,
      });
    }
  }
  return { ventas, items };
}

export const MOCK_CLIENTES: Cliente[] = [
  { id: "cli-1", negocioId: MOCK_NEGOCIO.id, nombres: "Carlos", apellidos: "Ramírez", documentoTipo: "DNI", documentoNumero: "45678912", telefono: "987654321", email: "carlos.ramirez@correo.pe", fechaNacimiento: "1985-03-14", direccion: "Av. Los Álamos 123, Miraflores", notas: "Cliente frecuente" },
  { id: "cli-2", negocioId: MOCK_NEGOCIO.id, nombres: "María", apellidos: "López", documentoTipo: "DNI", documentoNumero: "41234567", telefono: "912345678", email: "maria.lopez@correo.pe", fechaNacimiento: "1990-07-22", direccion: "Jr. Las Flores 456, San Isidro", notas: "Prefiere contacto por WhatsApp" },
  ...generarClientesStress(50),
];

const CITAS_PERFIL_STRESS = generarCitasPerfilStress(MOCK_CLIENTES);

export const MOCK_CITAS: Cita[] = [
  { id: "cit-1", negocioId: MOCK_NEGOCIO.id, clienteId: "cli-1", fechaHora: new Date().toISOString(), motivo: "Control anual", estado: "programada" },
  ...generarCitasStress(50, MOCK_CLIENTES),
  ...CITAS_PERFIL_STRESS,
];

/* 9 recetas de Carlos Ramírez (cli-1), en orden cronológico — pedido
   explícito del usuario para ver cómo se ve la pestaña "Recetas" de la
   ficha de cliente con historial real: miopía y astigmatismo progresando
   de a poco año a año, adición de cerca apareciendo recién a partir de los
   ~38 años (presbicia), y notas solo en los controles donde hubo un cambio
   real que vale la pena registrar (no en todos, para que se vea realista). */
export const MOCK_RECETAS: Receta[] = [
  { id: "rec-1", negocioId: MOCK_NEGOCIO.id, clienteId: "cli-1", fecha: "2017-03-10", tipo: "lejos",
    odEsfera: -1.25, odCilindro: -0.25, odEje: 10, oiEsfera: -1.00, oiCilindro: -0.25, oiEje: 175, dip: 62,
    notas: "Primera consulta — miopía leve en ambos ojos." },
  { id: "rec-2", negocioId: MOCK_NEGOCIO.id, clienteId: "cli-1", fecha: "2018-04-05", tipo: "lejos",
    odEsfera: -1.50, odCilindro: -0.25, odEje: 12, oiEsfera: -1.25, oiCilindro: -0.25, oiEje: 170, dip: 62 },
  { id: "rec-3", negocioId: MOCK_NEGOCIO.id, clienteId: "cli-1", fecha: "2019-05-20", tipo: "lejos",
    odEsfera: -1.75, odCilindro: -0.50, odEje: 15, oiEsfera: -1.50, oiCilindro: -0.50, oiEje: 165, dip: 62,
    notas: "Aumento leve de miopía; se detecta astigmatismo en ambos ojos." },
  { id: "rec-4", negocioId: MOCK_NEGOCIO.id, clienteId: "cli-1", fecha: "2020-09-14", tipo: "lejos",
    odEsfera: -2.00, odCilindro: -0.50, odEje: 15, oiEsfera: -1.75, oiCilindro: -0.50, oiEje: 165, dip: 63 },
  { id: "rec-5", negocioId: MOCK_NEGOCIO.id, clienteId: "cli-1", fecha: "2021-10-02", tipo: "lejos",
    odEsfera: -2.25, odCilindro: -0.75, odEje: 18, oiEsfera: -2.00, oiCilindro: -0.50, oiEje: 160, dip: 63 },
  { id: "rec-6", negocioId: MOCK_NEGOCIO.id, clienteId: "cli-1", fecha: "2022-11-18", tipo: "lejos",
    odEsfera: -2.50, odCilindro: -0.75, odEje: 20, oiEsfera: -2.25, oiCilindro: -0.75, oiEje: 160, dip: 63,
    notas: "Cambio de armazón — misma fórmula que el control anterior." },
  { id: "rec-7", negocioId: MOCK_NEGOCIO.id, clienteId: "cli-1", fecha: "2023-08-07", tipo: "cerca",
    odEsfera: -2.50, odCilindro: -0.75, odEje: 20, odAdicion: 0.75, oiEsfera: -2.25, oiCilindro: -0.75, oiEje: 160, oiAdicion: 0.75, dip: 63,
    notas: "Primeros signos de presbicia — se agrega adición para cerca." },
  { id: "rec-8", negocioId: MOCK_NEGOCIO.id, clienteId: "cli-1", fecha: "2024-09-11", tipo: "lejos",
    odEsfera: -2.75, odCilindro: -0.75, odEje: 20, odAdicion: 1.00, oiEsfera: -2.50, oiCilindro: -0.75, oiEje: 160, oiAdicion: 1.00, dip: 64 },
  { id: "rec-9", negocioId: MOCK_NEGOCIO.id, clienteId: "cli-1", fecha: "2025-10-03", tipo: "bifocal",
    odEsfera: -3.00, odCilindro: -1.00, odEje: 22, odAdicion: 1.25, oiEsfera: -2.75, oiCilindro: -1.00, oiEje: 158, oiAdicion: 1.25, dip: 64,
    notas: "Fórmula bifocal — control sugerido en 12 meses." },
];

const EXAMENES_PERFIL_STRESS = generarExamenesPerfilStress(MOCK_CLIENTES, CITAS_PERFIL_STRESS);

export const MOCK_EXAMENES_OPTOMETRICOS: ExamenOptometrico[] = [
  {
    id: "exam-1", negocioId: MOCK_NEGOCIO.id, clienteId: "cli-1", citaId: "cit-1",
    fecha: new Date().toISOString().slice(0, 10),
    odAvSc: "20/40", odAvCc: "20/20", oiAvSc: "20/50", oiAvCc: "20/20",
    odK1: 43.25, odK2: 44.0, odEjeK: 90,
    oiK1: 43.5, oiK2: 44.25, oiEjeK: 85,
    anamnesis: "Refiere visión borrosa de lejos hace 3 meses, sin antecedentes familiares relevantes.",
  },
  ...EXAMENES_PERFIL_STRESS,
];

export const MOCK_PROVEEDORES: Proveedor[] = [
  { id: "prov-1", negocioId: MOCK_NEGOCIO.id, nombre: "Óptica Distribuidora SAC", ruc: "20345678901", contacto: "Jorge Salinas", telefono: "01 234 5678", email: "ventas@opticadist.pe", activo: true },
  { id: "prov-2", negocioId: MOCK_NEGOCIO.id, nombre: "Lentes del Sur EIRL", ruc: "20456789012", contacto: "Rocío Vargas", telefono: "01 987 6543", activo: true },
  ...generarProveedoresStress(50),
];

export const MOCK_PRODUCTOS: Producto[] = [
  { id: "prod-1", negocioId: MOCK_NEGOCIO.id, proveedorId: "prov-1", nombre: "Armazón Ray-Ban RB2140", categoria: "montura", marca: "Ray-Ban", precioVenta: 350, precioCosto: 180, garantiaMeses: 12, activo: true, stockActual: 5, stockMinimo: 2 },
  { id: "prod-2", negocioId: MOCK_NEGOCIO.id, nombre: "Luna antireflejo 1.56", categoria: "luna", precioVenta: 120, precioCosto: 60, activo: true, stockActual: 1, stockMinimo: 3 },
  { id: "prod-3", negocioId: MOCK_NEGOCIO.id, nombre: "Acuvue Oasys mensual", categoria: "lente_contacto", marca: "Johnson & Johnson", precioVenta: 90, precioCosto: 55, curvaBase: 8.4, diametro: 14, potencia: -2.5, duracionReposicionDias: 30, activo: true, stockActual: 12, stockMinimo: 4 },
  ...generarProductosStress(50, MOCK_PROVEEDORES),
];

export const MOCK_MOVIMIENTOS_STOCK: MovimientoStock[] = [
  ...generarMovimientosStockStress(50, MOCK_PRODUCTOS),
];

const VENTAS_STRESS = generarVentasYItemsStress(50, MOCK_CLIENTES, MOCK_PRODUCTOS);
const VENTAS_PERFIL_STRESS = generarVentasPerfilStress(MOCK_CLIENTES, MOCK_PRODUCTOS);

export const MOCK_VENTAS: Venta[] = [
  { id: "ven-1", negocioId: MOCK_NEGOCIO.id, clienteId: "cli-2", empleadoId: MOCK_EMPLEADO.id, fecha: new Date().toISOString(), subtotal: 296.61, igv: 53.39, total: 350, metodoPago: "tarjeta", estado: "pagada", montoPagado: 350 },
  // Hace 25 días -> con duracionReposicionDias=30 del Acuvue, la reposición
  // cae en ~5 días — a propósito, para que el banner de seguimiento de
  // Inicio (ventana de 30 días) tenga algo real que mostrar en modo mock.
  { id: "ven-2", negocioId: MOCK_NEGOCIO.id, clienteId: "cli-1", empleadoId: MOCK_EMPLEADO.id, fecha: new Date(Date.now() - 25 * 86400000).toISOString(), subtotal: 76.27, igv: 13.73, total: 90, metodoPago: "efectivo", estado: "pagada", montoPagado: 90 },
  // Armazón + luna en la MISMA venta, un par de veces — a propósito, para
  // que la venta cruzada (lib/venta-cruzada.ts) tenga un patrón real que
  // sugerir en modo mock: al agregar el armazón a una venta nueva, debería
  // sugerir la luna.
  { id: "ven-3", negocioId: MOCK_NEGOCIO.id, clienteId: "cli-1", empleadoId: MOCK_EMPLEADO.id, fecha: new Date(Date.now() - 40 * 86400000).toISOString(), subtotal: 398.31, igv: 71.69, total: 470, metodoPago: "efectivo", estado: "pagada", montoPagado: 470 },
  { id: "ven-4", negocioId: MOCK_NEGOCIO.id, clienteId: "cli-2", empleadoId: MOCK_EMPLEADO.id, fecha: new Date(Date.now() - 60 * 86400000).toISOString(), subtotal: 398.31, igv: 71.69, total: 470, metodoPago: "tarjeta", estado: "pagada", montoPagado: 470 },
  ...VENTAS_STRESS.ventas,
  ...VENTAS_PERFIL_STRESS.ventas,
];

export const MOCK_VENTA_ITEMS: VentaItem[] = [
  { id: "vi-1", ventaId: "ven-1", productoId: "prod-1", descripcion: "Armazón Ray-Ban RB2140", cantidad: 1, precioUnitario: 350, subtotal: 350 },
  { id: "vi-2", ventaId: "ven-2", productoId: "prod-3", descripcion: "Acuvue Oasys mensual", cantidad: 1, precioUnitario: 90, subtotal: 90 },
  { id: "vi-3", ventaId: "ven-3", productoId: "prod-1", descripcion: "Armazón Ray-Ban RB2140", cantidad: 1, precioUnitario: 350, subtotal: 350 },
  { id: "vi-4", ventaId: "ven-3", productoId: "prod-2", descripcion: "Luna antireflejo 1.56", cantidad: 1, precioUnitario: 120, subtotal: 120 },
  { id: "vi-5", ventaId: "ven-4", productoId: "prod-1", descripcion: "Armazón Ray-Ban RB2140", cantidad: 1, precioUnitario: 350, subtotal: 350 },
  { id: "vi-6", ventaId: "ven-4", productoId: "prod-2", descripcion: "Luna antireflejo 1.56", cantidad: 1, precioUnitario: 120, subtotal: 120 },
  ...VENTAS_STRESS.items,
  ...VENTAS_PERFIL_STRESS.items,
];

export const MOCK_ORDENES_LABORATORIO: OrdenLaboratorio[] = [
  {
    id: "lab-1", negocioId: MOCK_NEGOCIO.id, ventaId: "ven-1", clienteId: "cli-2",
    empleadoId: MOCK_EMPLEADO.id, laboratorioNombre: "Laboratorio Central Lima",
    estado: "en_proceso", fechaGenerado: new Date().toISOString(),
  },
  ...generarOrdenesLaboratorioStress(50, MOCK_CLIENTES),
];

export const MOCK_CAJAS: Caja[] = [
  {
    id: "caja-1", negocioId: MOCK_NEGOCIO.id, empleadoAperturaId: MOCK_EMPLEADO.id,
    fechaApertura: new Date().toISOString(), montoInicial: 100,
    desgloseApertura: [{ metodo: "Efectivo", monto: 100 }],
    totalEfectivo: 0, totalTarjeta: 0, totalYape: 0, totalPlin: 0, totalTransferencia: 0,
    montoEfectivoEsperado: 100, estado: "abierta",
  },
  // Las 50 de abajo son historial YA CERRADO — nunca "abierta": la regla de
  // negocio es una sola caja abierta a la vez, y caja-1 (arriba) ya cumple
  // ese rol en modo mock.
  ...generarCajasStress(50),
];

/* Asistencia — ~10 días recientes por cada uno de los ~53 empleados
   (incluye los 3 "a mano" MOCK_EMPLEADO*). Desfase determinista sobre el
   horario esperado de cada empleado: algunos llegan puntuales, otros tarde
   (para ver el estado "tarde" con datos reales), un puñado "falta"/"permiso"
   sin horas marcadas, y un cuarto sin verificar todavía. */
function generarAsistenciasStress(empleados: Empleado[]): Asistencia[] {
  const asistencias: Asistencia[] = [];
  let contador = 0;
  for (let e = 0; e < empleados.length; e++) {
    const empleado = empleados[e];
    for (let d = 0; d < 10; d++) {
      const fechaObj = new Date();
      fechaObj.setDate(fechaObj.getDate() - d);
      const fecha = fechaObj.toISOString().slice(0, 10);

      const esFalta = (e + d) % 13 === 0;
      const esPermiso = !esFalta && (e + d) % 17 === 0;
      let horaEntrada: string | undefined;
      let horaSalida: string | undefined;
      let estado: EstadoAsistencia = "presente";

      if (esFalta) {
        estado = "falta";
      } else if (esPermiso) {
        estado = "permiso";
      } else {
        const [hb, mb] = (empleado.horaEntradaEsperada ?? "09:00").split(":").map(Number);
        const desfaseMin = [0, 0, 5, -3, 20, 0, 12, 0][(e + d) % 8];
        const totalMin = ((hb * 60 + mb + desfaseMin) % (24 * 60) + 24 * 60) % (24 * 60);
        horaEntrada = `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
        horaSalida = empleado.horaSalidaEsperada ?? "18:00";
        estado = desfaseMin > empleado.toleranciaTardanzaMin ? "tarde" : "presente";
      }

      // Verificación por EVENTO (no un solo booleano de día, mismo criterio
      // que tramys-rrhh) — ~1/3 con ambos eventos ya revisados, el resto
      // pendiente (algunas con solo la entrada revisada, para ver ese caso
      // intermedio real en la tabla de equipo).
      const verificada = contador % 3 === 0;
      const soloEntradaVerificada = !verificada && contador % 5 === 0;

      asistencias.push({
        id: `asis-stress-${contador + 1}`,
        negocioId: MOCK_NEGOCIO.id,
        empleadoId: empleado.id,
        fecha, horaEntrada, horaSalida, estado,
        marcadoPor: "empleado",
        fotoEntrada: !esFalta && contador % 6 === 0,
        fotoSalida: !esFalta && contador % 9 === 0,
        ...(verificada || soloEntradaVerificada
          ? { verificadoEntradaPor: MOCK_EMPLEADO.id, verificadoEntradaAt: new Date(fechaObj.getTime() + 3600000).toISOString() }
          : {}),
        ...(verificada
          ? { verificadoSalidaPor: MOCK_EMPLEADO.id, verificadoSalidaAt: new Date(fechaObj.getTime() + 7200000).toISOString() }
          : {}),
      });
      contador++;
    }
  }
  return asistencias;
}

/* Pagos de sueldo — 2-3 por empleado, con período/monto acordes a su
   tipoPago/montoPagoBase (igual que precargaría el formulario real), y su
   Gasto espejo correspondiente (categoría 'sueldos') — mismo efecto que los
   triggers fn_pago_sueldo_sync_gasto() reales, replicado a mano acá porque
   en mock no hay triggers de DB (ver también addPagoSueldo en
   DataProvider.tsx, que hace lo mismo para un pago nuevo creado en runtime). */
function generarPagosSueldoStress(empleados: Empleado[]): { pagos: PagoSueldo[]; gastosEspejo: Gasto[] } {
  const DIAS_POR_TIPO: Record<NonNullable<Empleado["tipoPago"]>, number> = {
    diario: 1, semanal: 7, quincenal: 15, mensual: 30,
  };
  const metodos = ["efectivo", "tarjeta", "yape", "plin", "transferencia"];
  const pagos: PagoSueldo[] = [];
  const gastosEspejo: Gasto[] = [];
  let contador = 0;
  for (let e = 0; e < empleados.length; e++) {
    const empleado = empleados[e];
    const tipoPeriodo = empleado.tipoPago ?? "mensual";
    const montoBase = empleado.montoPagoBase ?? 1000;
    const diasPeriodo = DIAS_POR_TIPO[tipoPeriodo];
    const cantidadPagos = 2 + (e % 2); // 2 o 3 pagos por empleado
    for (let p = 0; p < cantidadPagos; p++) {
      const finPeriodo = new Date();
      finPeriodo.setDate(finPeriodo.getDate() - p * diasPeriodo);
      const inicioPeriodo = new Date(finPeriodo);
      inicioPeriodo.setDate(inicioPeriodo.getDate() - (diasPeriodo - 1));
      const periodoDesde = inicioPeriodo.toISOString().slice(0, 10);
      const periodoHasta = finPeriodo.toISOString().slice(0, 10);
      const fechaPago = periodoHasta;
      const monto = Math.round((montoBase + (p % 3) * 10) * 100) / 100;
      const gastoId = `gas-sueldo-stress-${contador + 1}`;
      const descripcion = `Pago de sueldo (${tipoPeriodo}) del ${fechaCortaMock(periodoDesde)} al ${fechaCortaMock(periodoHasta)} — ${empleado.nombres} ${empleado.apellidos}`;
      gastosEspejo.push({ id: gastoId, negocioId: MOCK_NEGOCIO.id, categoria: "sueldos", descripcion, monto, fecha: fechaPago });
      pagos.push({
        id: `pago-sueldo-stress-${contador + 1}`,
        negocioId: MOCK_NEGOCIO.id, empleadoId: empleado.id,
        tipoPeriodo, periodoDesde, periodoHasta, fechaPago, monto,
        metodoPago: metodos[(e + p) % metodos.length],
        gastoId,
      });
      contador++;
    }
  }
  return { pagos, gastosEspejo };
}

export const MOCK_ASISTENCIAS: Asistencia[] = generarAsistenciasStress(MOCK_EMPLEADOS);

/* Fotos de evidencia de ejemplo — mismo criterio que tramys-rrhh: no hace
   falta una fila por cada marca con fotoEntrada/fotoSalida en true, solo
   alcanza con un puñado para poder probar la vista "ver foto" bajo demanda.
   Placeholder de 1x1 (no una foto real) — el contenido no importa, solo que
   sea un data URI válido que un <img> pueda renderizar. */
const FOTO_PLACEHOLDER = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";
export const MOCK_ASISTENCIA_FOTOS: AsistenciaFoto[] = MOCK_ASISTENCIAS
  .filter((a) => a.fotoEntrada || a.fotoSalida)
  .slice(0, 8)
  .flatMap((a) => [
    ...(a.fotoEntrada ? [{ id: `asisfoto-${a.id}-entrada`, asistenciaId: a.id, tipo: "entrada" as const, fotoBase64: FOTO_PLACEHOLDER }] : []),
    ...(a.fotoSalida ? [{ id: `asisfoto-${a.id}-salida`, asistenciaId: a.id, tipo: "salida" as const, fotoBase64: FOTO_PLACEHOLDER }] : []),
  ]);

const PAGOS_SUELDO_STRESS = generarPagosSueldoStress(MOCK_EMPLEADOS);
export const MOCK_PAGOS_SUELDO: PagoSueldo[] = PAGOS_SUELDO_STRESS.pagos;

export const MOCK_GASTOS: Gasto[] = [
  { id: "gas-1", negocioId: MOCK_NEGOCIO.id, categoria: "alquiler", descripcion: "Alquiler del local", monto: 1200, fecha: new Date().toISOString().slice(0, 10) },
  { id: "gas-2", negocioId: MOCK_NEGOCIO.id, proveedorId: "prov-1", categoria: "insumos", descripcion: "Compra de armazones", monto: 850, fecha: new Date().toISOString().slice(0, 10) },
  ...generarGastosStress(50, MOCK_PROVEEDORES),
  ...PAGOS_SUELDO_STRESS.gastosEspejo,
];

export const MOCK_DESCUENTOS: Descuento[] = [
  { id: "desc-1", negocioId: MOCK_NEGOCIO.id, codigo: "VERANO10", tipo: "porcentaje", valor: 10, aplicaA: "ambos", limiteUsos: 50, usos: 12, activo: true },
  ...generarDescuentosStress(50),
];

const COTIZACIONES_STRESS = generarCotizacionesYItemsStress(50, MOCK_CLIENTES, MOCK_PRODUCTOS);

export const MOCK_COTIZACIONES: Cotizacion[] = [
  {
    id: "cot-1", negocioId: MOCK_NEGOCIO.id, clienteId: "cli-1",
    fecha: new Date().toISOString().slice(0, 10),
    vigenciaHasta: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    subtotal: 296.61, igv: 53.39, total: 350, estado: "pendiente",
  },
  ...COTIZACIONES_STRESS.cotizaciones,
];

export const MOCK_COTIZACION_ITEMS: CotizacionItem[] = [
  { id: "coti-1", cotizacionId: "cot-1", productoId: "prod-1", descripcion: "Armazón Ray-Ban RB2140", cantidad: 1, precioUnitario: 350, subtotal: 350 },
  ...COTIZACIONES_STRESS.items,
];

/* ================= Vista cross-tenant del admin-panel =================
   No reutiliza MOCK_NEGOCIO/MOCK_SUSCRIPCION de arriba (esas son el ÚNICO
   negocio "logueado" en el dashboard mock) — acá se simulan VARIOS negocios
   ajenos, tal como los vería el dueño del SaaS en admin.dominio, con sus
   filas crudas (mismo shape que las queries reales en admin-panel/(protegido)/*). */
const NOMBRES_OPTICA_STRESS = [
  "Óptica Visión Total", "Óptica Nueva Era", "Óptica El Ojo", "Óptica Claridad", "Óptica Mirada",
  "Óptica Prisma", "Óptica Enfoque", "Óptica Horizonte", "Óptica Luz", "Óptica Cristal",
];
const DISTRITOS_STRESS = [
  "San Miguel", "Surco", "Miraflores", "La Molina", "Comas", "Ate", "San Juan de Lurigancho",
  "Villa El Salvador", "Chorrillos", "Independencia", "Los Olivos", "Callao", "San Borja", "Breña", "Rímac",
];

function generarNegociosAdminStress(cantidad: number) {
  return Array.from({ length: cantidad }, (_, i) => {
    const distrito = DISTRITOS_STRESS[i % DISTRITOS_STRESS.length];
    return {
      id: `adm-neg-stress-${i + 1}`,
      nombre: `${NOMBRES_OPTICA_STRESS[i % NOMBRES_OPTICA_STRESS.length]} ${distrito}`,
      subdominio: `optica-stress-${i + 1}`,
      ruc: String(20400000000 + i * 977),
      telefono: `9${String(70000000 + i * 811).padStart(8, "0")}`,
      direccion: `Av. Principal ${100 + i}, ${distrito}`,
      activo: i % 9 !== 0,
      created_at: new Date(Date.now() - (5 + i * 3) * 86400000).toISOString(),
    };
  });
}

export const MOCK_ADMIN_NEGOCIOS = [
  { id: "adm-neg-1", nombre: "Óptica Demo", subdominio: "optica-demo", ruc: "10123456789", telefono: "999 999 999", direccion: "Av. Siempre Viva 123, Lima", activo: true, created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: "adm-neg-2", nombre: "Óptica Visión Plus", subdominio: "vision-plus", ruc: "20512345678", telefono: "988 111 222", direccion: "Jr. Las Begonias 456, San Isidro", activo: true, created_at: new Date(Date.now() - 120 * 86400000).toISOString() },
  { id: "adm-neg-3", nombre: "Óptica Los Olivos", subdominio: "los-olivos", ruc: "20598765432", telefono: "977 333 444", direccion: "Av. Carlos Izaguirre 890, Los Olivos", activo: true, created_at: new Date(Date.now() - 95 * 86400000).toISOString() },
  { id: "adm-neg-4", nombre: "Óptica Puente Piedra", subdominio: "puente-piedra", ruc: "20487654321", telefono: "966 555 666", direccion: "Av. Zarumilla 321, Puente Piedra", activo: false, created_at: new Date(Date.now() - 90 * 86400000).toISOString() },
  { id: "adm-neg-5", nombre: "Óptica San Juan", subdominio: "optica-sjl", ruc: null, telefono: "955 777 888", direccion: null, activo: true, created_at: new Date(Date.now() - 27 * 86400000).toISOString() },
  { id: "adm-neg-6", nombre: "Óptica del Norte", subdominio: "optica-del-norte", ruc: null, telefono: "944 222 333", direccion: null, activo: true, created_at: new Date(Date.now() - 10 * 86400000).toISOString() },
  ...generarNegociosAdminStress(50),
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
     que no existía antes de este cambio.
   - los 50 `adm-neg-stress-*` reparten los mismos 4 casos (gratis / trial
     por vencer o recién iniciado / activa pagando / vencida) para que los
     widgets del admin panel tengan volumen real, no solo 1 ejemplo de cada. */
function generarSuscripcionesAdminStress(negociosStress: { id: string }[]) {
  const planes = ["gratis", "basico", "premium"];
  return negociosStress.map((n, i) => {
    const plan = planes[i % planes.length];
    if (plan === "gratis") return { negocio_id: n.id, plan, estado: "activa", trial_fin: "" };
    if (i % 5 === 0) {
      const diasRestantes = i % 2 === 0 ? 3 : 20;
      return { negocio_id: n.id, plan, estado: "trial", trial_fin: new Date(Date.now() + diasRestantes * 86400000).toISOString().slice(0, 10) };
    }
    const vencida = i % 7 === 0;
    return { negocio_id: n.id, plan, estado: vencida ? "vencida" : "activa", trial_fin: "" };
  });
}

const NEGOCIOS_ADMIN_STRESS = MOCK_ADMIN_NEGOCIOS.filter((n) => n.id.startsWith("adm-neg-stress-"));
const SUSCRIPCIONES_ADMIN_STRESS = generarSuscripcionesAdminStress(NEGOCIOS_ADMIN_STRESS);

export const MOCK_ADMIN_SUSCRIPCIONES = [
  { negocio_id: "adm-neg-1", plan: "premium", estado: "trial", trial_fin: new Date(Date.now() + 25 * 86400000).toISOString().slice(0, 10) },
  { negocio_id: "adm-neg-2", plan: "premium", estado: "activa", trial_fin: "" },
  { negocio_id: "adm-neg-3", plan: "basico", estado: "activa", trial_fin: "" },
  { negocio_id: "adm-neg-4", plan: "basico", estado: "vencida", trial_fin: "" },
  { negocio_id: "adm-neg-5", plan: "basico", estado: "trial", trial_fin: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) },
  { negocio_id: "adm-neg-6", plan: "gratis", estado: "activa", trial_fin: "" },
  ...SUSCRIPCIONES_ADMIN_STRESS,
];

function generarEmpleadosAdminStress(negociosStress: { id: string }[]) {
  return negociosStress.map((n, i) => ({
    id: `adm-emp-stress-${i + 1}`,
    negocio_id: n.id,
    nombres: NOMBRES_STRESS[i % NOMBRES_STRESS.length],
    apellidos: APELLIDOS_STRESS[i % APELLIDOS_STRESS.length],
    rol: "administrador",
    email: `admin${i + 1}@optica-stress-${i + 1}.pe`,
    activo: true,
  }));
}

export const MOCK_ADMIN_EMPLEADOS = [
  { id: "adm-emp-1", negocio_id: "adm-neg-1", nombres: "Ana", apellidos: "Demo", rol: "administrador", email: "demo@optica.pe", activo: true },
  { id: "adm-emp-2", negocio_id: "adm-neg-2", nombres: "Rosa", apellidos: "Fernández", rol: "administrador", email: "rosa@visionplus.pe", activo: true },
  { id: "adm-emp-3", negocio_id: "adm-neg-2", nombres: "Luis", apellidos: "Chávez", rol: "trabajador", email: "luis@visionplus.pe", activo: true },
  { id: "adm-emp-4", negocio_id: "adm-neg-3", nombres: "Miguel", apellidos: "Torres", rol: "administrador", email: "miguel@losolivos.pe", activo: true },
  { id: "adm-emp-5", negocio_id: "adm-neg-3", nombres: "Karina", apellidos: "Solís", rol: "encargado", email: "karina@losolivos.pe", activo: true },
  { id: "adm-emp-6", negocio_id: "adm-neg-4", nombres: "Jorge", apellidos: "Ramos", rol: "administrador", email: "jorge@puentepiedra.pe", activo: true },
  { id: "adm-emp-7", negocio_id: "adm-neg-5", nombres: "Vanessa", apellidos: "Quispe", rol: "administrador", email: "vanessa@opticasjl.pe", activo: true },
  { id: "adm-emp-8", negocio_id: "adm-neg-6", nombres: "Renzo", apellidos: "Vega", rol: "administrador", email: "renzo@opticadelnorte.pe", activo: true },
  ...generarEmpleadosAdminStress(NEGOCIOS_ADMIN_STRESS),
];

/* pagos_saas simulados — varios meses de historia para el gráfico de MRR de
   /admin-panel/pagos. Montos calzan con los precios reales de la landing
   (ver PreciosSection.tsx): Básico S/89.90/mes, Premium S/149.90/mes. */
function haceMeses(n: number, dia: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n, dia);
  return d.toISOString().slice(0, 10);
}

function generarPagosAdminStress(cantidad: number, suscripciones: { negocio_id: string; plan: string; estado: string }[]) {
  const pagantes = suscripciones.filter((s) => s.plan !== "gratis" && s.estado !== "trial");
  if (pagantes.length === 0) return [];
  const metodos = ["tarjeta", "yape"];
  return Array.from({ length: cantidad }, (_, i) => {
    const sus = pagantes[i % pagantes.length];
    return {
      id: `pago-stress-${i + 1}`,
      negocio_id: sus.negocio_id,
      monto: sus.plan === "premium" ? 149.9 : 89.9,
      moneda: "PEN",
      metodo_pago: metodos[i % metodos.length],
      culqi_cargo_id: `chr_stress_${i + 1}`,
      estado: "exitoso",
      created_at: haceMeses(i % 6, 5 + (i % 20)),
    };
  });
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
  ...generarPagosAdminStress(50, SUSCRIPCIONES_ADMIN_STRESS),
];

/* libro_reclamaciones simulado — 2 casos "de mano" (uno pendiente, uno
   atendido) + 50 de volumen para probar paginación/filtros reales. */
function generarReclamosAdminStress(cantidad: number) {
  const tipos = ["reclamo", "queja"] as const;
  return Array.from({ length: cantidad }, (_, i) => {
    const esMenor = i % 23 === 0;
    return {
      id: `rec-stress-${i + 1}`,
      numero: `RC-${String(1000 + i + 1).padStart(6, "0")}`,
      tipo: tipos[i % tipos.length],
      consumidor_nombres: NOMBRES_STRESS[i % NOMBRES_STRESS.length],
      consumidor_apellidos: APELLIDOS_STRESS[i % APELLIDOS_STRESS.length],
      consumidor_documento_tipo: "DNI",
      consumidor_documento_numero: String(41000000 + i * 191),
      consumidor_domicilio: `Jr. Los Álamos ${100 + i}, Lima`,
      consumidor_telefono: i % 4 === 0 ? null : `519${String(10000000 + i * 321).padStart(8, "0")}`,
      consumidor_email: `reclamante${i + 1}@example.com`,
      es_menor_edad: esMenor,
      apoderado_nombre: esMenor ? `${NOMBRES_STRESS[(i + 5) % NOMBRES_STRESS.length]} ${APELLIDOS_STRESS[(i + 5) % APELLIDOS_STRESS.length]}` : null,
      bien_tipo: i % 2 === 0 ? "servicio" : "producto",
      bien_descripcion: i % 2 === 0 ? "Plan de suscripción" : "Compra de armazón",
      monto_reclamado: i % 3 === 0 ? Number((50 + i * 3.5).toFixed(2)) : null,
      detalle: `Detalle del caso de prueba número ${i + 1}.`,
      pedido: "Solución al inconveniente reportado.",
      estado: i % 3 === 0 ? "pendiente" : "atendido",
      respuesta: i % 3 === 0 ? null : "Caso atendido y resuelto por el equipo de soporte.",
      created_at: haceMeses(i % 6, 1 + (i % 27)),
    };
  });
}

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
  ...generarReclamosAdminStress(50),
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
function generarNotasSoporteStress(cantidad: number, negociosIds: string[]) {
  const autores = ["Soporte", "Fer"];
  const textos = [
    "Llamó preguntando por una función.", "Se resolvió una duda de facturación.",
    "Consultó por el estado de su trial.", "Reportó un bug menor, ya derivado.",
    "Pidió factura por el último pago.", "Consultó cómo agregar una sucursal.",
  ];
  return Array.from({ length: cantidad }, (_, i) => ({
    id: `nota-stress-${i + 1}`,
    negocio_id: negociosIds[i % negociosIds.length],
    autor: autores[i % autores.length],
    texto: textos[i % textos.length],
    created_at: haceMeses(i % 5, 1 + (i % 27)),
  }));
}

const TODOS_NEGOCIOS_ADMIN_IDS = MOCK_ADMIN_NEGOCIOS.map((n) => n.id);

export const MOCK_ADMIN_NOTAS_SOPORTE = [
  { id: "nota-1", negocio_id: "adm-neg-4", autor: "Soporte", texto: "Llamó por WhatsApp preguntando por qué se bloqueó el acceso. Se le explicó que la suscripción venció sin renovar.", created_at: haceMeses(1, 15) },
  { id: "nota-2", negocio_id: "adm-neg-5", autor: "Soporte", texto: "Se le avisó por correo que el trial vence en 3 días.", created_at: haceMeses(0, 20) },
  ...generarNotasSoporteStress(50, TODOS_NEGOCIOS_ADMIN_IDS),
];

/* Buzón de mejoras — MOCK_MEJORAS (lado negocio, anonimizado) y
   MOCK_ADMIN_MEJORAS (lado admin, cross-tenant con negocio_id) son DOS
   VISTAS DE LAS MISMAS FILAS (mismo id) — no dos catálogos independientes,
   por eso se generan en pareja acá, igual que ventas/cotizaciones. */
const TITULOS_MEJORA_STRESS = [
  "Exportar clientes a Excel", "Recordatorio de cumpleaños de clientes", "Firma digital en boleta",
  "Modo oscuro automático por horario", "Reporte de comisiones por vendedor", "Integración con WhatsApp Business API",
  "Historial de precios de productos", "Alertas de stock por WhatsApp", "Soporte multi-idioma (inglés)",
  "Backup manual descargable", "Escaneo de DNI con cámara", "Firma de cliente en tablet",
  "Reporte de clientes inactivos", "Programar citas recurrentes", "Notificaciones push en el navegador",
];
const DESCRIPCIONES_MEJORA_STRESS = [
  "Sería útil para respaldos y análisis externos.",
  "Ayudaría a fidelizar mejor a los clientes.",
  "Reduciría el papeleo en la atención.",
  "Comodidad para el equipo que trabaja de noche.",
  "Facilitaría el pago de comisiones a fin de mes.",
  "El WhatsApp actual es manual, esto lo automatizaría.",
];
const ESTADOS_MEJORA_STRESS = ["pendiente", "planificado", "en_progreso", "completado", "rechazado"] as const;

function generarMejorasStress(cantidad: number, negociosIds: string[]) {
  const negocioBoard: { id: string; titulo: string; descripcion: string; estado: string; createdAt: string; esMia: boolean; totalVotos: number; yoVote: boolean }[] = [];
  const adminBoard: { id: string; negocio_id: string; titulo: string; descripcion: string; estado: string; created_at: string }[] = [];
  const votos: { mejora_id: string; negocio_id: string }[] = [];
  for (let i = 0; i < cantidad; i++) {
    const id = `mej-stress-${i + 1}`;
    const estado = ESTADOS_MEJORA_STRESS[i % ESTADOS_MEJORA_STRESS.length];
    const titulo = TITULOS_MEJORA_STRESS[i % TITULOS_MEJORA_STRESS.length];
    const descripcion = DESCRIPCIONES_MEJORA_STRESS[i % DESCRIPCIONES_MEJORA_STRESS.length];
    const createdAt = haceMeses(i % 6, 1 + (i % 27));
    const totalVotos = 1 + (i % 25);
    negocioBoard.push({ id, titulo, descripcion, estado, createdAt, esMia: i % 4 === 0, totalVotos, yoVote: i % 3 === 0 });
    adminBoard.push({ id, negocio_id: negociosIds[i % negociosIds.length], titulo, descripcion, estado, created_at: createdAt });
    const numVotantes = Math.min(totalVotos, negociosIds.length, 6);
    for (let v = 0; v < numVotantes; v++) {
      votos.push({ mejora_id: id, negocio_id: negociosIds[(i + v) % negociosIds.length] });
    }
  }
  return { negocioBoard, adminBoard, votos };
}

const MEJORAS_STRESS = generarMejorasStress(50, TODOS_NEGOCIOS_ADMIN_IDS);

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
  ...MEJORAS_STRESS.negocioBoard,
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
  ...MEJORAS_STRESS.adminBoard,
];

export const MOCK_ADMIN_MEJORAS_VOTOS = [
  { mejora_id: "mej-1", negocio_id: "adm-neg-1" }, { mejora_id: "mej-1", negocio_id: "adm-neg-2" }, { mejora_id: "mej-1", negocio_id: "adm-neg-3" },
  { mejora_id: "mej-2", negocio_id: "adm-neg-3" }, { mejora_id: "mej-2", negocio_id: "adm-neg-4" },
  { mejora_id: "mej-3", negocio_id: "adm-neg-1" }, { mejora_id: "mej-3", negocio_id: "adm-neg-2" }, { mejora_id: "mej-3", negocio_id: "adm-neg-5" }, { mejora_id: "mej-3", negocio_id: "adm-neg-6" },
  { mejora_id: "mej-4", negocio_id: "adm-neg-4" },
  { mejora_id: "mej-5", negocio_id: "adm-neg-1" }, { mejora_id: "mej-5", negocio_id: "adm-neg-3" },
  ...MEJORAS_STRESS.votos,
];

/* "Ver como negocio" — vista de solo lectura (/admin-panel/negocios/[id]/vista).
   Datos crudos por negocio-tenant (namespace adm-neg-*, no confundir con
   MOCK_CLIENTES/MOCK_CITAS/etc. de arriba, que son el ÚNICO negocio logueado
   en el dashboard mock). Solo se completan adm-neg-1, adm-neg-2 y 3 negocios
   `-stress-` a propósito: el resto queda vacío para poder probar también el
   estado "sin datos" de cada sección sin tener que inventar contenido para
   los 56 negocios. */
const NEGOCIOS_CON_VISTA_STRESS = ["adm-neg-1", "adm-neg-2", "adm-neg-stress-1", "adm-neg-stress-2", "adm-neg-stress-3"];

function generarVistaClientesStress(cantidad: number, negociosIds: string[]) {
  return Array.from({ length: cantidad }, (_, i) => ({
    id: `vcli-stress-${i + 1}`,
    negocio_id: negociosIds[i % negociosIds.length],
    nombres: NOMBRES_STRESS[i % NOMBRES_STRESS.length],
    apellidos: APELLIDOS_STRESS[i % APELLIDOS_STRESS.length],
    telefono: `9${String(20000000 + i * 401).padStart(8, "0")}`,
    created_at: haceMeses(0, 1 + (i % 27)),
  }));
}

function generarVistaCitasStress(cantidad: number, negociosIds: string[]) {
  const estados = ["programada", "atendida", "cancelada"];
  return Array.from({ length: cantidad }, (_, i) => ({
    id: `vcit-stress-${i + 1}`,
    negocio_id: negociosIds[i % negociosIds.length],
    fecha_hora: new Date(Date.now() + (i - Math.floor(cantidad / 2)) * 86400000).toISOString(),
    motivo: MOTIVOS_CITA_STRESS[i % MOTIVOS_CITA_STRESS.length],
    estado: estados[i % estados.length],
    cliente_nombre: `${NOMBRES_STRESS[i % NOMBRES_STRESS.length]} ${APELLIDOS_STRESS[i % APELLIDOS_STRESS.length]}`,
  }));
}

function generarVistaVentasStress(cantidad: number, negociosIds: string[]) {
  const metodos = ["efectivo", "tarjeta", "yape"];
  return Array.from({ length: cantidad }, (_, i) => ({
    id: `vven-stress-${i + 1}`,
    negocio_id: negociosIds[i % negociosIds.length],
    fecha: haceMeses(i % 3, 1 + (i % 27)),
    total: Number((80 + (i % 30) * 15.5).toFixed(2)),
    metodo_pago: metodos[i % metodos.length],
    estado: i % 9 === 0 ? "anulada" : "pagada",
    cliente_nombre: `${NOMBRES_STRESS[(i + 2) % NOMBRES_STRESS.length]} ${APELLIDOS_STRESS[(i + 2) % APELLIDOS_STRESS.length]}`,
  }));
}

function generarVistaStockBajoStress(cantidad: number, negociosIds: string[]) {
  return Array.from({ length: cantidad }, (_, i) => ({
    producto_id: `vprod-stress-${i + 1}`,
    negocio_id: negociosIds[i % negociosIds.length],
    nombre: `Producto con stock bajo #${i + 1}`,
    stock_actual: i % 4,
    stock_minimo: 3 + (i % 3),
  }));
}

export const MOCK_ADMIN_VISTA_CLIENTES = [
  { id: "vcli-1", negocio_id: "adm-neg-1", nombres: "Pedro", apellidos: "Huamán", telefono: "944 123 456", created_at: haceMeses(0, 20) },
  { id: "vcli-2", negocio_id: "adm-neg-1", nombres: "Lucía", apellidos: "Campos", telefono: "955 234 567", created_at: haceMeses(0, 15) },
  { id: "vcli-3", negocio_id: "adm-neg-2", nombres: "Fernando", apellidos: "Ríos", telefono: "966 345 678", created_at: haceMeses(0, 22) },
  ...generarVistaClientesStress(50, NEGOCIOS_CON_VISTA_STRESS),
];

export const MOCK_ADMIN_VISTA_CITAS = [
  { id: "vcit-1", negocio_id: "adm-neg-1", fecha_hora: new Date(Date.now() + 2 * 86400000).toISOString(), motivo: "Control anual", estado: "programada", cliente_nombre: "Pedro Huamán" },
  { id: "vcit-2", negocio_id: "adm-neg-2", fecha_hora: new Date(Date.now() + 1 * 86400000).toISOString(), motivo: "Entrega de lentes", estado: "programada", cliente_nombre: "Fernando Ríos" },
  ...generarVistaCitasStress(50, NEGOCIOS_CON_VISTA_STRESS),
];

export const MOCK_ADMIN_VISTA_VENTAS = [
  { id: "vven-1", negocio_id: "adm-neg-1", fecha: haceMeses(0, 21), total: 280, metodo_pago: "efectivo", estado: "pagada", cliente_nombre: "Pedro Huamán" },
  { id: "vven-2", negocio_id: "adm-neg-2", fecha: haceMeses(0, 23), total: 410, metodo_pago: "tarjeta", estado: "pagada", cliente_nombre: "Fernando Ríos" },
  ...generarVistaVentasStress(50, NEGOCIOS_CON_VISTA_STRESS),
];

export const MOCK_ADMIN_VISTA_STOCK_BAJO = [
  { producto_id: "vprod-1", negocio_id: "adm-neg-1", nombre: "Luna antireflejo 1.56", stock_actual: 1, stock_minimo: 3 },
  { producto_id: "vprod-2", negocio_id: "adm-neg-2", nombre: "Armazón Ray-Ban RB2140", stock_actual: 0, stock_minimo: 2 },
  ...generarVistaStockBajoStress(50, NEGOCIOS_CON_VISTA_STRESS),
];
