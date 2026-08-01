/* ================= MAPPERS Supabase ↔ TS =================
   Convierte filas de Supabase (snake_case) ↔ shapes de la app (camelCase).
   UN par rowToX()/xToRow() por entidad. Regla: campo nuevo de DB ⇒ añadirlo AQUÍ
   en AMBOS sentidos (+ tipo en DataProvider + tabla/RLS en supabase-schema.sql).

   En *ToRow se escriben solo las claves presentes (Partial) → sirve igual para
   insert que para update parcial sin pisar columnas no enviadas. */

import type {
  Empleado, RolPersonalizado, Negocio, Rol, Suscripcion, Sucursal,
  Cliente, Cita, Receta, ExamenOptometrico, Producto, MovimientoStock, Venta, VentaItem, Gasto,
  Descuento, Proveedor, Cotizacion, CotizacionItem, OrdenLaboratorio, EstadoOrdenLaboratorio,
  Caja, EstadoCaja, ItemAperturaCaja,
} from "@/components/providers/DataProvider";

/* ====== Sucursales (multisedes) ====== */
export function rowToSucursal(r: Record<string, unknown>): Sucursal {
  return {
    id: String(r.id), negocioId: String(r.negocio_id),
    nombre: String(r.nombre ?? ""),
    direccion: r.direccion ? String(r.direccion) : undefined,
    telefono: r.telefono ? String(r.telefono) : undefined,
    activo: Boolean(r.activo ?? true),
  };
}
export function sucursalToRow(s: Partial<Sucursal>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (s.nombre    !== undefined) out.nombre    = s.nombre;
  if (s.direccion !== undefined) out.direccion = s.direccion;
  if (s.telefono  !== undefined) out.telefono  = s.telefono;
  if (s.activo    !== undefined) out.activo    = s.activo;
  return out;
}

/* ====== Empleados ====== */
export function rowToEmpleado(r: Record<string, unknown>): Empleado {
  return {
    id:            String(r.id),
    negocioId:     r.negocio_id ? String(r.negocio_id) : null,
    nombres:       String(r.nombres ?? ""),
    apellidos:     String(r.apellidos ?? ""),
    rol:           (r.rol as Rol) ?? "trabajador",
    email:         r.email ? String(r.email) : undefined,
    telefono:      r.telefono ? String(r.telefono) : undefined,
    avatarBase64:  r.avatar_base64 ? String(r.avatar_base64) : undefined,
    permisos:      (r.permisos as Record<string, string>) ?? {},
    rolPersonalizadoId: r.rol_personalizado_id ? String(r.rol_personalizado_id) : undefined,
    comisionPct:   Number(r.comision_pct ?? 0),
    sucursalId:    r.sucursal_id ? String(r.sucursal_id) : undefined,
    activo:        Boolean(r.activo ?? true),
  };
}
export function empleadoToRow(e: Partial<Empleado>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (e.nombres      !== undefined) out.nombres       = e.nombres;
  if (e.apellidos     !== undefined) out.apellidos      = e.apellidos;
  if (e.rol           !== undefined) out.rol            = e.rol;
  if (e.email          !== undefined) out.email           = e.email;
  if (e.telefono       !== undefined) out.telefono        = e.telefono;
  if (e.avatarBase64  !== undefined) out.avatar_base64   = e.avatarBase64;
  if (e.permisos       !== undefined) out.permisos         = e.permisos;
  if (e.rolPersonalizadoId !== undefined) out.rol_personalizado_id = e.rolPersonalizadoId || null;
  if (e.comisionPct    !== undefined) out.comision_pct     = e.comisionPct;
  if (e.sucursalId     !== undefined) out.sucursal_id      = e.sucursalId || null;
  if (e.activo         !== undefined) out.activo          = e.activo;
  return out;
}

/* ====== Roles personalizados ====== */
export function rowToRolPersonalizado(r: Record<string, unknown>): RolPersonalizado {
  return {
    id:        String(r.id),
    negocioId: String(r.negocio_id),
    nombre:    String(r.nombre ?? ""),
    permisos:  (r.permisos as Record<string, string>) ?? {},
  };
}
export function rolPersonalizadoToRow(p: Partial<RolPersonalizado>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.nombre  !== undefined) out.nombre   = p.nombre;
  if (p.permisos !== undefined) out.permisos = p.permisos;
  return out;
}

/* ====== Negocio (tenant propio) ====== */
export function rowToNegocio(r: Record<string, unknown>): Negocio {
  return {
    id:          String(r.id),
    nombre:      String(r.nombre ?? ""),
    subdominio:  String(r.subdominio ?? ""),
    ruc:         r.ruc ? String(r.ruc) : undefined,
    telefono:    r.telefono ? String(r.telefono) : undefined,
    direccion:   r.direccion ? String(r.direccion) : undefined,
    logoUrl:     r.logo_url ? String(r.logo_url) : undefined,
    colorPrimario: r.color_primario ? String(r.color_primario) : undefined,
    activo:      Boolean(r.activo ?? true),
  };
}
export function negocioToRow(n: Partial<Negocio>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (n.nombre    !== undefined) out.nombre    = n.nombre;
  if (n.ruc       !== undefined) out.ruc       = n.ruc;
  if (n.telefono  !== undefined) out.telefono  = n.telefono;
  if (n.direccion !== undefined) out.direccion = n.direccion;
  if (n.logoUrl   !== undefined) out.logo_url  = n.logoUrl;
  if (n.colorPrimario !== undefined) out.color_primario = n.colorPrimario || null;
  if (n.activo    !== undefined) out.activo    = n.activo;
  return out;
}

/* ====== Clientes / pacientes ====== */
export function rowToCliente(r: Record<string, unknown>): Cliente {
  return {
    id: String(r.id), negocioId: String(r.negocio_id),
    nombres: String(r.nombres ?? ""), apellidos: String(r.apellidos ?? ""),
    documentoTipo: String(r.documento_tipo ?? "DNI"),
    documentoNumero: r.documento_numero ? String(r.documento_numero) : undefined,
    telefono: r.telefono ? String(r.telefono) : undefined,
    email: r.email ? String(r.email) : undefined,
    fechaNacimiento: r.fecha_nacimiento ? String(r.fecha_nacimiento) : undefined,
    direccion: r.direccion ? String(r.direccion) : undefined,
    notas: r.notas ? String(r.notas) : undefined,
    eliminadoEn: r.eliminado_en ? String(r.eliminado_en) : undefined,
  };
}
export function clienteToRow(c: Partial<Cliente>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (c.nombres          !== undefined) out.nombres           = c.nombres;
  if (c.apellidos         !== undefined) out.apellidos          = c.apellidos;
  if (c.documentoTipo    !== undefined) out.documento_tipo     = c.documentoTipo;
  if (c.documentoNumero  !== undefined) out.documento_numero   = c.documentoNumero;
  if (c.telefono          !== undefined) out.telefono           = c.telefono;
  if (c.email              !== undefined) out.email              = c.email;
  if (c.fechaNacimiento  !== undefined) out.fecha_nacimiento   = c.fechaNacimiento || null;
  if (c.direccion         !== undefined) out.direccion          = c.direccion;
  if (c.notas              !== undefined) out.notas              = c.notas;
  return out;
}

/* ====== Citas / turnos ====== */
export function rowToCita(r: Record<string, unknown>): Cita {
  return {
    id: String(r.id), negocioId: String(r.negocio_id), clienteId: String(r.cliente_id),
    empleadoId: r.empleado_id ? String(r.empleado_id) : undefined,
    sucursalId: r.sucursal_id ? String(r.sucursal_id) : undefined,
    fechaHora: String(r.fecha_hora ?? ""),
    motivo: r.motivo ? String(r.motivo) : undefined,
    estado: String(r.estado ?? "programada"),
    notas: r.notas ? String(r.notas) : undefined,
    duracionMin: r.duracion_min != null ? Number(r.duracion_min) : undefined,
  };
}
export function citaToRow(c: Partial<Cita>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (c.clienteId  !== undefined) out.cliente_id  = c.clienteId;
  if (c.empleadoId !== undefined) out.empleado_id = c.empleadoId || null;
  if (c.sucursalId !== undefined) out.sucursal_id = c.sucursalId || null;
  if (c.fechaHora  !== undefined) out.fecha_hora  = c.fechaHora;
  if (c.motivo      !== undefined) out.motivo      = c.motivo;
  if (c.estado      !== undefined) out.estado      = c.estado;
  if (c.notas        !== undefined) out.notas        = c.notas;
  if (c.duracionMin  !== undefined) out.duracion_min  = c.duracionMin;
  return out;
}

/* ====== Recetas (graduación) ====== */
export function rowToReceta(r: Record<string, unknown>): Receta {
  return {
    id: String(r.id), negocioId: String(r.negocio_id), clienteId: String(r.cliente_id),
    citaId: r.cita_id ? String(r.cita_id) : undefined,
    fecha: String(r.fecha ?? ""), tipo: String(r.tipo ?? "lejos"),
    odEsfera: r.od_esfera != null ? Number(r.od_esfera) : undefined,
    odCilindro: r.od_cilindro != null ? Number(r.od_cilindro) : undefined,
    odEje: r.od_eje != null ? Number(r.od_eje) : undefined,
    odAdicion: r.od_adicion != null ? Number(r.od_adicion) : undefined,
    oiEsfera: r.oi_esfera != null ? Number(r.oi_esfera) : undefined,
    oiCilindro: r.oi_cilindro != null ? Number(r.oi_cilindro) : undefined,
    oiEje: r.oi_eje != null ? Number(r.oi_eje) : undefined,
    oiAdicion: r.oi_adicion != null ? Number(r.oi_adicion) : undefined,
    dip: r.dip != null ? Number(r.dip) : undefined,
    notas: r.notas ? String(r.notas) : undefined,
  };
}
export function recetaToRow(r: Partial<Receta>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (r.clienteId  !== undefined) out.cliente_id  = r.clienteId;
  if (r.citaId      !== undefined) out.cita_id      = r.citaId || null;
  if (r.fecha        !== undefined) out.fecha        = r.fecha;
  if (r.tipo          !== undefined) out.tipo          = r.tipo;
  if (r.odEsfera     !== undefined) out.od_esfera     = r.odEsfera;
  if (r.odCilindro   !== undefined) out.od_cilindro   = r.odCilindro;
  if (r.odEje         !== undefined) out.od_eje         = r.odEje;
  if (r.odAdicion    !== undefined) out.od_adicion    = r.odAdicion;
  if (r.oiEsfera     !== undefined) out.oi_esfera     = r.oiEsfera;
  if (r.oiCilindro   !== undefined) out.oi_cilindro   = r.oiCilindro;
  if (r.oiEje         !== undefined) out.oi_eje         = r.oiEje;
  if (r.oiAdicion    !== undefined) out.oi_adicion    = r.oiAdicion;
  if (r.dip            !== undefined) out.dip            = r.dip;
  if (r.notas           !== undefined) out.notas           = r.notas;
  return out;
}

/* ====== Exámenes optométricos ====== */
export function rowToExamenOptometrico(r: Record<string, unknown>): ExamenOptometrico {
  return {
    id: String(r.id), negocioId: String(r.negocio_id), clienteId: String(r.cliente_id),
    citaId: r.cita_id ? String(r.cita_id) : undefined,
    recetaId: r.receta_id ? String(r.receta_id) : undefined,
    fecha: String(r.fecha ?? ""),
    odAvSc: r.od_av_sc ? String(r.od_av_sc) : undefined,
    odAvCc: r.od_av_cc ? String(r.od_av_cc) : undefined,
    oiAvSc: r.oi_av_sc ? String(r.oi_av_sc) : undefined,
    oiAvCc: r.oi_av_cc ? String(r.oi_av_cc) : undefined,
    odK1: r.od_k1 != null ? Number(r.od_k1) : undefined,
    odK2: r.od_k2 != null ? Number(r.od_k2) : undefined,
    odEjeK: r.od_eje_k != null ? Number(r.od_eje_k) : undefined,
    oiK1: r.oi_k1 != null ? Number(r.oi_k1) : undefined,
    oiK2: r.oi_k2 != null ? Number(r.oi_k2) : undefined,
    oiEjeK: r.oi_eje_k != null ? Number(r.oi_eje_k) : undefined,
    anamnesis: r.anamnesis ? String(r.anamnesis) : undefined,
    notas: r.notas ? String(r.notas) : undefined,
  };
}
export function examenOptometricoToRow(e: Partial<ExamenOptometrico>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (e.clienteId  !== undefined) out.cliente_id = e.clienteId;
  if (e.citaId     !== undefined) out.cita_id    = e.citaId || null;
  if (e.recetaId   !== undefined) out.receta_id  = e.recetaId || null;
  if (e.fecha      !== undefined) out.fecha      = e.fecha;
  if (e.odAvSc     !== undefined) out.od_av_sc   = e.odAvSc;
  if (e.odAvCc     !== undefined) out.od_av_cc   = e.odAvCc;
  if (e.oiAvSc     !== undefined) out.oi_av_sc   = e.oiAvSc;
  if (e.oiAvCc     !== undefined) out.oi_av_cc   = e.oiAvCc;
  if (e.odK1       !== undefined) out.od_k1      = e.odK1;
  if (e.odK2       !== undefined) out.od_k2      = e.odK2;
  if (e.odEjeK     !== undefined) out.od_eje_k   = e.odEjeK;
  if (e.oiK1       !== undefined) out.oi_k1      = e.oiK1;
  if (e.oiK2       !== undefined) out.oi_k2      = e.oiK2;
  if (e.oiEjeK     !== undefined) out.oi_eje_k   = e.oiEjeK;
  if (e.anamnesis  !== undefined) out.anamnesis  = e.anamnesis;
  if (e.notas      !== undefined) out.notas      = e.notas;
  return out;
}

/* ====== Productos (+ stock de `inventario`, fusionado en DataProvider) ====== */
export function rowToProducto(r: Record<string, unknown>): Producto {
  return {
    id: String(r.id), negocioId: String(r.negocio_id),
    proveedorId: r.proveedor_id ? String(r.proveedor_id) : undefined,
    codigo: r.codigo ? String(r.codigo) : undefined,
    nombre: String(r.nombre ?? ""), categoria: String(r.categoria ?? "montura"),
    marca: r.marca ? String(r.marca) : undefined,
    descripcion: r.descripcion ? String(r.descripcion) : undefined,
    precioVenta: Number(r.precio_venta ?? 0), precioCosto: Number(r.precio_costo ?? 0),
    curvaBase: r.curva_base != null ? Number(r.curva_base) : undefined,
    diametro: r.diametro != null ? Number(r.diametro) : undefined,
    potencia: r.potencia != null ? Number(r.potencia) : undefined,
    imagenUrl: r.imagen_url ? String(r.imagen_url) : undefined,
    activo: Boolean(r.activo ?? true),
    stockActual: 0, stockMinimo: 0,
  };
}
export function productoToRow(p: Partial<Producto>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.proveedorId   !== undefined) out.proveedor_id  = p.proveedorId || null;
  if (p.codigo       !== undefined) out.codigo       = p.codigo || null;
  if (p.nombre        !== undefined) out.nombre        = p.nombre;
  if (p.categoria     !== undefined) out.categoria     = p.categoria;
  if (p.marca          !== undefined) out.marca          = p.marca;
  if (p.descripcion   !== undefined) out.descripcion   = p.descripcion;
  if (p.precioVenta   !== undefined) out.precio_venta   = p.precioVenta;
  if (p.precioCosto   !== undefined) out.precio_costo   = p.precioCosto;
  if (p.curvaBase     !== undefined) out.curva_base     = p.curvaBase ?? null;
  if (p.diametro      !== undefined) out.diametro       = p.diametro ?? null;
  if (p.potencia      !== undefined) out.potencia       = p.potencia ?? null;
  if (p.imagenUrl     !== undefined) out.imagen_url     = p.imagenUrl;
  if (p.activo         !== undefined) out.activo         = p.activo;
  return out;
}

/* ====== Movimientos de stock ====== */
export function rowToMovimientoStock(r: Record<string, unknown>): MovimientoStock {
  return {
    id: String(r.id), negocioId: String(r.negocio_id), productoId: String(r.producto_id),
    sucursalId: r.sucursal_id ? String(r.sucursal_id) : undefined,
    tipo: String(r.tipo ?? "entrada"), cantidad: Number(r.cantidad ?? 0),
    motivo: r.motivo ? String(r.motivo) : undefined,
    fecha: String(r.fecha ?? ""),
  };
}

/* ====== Ventas ====== */
export function rowToVenta(r: Record<string, unknown>): Venta {
  return {
    id: String(r.id), negocioId: String(r.negocio_id),
    clienteId: r.cliente_id ? String(r.cliente_id) : undefined,
    empleadoId: r.empleado_id ? String(r.empleado_id) : undefined,
    sucursalId: r.sucursal_id ? String(r.sucursal_id) : undefined,
    fecha: String(r.fecha ?? ""),
    subtotal: Number(r.subtotal ?? 0), igv: Number(r.igv ?? 0), total: Number(r.total ?? 0),
    metodoPago: String(r.metodo_pago ?? "efectivo"), estado: String(r.estado ?? "pagada"),
    montoPagado: Number(r.monto_pagado ?? 0),
    notas: r.notas ? String(r.notas) : undefined,
  };
}
export function ventaToRow(v: Partial<Venta>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (v.clienteId    !== undefined) out.cliente_id    = v.clienteId || null;
  if (v.empleadoId   !== undefined) out.empleado_id   = v.empleadoId || null;
  if (v.sucursalId   !== undefined) out.sucursal_id   = v.sucursalId || null;
  if (v.subtotal       !== undefined) out.subtotal       = v.subtotal;
  if (v.igv             !== undefined) out.igv             = v.igv;
  if (v.total           !== undefined) out.total           = v.total;
  if (v.metodoPago     !== undefined) out.metodo_pago     = v.metodoPago;
  if (v.estado          !== undefined) out.estado          = v.estado;
  if (v.montoPagado    !== undefined) out.monto_pagado    = v.montoPagado;
  if (v.notas            !== undefined) out.notas            = v.notas;
  return out;
}

export function rowToVentaItem(r: Record<string, unknown>): VentaItem {
  return {
    id: String(r.id), ventaId: String(r.venta_id),
    productoId: r.producto_id ? String(r.producto_id) : undefined,
    descripcion: String(r.descripcion ?? ""), cantidad: Number(r.cantidad ?? 1),
    precioUnitario: Number(r.precio_unitario ?? 0), subtotal: Number(r.subtotal ?? 0),
  };
}

/* ====== Órdenes de laboratorio ====== */
export function rowToOrdenLaboratorio(r: Record<string, unknown>): OrdenLaboratorio {
  return {
    id: String(r.id), negocioId: String(r.negocio_id),
    ventaId: r.venta_id ? String(r.venta_id) : undefined,
    ventaItemId: r.venta_item_id ? String(r.venta_item_id) : undefined,
    clienteId: r.cliente_id ? String(r.cliente_id) : undefined,
    recetaId: r.receta_id ? String(r.receta_id) : undefined,
    empleadoId: r.empleado_id ? String(r.empleado_id) : undefined,
    sucursalOrigenId: r.sucursal_origen_id ? String(r.sucursal_origen_id) : undefined,
    sucursalDestinoId: r.sucursal_destino_id ? String(r.sucursal_destino_id) : undefined,
    laboratorioNombre: r.laboratorio_nombre ? String(r.laboratorio_nombre) : undefined,
    estado: (r.estado as EstadoOrdenLaboratorio) ?? "generado",
    fechaGenerado: String(r.fecha_generado ?? ""),
    fechaEstimada: r.fecha_estimada ? String(r.fecha_estimada) : undefined,
    avisadoWhatsappEn: r.avisado_whatsapp_en ? String(r.avisado_whatsapp_en) : undefined,
    notas: r.notas ? String(r.notas) : undefined,
  };
}
export function ordenLaboratorioToRow(o: Partial<OrdenLaboratorio>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (o.ventaId            !== undefined) out.venta_id             = o.ventaId || null;
  if (o.ventaItemId        !== undefined) out.venta_item_id        = o.ventaItemId || null;
  if (o.clienteId          !== undefined) out.cliente_id           = o.clienteId || null;
  if (o.recetaId           !== undefined) out.receta_id            = o.recetaId || null;
  if (o.empleadoId         !== undefined) out.empleado_id          = o.empleadoId || null;
  if (o.sucursalOrigenId   !== undefined) out.sucursal_origen_id   = o.sucursalOrigenId || null;
  if (o.sucursalDestinoId  !== undefined) out.sucursal_destino_id  = o.sucursalDestinoId || null;
  if (o.laboratorioNombre  !== undefined) out.laboratorio_nombre   = o.laboratorioNombre;
  if (o.estado              !== undefined) out.estado               = o.estado;
  if (o.fechaEstimada       !== undefined) out.fecha_estimada       = o.fechaEstimada;
  if (o.avisadoWhatsappEn   !== undefined) out.avisado_whatsapp_en  = o.avisadoWhatsappEn;
  if (o.notas                !== undefined) out.notas                = o.notas;
  return out;
}

/* ====== Caja ====== */
export function rowToCaja(r: Record<string, unknown>): Caja {
  return {
    id: String(r.id), negocioId: String(r.negocio_id),
    sucursalId: r.sucursal_id ? String(r.sucursal_id) : undefined,
    empleadoAperturaId: r.empleado_apertura_id ? String(r.empleado_apertura_id) : undefined,
    empleadoCierreId: r.empleado_cierre_id ? String(r.empleado_cierre_id) : undefined,
    fechaApertura: String(r.fecha_apertura ?? ""),
    fechaCierre: r.fecha_cierre ? String(r.fecha_cierre) : undefined,
    montoInicial: Number(r.monto_inicial ?? 0),
    desgloseApertura: Array.isArray(r.desglose_apertura) ? (r.desglose_apertura as ItemAperturaCaja[]) : [],
    totalEfectivo: Number(r.total_efectivo ?? 0),
    totalTarjeta: Number(r.total_tarjeta ?? 0),
    totalYape: Number(r.total_yape ?? 0),
    totalPlin: Number(r.total_plin ?? 0),
    totalTransferencia: Number(r.total_transferencia ?? 0),
    montoEfectivoEsperado: Number(r.monto_efectivo_esperado ?? 0),
    montoEfectivoContado: r.monto_efectivo_contado != null ? Number(r.monto_efectivo_contado) : undefined,
    diferencia: r.diferencia != null ? Number(r.diferencia) : undefined,
    estado: (r.estado as EstadoCaja) ?? "abierta",
    notas: r.notas ? String(r.notas) : undefined,
  };
}
export function cajaToRow(c: Partial<Caja>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (c.sucursalId              !== undefined) out.sucursal_id              = c.sucursalId || null;
  if (c.empleadoAperturaId      !== undefined) out.empleado_apertura_id     = c.empleadoAperturaId || null;
  if (c.empleadoCierreId        !== undefined) out.empleado_cierre_id       = c.empleadoCierreId || null;
  if (c.fechaCierre              !== undefined) out.fecha_cierre             = c.fechaCierre;
  if (c.montoInicial             !== undefined) out.monto_inicial            = c.montoInicial;
  if (c.desgloseApertura         !== undefined) out.desglose_apertura        = c.desgloseApertura;
  if (c.totalEfectivo            !== undefined) out.total_efectivo           = c.totalEfectivo;
  if (c.totalTarjeta             !== undefined) out.total_tarjeta            = c.totalTarjeta;
  if (c.totalYape                !== undefined) out.total_yape               = c.totalYape;
  if (c.totalPlin                !== undefined) out.total_plin               = c.totalPlin;
  if (c.totalTransferencia       !== undefined) out.total_transferencia      = c.totalTransferencia;
  if (c.montoEfectivoEsperado    !== undefined) out.monto_efectivo_esperado  = c.montoEfectivoEsperado;
  if (c.montoEfectivoContado     !== undefined) out.monto_efectivo_contado   = c.montoEfectivoContado;
  if (c.estado                    !== undefined) out.estado                   = c.estado;
  if (c.notas                      !== undefined) out.notas                    = c.notas;
  return out;
}

/* ====== Gastos ====== */
export function rowToGasto(r: Record<string, unknown>): Gasto {
  return {
    id: String(r.id), negocioId: String(r.negocio_id),
    proveedorId: r.proveedor_id ? String(r.proveedor_id) : undefined,
    categoria: String(r.categoria ?? "otro"),
    descripcion: r.descripcion ? String(r.descripcion) : undefined,
    monto: Number(r.monto ?? 0), fecha: String(r.fecha ?? ""),
  };
}
export function gastoToRow(g: Partial<Gasto>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (g.proveedorId   !== undefined) out.proveedor_id  = g.proveedorId || null;
  if (g.categoria     !== undefined) out.categoria     = g.categoria;
  if (g.descripcion   !== undefined) out.descripcion   = g.descripcion;
  if (g.monto           !== undefined) out.monto           = g.monto;
  if (g.fecha            !== undefined) out.fecha            = g.fecha;
  return out;
}

/* ====== Proveedores ====== */
export function rowToProveedor(r: Record<string, unknown>): Proveedor {
  return {
    id: String(r.id), negocioId: String(r.negocio_id),
    nombre: String(r.nombre ?? ""),
    ruc: r.ruc ? String(r.ruc) : undefined,
    contacto: r.contacto ? String(r.contacto) : undefined,
    telefono: r.telefono ? String(r.telefono) : undefined,
    email: r.email ? String(r.email) : undefined,
    direccion: r.direccion ? String(r.direccion) : undefined,
    notas: r.notas ? String(r.notas) : undefined,
    activo: Boolean(r.activo ?? true),
  };
}
export function proveedorToRow(p: Partial<Proveedor>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.nombre    !== undefined) out.nombre    = p.nombre;
  if (p.ruc       !== undefined) out.ruc       = p.ruc;
  if (p.contacto  !== undefined) out.contacto  = p.contacto;
  if (p.telefono  !== undefined) out.telefono  = p.telefono;
  if (p.email     !== undefined) out.email     = p.email;
  if (p.direccion !== undefined) out.direccion = p.direccion;
  if (p.notas     !== undefined) out.notas     = p.notas;
  if (p.activo    !== undefined) out.activo    = p.activo;
  return out;
}

/* ====== Cotizaciones ====== */
export function rowToCotizacion(r: Record<string, unknown>): Cotizacion {
  return {
    id: String(r.id), negocioId: String(r.negocio_id),
    clienteId: r.cliente_id ? String(r.cliente_id) : undefined,
    ventaId: r.venta_id ? String(r.venta_id) : undefined,
    fecha: String(r.fecha ?? ""),
    vigenciaHasta: r.vigencia_hasta ? String(r.vigencia_hasta) : undefined,
    subtotal: Number(r.subtotal ?? 0), igv: Number(r.igv ?? 0), total: Number(r.total ?? 0),
    estado: (r.estado as Cotizacion["estado"]) ?? "pendiente",
    notas: r.notas ? String(r.notas) : undefined,
  };
}
export function cotizacionToRow(c: Partial<Cotizacion>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (c.clienteId      !== undefined) out.cliente_id      = c.clienteId || null;
  if (c.ventaId          !== undefined) out.venta_id          = c.ventaId || null;
  if (c.vigenciaHasta   !== undefined) out.vigencia_hasta   = c.vigenciaHasta || null;
  if (c.subtotal          !== undefined) out.subtotal          = c.subtotal;
  if (c.igv                !== undefined) out.igv                = c.igv;
  if (c.total              !== undefined) out.total              = c.total;
  if (c.estado             !== undefined) out.estado             = c.estado;
  if (c.notas               !== undefined) out.notas               = c.notas;
  return out;
}

export function rowToCotizacionItem(r: Record<string, unknown>): CotizacionItem {
  return {
    id: String(r.id), cotizacionId: String(r.cotizacion_id),
    productoId: r.producto_id ? String(r.producto_id) : undefined,
    descripcion: String(r.descripcion ?? ""), cantidad: Number(r.cantidad ?? 1),
    precioUnitario: Number(r.precio_unitario ?? 0), subtotal: Number(r.subtotal ?? 0),
  };
}

/* ====== Descuentos / cupones ====== */
export function rowToDescuento(r: Record<string, unknown>): Descuento {
  return {
    id: String(r.id), negocioId: String(r.negocio_id),
    codigo: String(r.codigo ?? ""), tipo: (r.tipo as "porcentaje" | "monto") ?? "porcentaje",
    valor: Number(r.valor ?? 0),
    aplicaA: (r.aplica_a as Descuento["aplicaA"]) ?? "ambos",
    vigenciaDesde: r.vigencia_desde ? String(r.vigencia_desde) : undefined,
    vigenciaHasta: r.vigencia_hasta ? String(r.vigencia_hasta) : undefined,
    limiteUsos: r.limite_usos != null ? Number(r.limite_usos) : undefined,
    usos: Number(r.usos ?? 0),
    activo: Boolean(r.activo ?? true),
  };
}
export function descuentoToRow(d: Partial<Descuento>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (d.codigo         !== undefined) out.codigo         = d.codigo;
  if (d.tipo             !== undefined) out.tipo             = d.tipo;
  if (d.valor            !== undefined) out.valor            = d.valor;
  if (d.aplicaA          !== undefined) out.aplica_a         = d.aplicaA;
  if (d.vigenciaDesde   !== undefined) out.vigencia_desde   = d.vigenciaDesde || null;
  if (d.vigenciaHasta   !== undefined) out.vigencia_hasta   = d.vigenciaHasta || null;
  if (d.limiteUsos      !== undefined) out.limite_usos      = d.limiteUsos ?? null;
  if (d.activo           !== undefined) out.activo           = d.activo;
  return out;
}

/* ====== Suscripción (solo lectura desde el cliente — ver RLS) ====== */
export function rowToSuscripcion(r: Record<string, unknown>): Suscripcion {
  return {
    id:                  String(r.id),
    negocioId:           String(r.negocio_id),
    plan:                String(r.plan ?? "trial"),
    estado:              String(r.estado ?? "trial"),
    trialInicio:         String(r.trial_inicio ?? ""),
    trialFin:            String(r.trial_fin ?? ""),
    fechaPagoUltimo:     r.fecha_pago_ultimo ? String(r.fecha_pago_ultimo) : undefined,
    proximoCobro:        r.proximo_cobro ? String(r.proximo_cobro) : undefined,
  };
}
