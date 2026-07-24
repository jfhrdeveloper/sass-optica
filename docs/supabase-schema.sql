-- ================================================================
-- SaaS Óptica — SCHEMA SUPABASE (auth + tenant + roles + suscripciones)
-- Fuente única ejecutable del modelo de datos. Pegar en SQL Editor → Run.
-- Idempotente: re-ejecutarlo no rompe datos existentes.
--
-- ESTADO: cubre la capa de auth + multi-tenant + roles + billing. Las tablas
-- de dominio de la óptica (clientes, citas, recetas, productos, ventas,
-- gastos, comprobantes) se agregan en una fase posterior siguiendo el mismo
-- patrón (negocio_id + RLS `negocio_id = current_tenant()`).
--
-- Diferencia clave con el patrón base de plantillabase-auth: aquí NO hay un
-- owner único con "managers de grupo" — cada negocio (óptica) YA ES el
-- tenant, y los 3 roles son PLANOS dentro de él (sin scope de sub-grupo).
-- ================================================================

-- ====== Extensiones ======
create extension if not exists "pgcrypto";
create extension if not exists pg_cron;   -- expiración diaria de trials

-- ====== ENUM de roles ======
do $$ begin
  create type rol_empleado as enum ('administrador', 'encargado', 'trabajador');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_suscripcion as enum ('trial', 'activa', 'vencida', 'cancelada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_suscripcion as enum ('trial', 'basico', 'premium');
exception when duplicate_object then null; end $$;

-- ====== Trigger genérico updated_at ======
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = public as $$
begin new.updated_at := now(); return new; end $$;

-- ================================================================
-- TABLAS
-- ================================================================

-- negocios (tenant — cada óptica cliente del SaaS) ------------------------
create table if not exists public.negocios (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  subdominio   text not null unique,
  ruc          text,
  telefono     text,
  direccion    text,
  logo_url     text,
  color_primario text,  -- personalización de marca (hex, ej. '#2563eb') — null = paleta por defecto
  activo       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint negocios_subdominio_formato check (subdominio ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'),
  constraint negocios_subdominio_longitud check (char_length(subdominio) between 3 and 30)
);
create unique index if not exists idx_negocios_subdominio on public.negocios (lower(subdominio));

-- Bloquea el cambio de subdominio post-registro (decisión de producto — ver
-- brief-saas-proyecto.md §2: "no se implementa, ni en plan gratis ni pago").
create or replace function public.bloquear_cambio_subdominio()
returns trigger language plpgsql as $$
begin
  if new.subdominio <> old.subdominio then
    raise exception 'El subdominio no se puede modificar después del registro';
  end if;
  return new;
end $$;

drop trigger if exists trg_negocios_lock_subdominio on public.negocios;
create trigger trg_negocios_lock_subdominio
  before update on public.negocios
  for each row execute function public.bloquear_cambio_subdominio();

-- empleados (1:1 con auth.users — "usuarios" del brief) ---------------------
create table if not exists public.empleados (
  id            uuid primary key references auth.users(id) on delete cascade,
  negocio_id    uuid references public.negocios(id) on delete cascade,
  nombres       text not null default '',
  apellidos     text not null default '',
  rol           rol_empleado not null default 'trabajador',
  email         text,
  telefono      text,
  avatar_base64 text,
  -- Permisos granulares ADITIVOS por empleado, capa por encima del rol fijo
  -- (administrador/encargado/trabajador) — no lo reemplazan. Claves posibles
  -- hoy: 'gastos', 'descuentos', 'marketing'. Default '{}' = ningún extra;
  -- solo el administrador puede seguir gestionando empleados/ajustes, eso
  -- NUNCA se delega por este campo. Ver tiene_permiso() más abajo.
  permisos      jsonb not null default '{}'::jsonb,
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_empleados_negocio on public.empleados(negocio_id);
create index if not exists idx_empleados_rol      on public.empleados(rol);

-- negocio_id de un empleado nunca cambia una vez asignado (no hay traspasos
-- entre tenants). Sí se permite la asignación inicial (NULL -> X) que hace
-- el flujo de registro/invitación justo después de crear el auth.user.
create or replace function public.bloquear_cambio_tenant_empleado()
returns trigger language plpgsql as $$
begin
  if old.negocio_id is not null and new.negocio_id is distinct from old.negocio_id then
    raise exception 'Un empleado no puede cambiar de negocio';
  end if;
  return new;
end $$;

drop trigger if exists trg_empleados_lock_tenant on public.empleados;
create trigger trg_empleados_lock_tenant
  before update on public.empleados
  for each row execute function public.bloquear_cambio_tenant_empleado();

-- suscripciones (una por negocio: trial → básico/premium vía Culqi) --------
create table if not exists public.suscripciones (
  id                     uuid primary key default gen_random_uuid(),
  negocio_id             uuid not null unique references public.negocios(id) on delete cascade,
  plan                   plan_suscripcion not null default 'trial',
  estado                 estado_suscripcion not null default 'trial',
  trial_inicio           date not null default current_date,
  trial_fin              date not null default (current_date + interval '30 days'),
  fecha_pago_ultimo      date,
  proximo_cobro          date,
  culqi_customer_id      text,
  culqi_subscription_id  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists idx_suscripciones_negocio on public.suscripciones(negocio_id);
create index if not exists idx_suscripciones_estado  on public.suscripciones(estado);

-- super_admins (dueño/equipo del SaaS — Fase 5, panel admin.dominio) --------
-- NO son "empleados" de ningún negocio: ven a través de TODOS los tenants.
-- Sin alta self-service ni por invitación — se agregan a mano por SQL Editor
-- (ver POST-INSTALACIÓN al final del archivo). El panel admin.dominio los usa
-- vía el cliente admin.ts (service role) en Server Components/Route Handlers,
-- nunca con el cliente anon — por eso su RLS solo necesita permitir que cada
-- quien confirme SU PROPIA membresía (para el gate de acceso en el proxy).
create table if not exists public.super_admins (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text not null default '',
  email      text,
  created_at timestamptz not null default now()
);

-- ================================================================
-- TRIGGERS updated_at
-- ================================================================
do $$
declare t text;
begin
  foreach t in array array['negocios','empleados','suscripciones'] loop
    execute format(
      'drop trigger if exists trg_%1$s_updated on public.%1$s;
       create trigger trg_%1$s_updated before update on public.%1$s
         for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- ================================================================
-- AUTO-CREACIÓN de fila `empleados` al registrar usuario en auth.users
-- ----------------------------------------------------------------------------
-- Inserta una fila mínima (negocio_id NULL, rol de menor privilegio). El
-- flujo que crea el usuario (registro self-service en /api/registro, o
-- invitación en /api/empleados/invitar) completa negocio_id + rol + nombres
-- inmediatamente después, con el cliente admin (service role). Mientras
-- negocio_id sea NULL, las políticas RLS no conceden acceso a ningún dato de
-- negocio (fail-closed).
-- ================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.empleados (id, email, nombres)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ================================================================
-- HELPERS RLS (tenant y rol del usuario actual)
-- IMPORTANTE: SECURITY DEFINER + set search_path = public. Leen empleados y
-- se usan DENTRO de las policies de empleados → si no fueran definer,
-- Postgres lanzaría "infinite recursion detected in policy for relation empleados".
-- ================================================================
create or replace function public.current_tenant()
returns uuid language sql stable security definer
set search_path = public as $$ select negocio_id from public.empleados where id = auth.uid(); $$;

create or replace function public.current_rol()
returns rol_empleado language sql stable security definer
set search_path = public as $$ select rol from public.empleados where id = auth.uid(); $$;

create or replace function public.is_administrador()
returns boolean language sql stable security definer
set search_path = public as $$ select coalesce(public.current_rol() = 'administrador', false); $$;

-- "Gestión operativa" = administrador o encargado (stock/ventas/clientes/
-- citas, sin reportes financieros completos — ver brief §5).
create or replace function public.puede_gestionar()
returns boolean language sql stable security definer
set search_path = public as $$ select coalesce(public.current_rol() in ('administrador','encargado'), false); $$;

-- Permiso granular aditivo (empleados.permisos jsonb) — ver comentario en la
-- columna. Un administrador SIEMPRE pasa (is_administrador() ya lo cubre en
-- cada policy con `or`), esta función solo resuelve el caso "no soy admin
-- pero se me delegó este módulo puntual".
create or replace function public.tiene_permiso(clave text)
returns boolean language sql stable security definer
set search_path = public as $$
  select coalesce((select (permisos->>clave)::boolean from public.empleados where id = auth.uid()), false);
$$;

-- Dueño/equipo del SaaS (panel admin.dominio, Fase 5) — no confundir con
-- is_administrador(), que es el rol dentro de UN negocio.
create or replace function public.is_super_admin()
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (select 1 from public.super_admins where id = auth.uid());
$$;

-- ================================================================
-- PRIVILEGIOS DE TABLA (GRANTs) — IMPRESCINDIBLE
-- RLS solo filtra FILAS; `authenticated` necesita además el privilegio de tabla.
-- ================================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to anon, authenticated;

grant all privileges on all tables    in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
alter default privileges for role postgres in schema public grant all privileges on tables to service_role;

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
alter table public.negocios      enable row level security;
alter table public.empleados     enable row level security;
alter table public.suscripciones enable row level security;
alter table public.super_admins  enable row level security;

-- ====== SUPER_ADMINS ======
-- Cada quien solo confirma SU PROPIA membresía (lo usa el proxy para el
-- gate de acceso a admin.dominio). Nadie escribe desde el cliente — el alta
-- es manual por SQL Editor (ver POST-INSTALACIÓN).
drop policy if exists super_admins_self_read on public.super_admins;
create policy super_admins_self_read on public.super_admins for select using (id = auth.uid());

-- ====== NEGOCIOS ======
-- Lectura/escritura del propio negocio; alta de negocios queda reservada a
-- service_role (el registro self-service nunca pasa por el cliente autenticado,
-- porque en ese momento el usuario todavía no tiene negocio_id asignado).
drop policy if exists negocios_read       on public.negocios;
drop policy if exists negocios_admin_edit on public.negocios;
create policy negocios_read       on public.negocios for select using (id = public.current_tenant());
create policy negocios_admin_edit on public.negocios for update
  using (public.is_administrador() and id = public.current_tenant())
  with check (public.is_administrador() and id = public.current_tenant());

-- ====== EMPLEADOS ("usuarios") ======
-- Alta (registro/invitar) y baja (eliminar) SIEMPRE vía /api/* con
-- service_role — nunca insert/delete para `authenticated` aquí.
drop policy if exists empleados_self_read    on public.empleados;
drop policy if exists empleados_team_read    on public.empleados;
drop policy if exists empleados_self_update  on public.empleados;
drop policy if exists empleados_admin_update on public.empleados;
create policy empleados_self_read    on public.empleados for select using (id = auth.uid());
create policy empleados_team_read    on public.empleados for select
  using (negocio_id = public.current_tenant());
create policy empleados_self_update  on public.empleados for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy empleados_admin_update on public.empleados for update
  using (public.is_administrador() and negocio_id = public.current_tenant())
  with check (public.is_administrador() and negocio_id = public.current_tenant());

-- ====== SUSCRIPCIONES ======
-- Lectura para TODO empleado del negocio (no solo administrador): el proxy
-- necesita poder chequear el estado para cualquier rol, para bloquear el
-- acceso si el trial venció sin pago (brief §4/§10) — sin esto, RLS le
-- ocultaría la fila a encargado/trabajador y el bloqueo nunca se activaría
-- para ellos. Los cambios de estado los hace SIEMPRE service_role, vía
-- webhook/cargo de Culqi y el cron de expiración de trial — nunca el cliente.
drop policy if exists suscripciones_admin_read on public.suscripciones;
drop policy if exists suscripciones_read on public.suscripciones;
create policy suscripciones_read on public.suscripciones for select
  using (negocio_id = public.current_tenant());

-- ================================================================
-- MÓDULO DE DOMINIO: gestión de la óptica (Fase 6)
-- Mismo patrón de tenant que la capa de auth: negocio_id + RLS filtrando por
-- negocio_id = current_tenant(). "Gestión operativa" (puede_gestionar(), ya
-- definido arriba) = administrador o encargado, según brief §5. `gastos` es
-- exclusivo de administrador. `citas`≈"turnos", `clientes`≈"pacientes_optica",
-- `recetas`≈"receta_optica" del brief (nombres conservados de la UI ya
-- construida en otros prototipos del mismo fundador).
-- ================================================================

do $$ begin create type tipo_documento      as enum ('DNI','CE','RUC','PASAPORTE'); exception when duplicate_object then null; end $$;
do $$ begin create type estado_cita         as enum ('programada','atendida','cancelada','no_asistio'); exception when duplicate_object then null; end $$;
do $$ begin create type tipo_receta         as enum ('lejos','cerca','progresivo','bifocal','lentes_contacto'); exception when duplicate_object then null; end $$;
do $$ begin create type categoria_producto  as enum ('montura','luna','lente_contacto','liquido','accesorio','servicio'); exception when duplicate_object then null; end $$;
do $$ begin create type tipo_movimiento_stock as enum ('entrada','salida','ajuste','devolucion'); exception when duplicate_object then null; end $$;
do $$ begin create type metodo_pago         as enum ('efectivo','tarjeta','yape','plin','transferencia'); exception when duplicate_object then null; end $$;
do $$ begin create type estado_venta        as enum ('pagada','pendiente','anulada'); exception when duplicate_object then null; end $$;
do $$ begin create type categoria_gasto     as enum ('alquiler','sueldos','insumos','servicios','proveedor','otro'); exception when duplicate_object then null; end $$;
do $$ begin create type tipo_comprobante    as enum ('factura','boleta'); exception when duplicate_object then null; end $$;
do $$ begin create type estado_comprobante  as enum ('emitido','anulado','rechazado'); exception when duplicate_object then null; end $$;

-- Clientes / pacientes --------------------------------------------------
create table if not exists public.clientes (
  id               uuid primary key default gen_random_uuid(),
  negocio_id       uuid not null references public.negocios(id) on delete cascade,
  nombres          text not null,
  apellidos        text not null default '',
  documento_tipo   tipo_documento not null default 'DNI',
  documento_numero text,
  telefono         text,
  email            text,
  fecha_nacimiento date,
  direccion        text,
  notas            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_clientes_negocio    on public.clientes(negocio_id);
create index if not exists idx_clientes_apellidos  on public.clientes(apellidos);

-- Citas / turnos ----------------------------------------------------------
create table if not exists public.citas (
  id           uuid primary key default gen_random_uuid(),
  negocio_id   uuid not null references public.negocios(id) on delete cascade,
  cliente_id   uuid not null references public.clientes(id) on delete cascade,
  empleado_id  uuid references public.empleados(id) on delete set null,
  fecha_hora   timestamptz not null,
  motivo       text,
  estado       estado_cita not null default 'programada',
  notas        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_citas_negocio on public.citas(negocio_id);
create index if not exists idx_citas_cliente on public.citas(cliente_id);
create index if not exists idx_citas_fecha   on public.citas(fecha_hora);

-- Recetas (graduaciones) ---------------------------------------------------
-- OD = ojo derecho, OI = ojo izquierdo, DIP = distancia interpupilar (mm).
create table if not exists public.recetas (
  id            uuid primary key default gen_random_uuid(),
  negocio_id    uuid not null references public.negocios(id) on delete cascade,
  cliente_id    uuid not null references public.clientes(id) on delete cascade,
  cita_id       uuid references public.citas(id) on delete set null,
  empleado_id   uuid references public.empleados(id) on delete set null,
  fecha         date not null default current_date,
  tipo          tipo_receta not null default 'lejos',
  od_esfera     numeric(5,2), od_cilindro numeric(5,2), od_eje smallint check (od_eje between 0 and 180), od_adicion numeric(5,2),
  oi_esfera     numeric(5,2), oi_cilindro numeric(5,2), oi_eje smallint check (oi_eje between 0 and 180), oi_adicion numeric(5,2),
  dip           numeric(4,1),
  notas         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_recetas_negocio on public.recetas(negocio_id);
create index if not exists idx_recetas_cliente on public.recetas(cliente_id);

-- Proveedores (idea de UX tomada de research de competencia: hoy `marca` en
-- productos es solo texto libre y `gastos.categoria = 'proveedor'` no
-- estaba ligado a nada real) ------------------------------------------------
create table if not exists public.proveedores (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references public.negocios(id) on delete cascade,
  nombre      text not null,
  ruc         text,
  contacto    text,
  telefono    text,
  email       text,
  direccion   text,
  notas       text,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_proveedores_negocio on public.proveedores(negocio_id);

-- Productos (catálogo: armazones, lunas, lentes de contacto...) -----------
create table if not exists public.productos (
  id            uuid primary key default gen_random_uuid(),
  negocio_id    uuid not null references public.negocios(id) on delete cascade,
  proveedor_id  uuid references public.proveedores(id) on delete set null,
  codigo        text,
  nombre        text not null,
  categoria     categoria_producto not null default 'montura',
  marca         text,
  descripcion   text,
  precio_venta  numeric(10,2) not null default 0,
  precio_costo  numeric(10,2) not null default 0,
  imagen_url    text,
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists idx_productos_negocio_codigo on public.productos(negocio_id, codigo) where codigo is not null;
create index if not exists idx_productos_negocio   on public.productos(negocio_id);
create index if not exists idx_productos_categoria on public.productos(categoria);

-- Inventario (stock 1:1 — hereda el tenant vía producto_id) ----------------
create table if not exists public.inventario (
  producto_id   uuid primary key references public.productos(id) on delete cascade,
  stock_actual  integer not null default 0,
  stock_minimo  integer not null default 0,
  ubicacion     text,
  updated_at    timestamptz not null default now()
);

-- Movimientos de stock (trazabilidad — brief §6) --------------------------
create table if not exists public.movimientos_stock (
  id           uuid primary key default gen_random_uuid(),
  negocio_id   uuid not null references public.negocios(id) on delete cascade,
  producto_id  uuid not null references public.productos(id) on delete cascade,
  tipo         tipo_movimiento_stock not null,
  cantidad     integer not null check (cantidad > 0),
  motivo       text,
  empleado_id  uuid references public.empleados(id) on delete set null,
  fecha        timestamptz not null default now()
);
create index if not exists idx_movstock_negocio  on public.movimientos_stock(negocio_id);
create index if not exists idx_movstock_producto on public.movimientos_stock(producto_id);

-- Ventas --------------------------------------------------------------------
-- subtotal + igv = total. IGV Perú = 18%. Montos en soles (PEN).
create table if not exists public.ventas (
  id           uuid primary key default gen_random_uuid(),
  negocio_id   uuid not null references public.negocios(id) on delete cascade,
  cliente_id   uuid references public.clientes(id) on delete set null,
  empleado_id  uuid references public.empleados(id) on delete set null,
  receta_id    uuid references public.recetas(id) on delete set null,
  fecha        timestamptz not null default now(),
  subtotal     numeric(10,2) not null default 0,
  igv          numeric(10,2) not null default 0,
  total        numeric(10,2) not null default 0,
  metodo_pago  metodo_pago not null default 'efectivo',
  estado       estado_venta not null default 'pagada',
  monto_pagado numeric(10,2) not null default 0,
  notas        text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_ventas_negocio on public.ventas(negocio_id);
create index if not exists idx_ventas_cliente on public.ventas(cliente_id);
create index if not exists idx_ventas_fecha   on public.ventas(fecha);

-- Ítems de venta (hereda el tenant vía venta_id) --------------------------
create table if not exists public.venta_items (
  id              uuid primary key default gen_random_uuid(),
  venta_id        uuid not null references public.ventas(id) on delete cascade,
  producto_id     uuid references public.productos(id) on delete set null,
  descripcion     text not null,
  cantidad        integer not null default 1 check (cantidad > 0),
  precio_unitario numeric(10,2) not null default 0,
  subtotal        numeric(10,2) not null default 0
);
create index if not exists idx_venta_items_venta on public.venta_items(venta_id);

-- Cotizaciones (documento previo a la venta, sin comprometer stock — idea
-- de UX tomada de research de competencia: comparar armazón+luna antes de
-- que el cliente decida). "Convertir a venta" crea una fila real en
-- `ventas` y guarda su id acá; no borra la cotización, queda como
-- histórico de que esa venta nació de una cotización. -----------------------
do $$ begin create type estado_cotizacion as enum ('pendiente', 'aceptada', 'rechazada', 'vencida'); exception when duplicate_object then null; end $$;
create table if not exists public.cotizaciones (
  id             uuid primary key default gen_random_uuid(),
  negocio_id     uuid not null references public.negocios(id) on delete cascade,
  cliente_id     uuid references public.clientes(id) on delete set null,
  empleado_id    uuid references public.empleados(id) on delete set null,
  venta_id       uuid references public.ventas(id) on delete set null,
  fecha          timestamptz not null default now(),
  vigencia_hasta date,
  subtotal       numeric(10,2) not null default 0,
  igv            numeric(10,2) not null default 0,
  total          numeric(10,2) not null default 0,
  estado         estado_cotizacion not null default 'pendiente',
  notas          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_cotizaciones_negocio on public.cotizaciones(negocio_id);
create index if not exists idx_cotizaciones_cliente on public.cotizaciones(cliente_id);

create table if not exists public.cotizacion_items (
  id              uuid primary key default gen_random_uuid(),
  cotizacion_id   uuid not null references public.cotizaciones(id) on delete cascade,
  producto_id     uuid references public.productos(id) on delete set null,
  descripcion     text not null,
  cantidad        integer not null default 1 check (cantidad > 0),
  precio_unitario numeric(10,2) not null default 0,
  subtotal        numeric(10,2) not null default 0
);
create index if not exists idx_cotizacion_items_cotizacion on public.cotizacion_items(cotizacion_id);

-- Gastos (solo administrador — brief §5/§6) --------------------------------
create table if not exists public.gastos (
  id              uuid primary key default gen_random_uuid(),
  negocio_id      uuid not null references public.negocios(id) on delete cascade,
  proveedor_id    uuid references public.proveedores(id) on delete set null,
  categoria       categoria_gasto not null default 'otro',
  descripcion     text,
  monto           numeric(10,2) not null check (monto >= 0),
  fecha           date not null default current_date,
  empleado_id     uuid references public.empleados(id) on delete set null,
  comprobante_url text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_gastos_negocio on public.gastos(negocio_id);
create index if not exists idx_gastos_fecha   on public.gastos(fecha);

-- Comprobantes (facturación SUNAT — fase posterior al MVP, brief §8/§9) ---
-- Sin policy de escritura para `authenticated`: el alta la hace service_role
-- cuando se integre el OSE (Nubefact). Por ahora solo lectura desde el panel.
create table if not exists public.comprobantes (
  id                    uuid primary key default gen_random_uuid(),
  negocio_id            uuid not null references public.negocios(id) on delete cascade,
  venta_id              uuid references public.ventas(id) on delete set null,
  tipo                  tipo_comprobante not null default 'boleta',
  serie_numero          text,
  estado                estado_comprobante not null default 'emitido',
  xml_url               text,
  cdr_url               text,
  proveedor_facturacion text,
  created_at            timestamptz not null default now()
);
create index if not exists idx_comprobantes_negocio on public.comprobantes(negocio_id);

-- Descuentos / cupones (idea de UX #8 del research de competencia) ---------
do $$ begin create type tipo_descuento as enum ('porcentaje', 'monto'); exception when duplicate_object then null; end $$;
create table if not exists public.descuentos (
  id            uuid primary key default gen_random_uuid(),
  negocio_id    uuid not null references public.negocios(id) on delete cascade,
  codigo        text not null,
  tipo          tipo_descuento not null default 'porcentaje',
  valor         numeric(10,2) not null check (valor > 0),
  vigencia_desde date,
  vigencia_hasta date,
  limite_usos   integer,
  usos          integer not null default 0,
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists idx_descuentos_negocio_codigo on public.descuentos(negocio_id, upper(codigo));

-- Campañas de email marketing (idea de UX #13) — SOLO scaffold: no hay
-- proveedor de email conectado todavía, `enviados/fallidos/desuscritos`
-- quedan en 0 hasta que se integre uno real (ver docs/pending-task.md).
do $$ begin create type estado_campania as enum ('borrador', 'enviada'); exception when duplicate_object then null; end $$;
create table if not exists public.campanias_email (
  id           uuid primary key default gen_random_uuid(),
  negocio_id   uuid not null references public.negocios(id) on delete cascade,
  nombre       text not null,
  asunto       text not null default '',
  cuerpo       text not null default '',
  estado       estado_campania not null default 'borrador',
  enviados     integer not null default 0,
  fallidos     integer not null default 0,
  desuscritos  integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_campanias_negocio on public.campanias_email(negocio_id);

-- ====== TRIGGERS updated_at (módulo de dominio) ======
do $$
declare t text;
begin
  foreach t in array array['clientes','citas','recetas','productos','inventario','ventas','descuentos','campanias_email','proveedores','cotizaciones'] loop
    execute format(
      'drop trigger if exists trg_%1$s_updated on public.%1$s;
       create trigger trg_%1$s_updated before update on public.%1$s
         for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- ====== RLS: módulo de dominio ======
alter table public.clientes          enable row level security;
alter table public.citas             enable row level security;
alter table public.recetas           enable row level security;
alter table public.productos         enable row level security;
alter table public.inventario        enable row level security;
alter table public.movimientos_stock enable row level security;
alter table public.ventas            enable row level security;
alter table public.venta_items       enable row level security;
alter table public.gastos            enable row level security;
alter table public.comprobantes      enable row level security;
alter table public.descuentos        enable row level security;
alter table public.campanias_email   enable row level security;
alter table public.proveedores       enable row level security;
alter table public.cotizaciones      enable row level security;
alter table public.cotizacion_items  enable row level security;

-- clientes / citas / recetas / productos / ventas / proveedores /
-- cotizaciones: mismo patrón de RLS (lectura para todo el negocio,
-- escritura para quien "puede_gestionar" — administrador o encargado).
do $$
declare t text;
begin
  foreach t in array array['clientes','citas','recetas','productos','ventas','proveedores','cotizaciones'] loop
    execute format('drop policy if exists %1$s_read  on public.%1$s;', t);
    execute format('drop policy if exists %1$s_write on public.%1$s;', t);
    execute format(
      'create policy %1$s_read on public.%1$s for select
         using (negocio_id = public.current_tenant());', t);
    execute format(
      'create policy %1$s_write on public.%1$s for all
         using (public.puede_gestionar() and negocio_id = public.current_tenant())
         with check (public.puede_gestionar() and negocio_id = public.current_tenant());', t);
  end loop;
end $$;

-- inventario (hereda tenant vía productos.negocio_id)
drop policy if exists inventario_read  on public.inventario;
drop policy if exists inventario_write on public.inventario;
create policy inventario_read  on public.inventario for select using (
  exists (select 1 from public.productos p where p.id = inventario.producto_id and p.negocio_id = public.current_tenant()));
create policy inventario_write on public.inventario for all using (
  public.puede_gestionar() and exists (select 1 from public.productos p where p.id = inventario.producto_id and p.negocio_id = public.current_tenant())
) with check (
  public.puede_gestionar() and exists (select 1 from public.productos p where p.id = inventario.producto_id and p.negocio_id = public.current_tenant()));

-- movimientos_stock (solo lectura + insert; nunca update/delete — trazabilidad)
drop policy if exists movstock_read  on public.movimientos_stock;
drop policy if exists movstock_write on public.movimientos_stock;
create policy movstock_read  on public.movimientos_stock for select using (negocio_id = public.current_tenant());
create policy movstock_write on public.movimientos_stock for insert
  with check (public.puede_gestionar() and negocio_id = public.current_tenant());

-- venta_items (hereda tenant vía ventas.negocio_id)
drop policy if exists venta_items_read  on public.venta_items;
drop policy if exists venta_items_write on public.venta_items;
create policy venta_items_read  on public.venta_items for select using (
  exists (select 1 from public.ventas v where v.id = venta_items.venta_id and v.negocio_id = public.current_tenant()));
create policy venta_items_write on public.venta_items for all using (
  public.puede_gestionar() and exists (select 1 from public.ventas v where v.id = venta_items.venta_id and v.negocio_id = public.current_tenant())
) with check (
  public.puede_gestionar() and exists (select 1 from public.ventas v where v.id = venta_items.venta_id and v.negocio_id = public.current_tenant()));

-- cotizacion_items (hereda tenant vía cotizaciones.negocio_id)
drop policy if exists cotizacion_items_read  on public.cotizacion_items;
drop policy if exists cotizacion_items_write on public.cotizacion_items;
create policy cotizacion_items_read  on public.cotizacion_items for select using (
  exists (select 1 from public.cotizaciones q where q.id = cotizacion_items.cotizacion_id and q.negocio_id = public.current_tenant()));
create policy cotizacion_items_write on public.cotizacion_items for all using (
  public.puede_gestionar() and exists (select 1 from public.cotizaciones q where q.id = cotizacion_items.cotizacion_id and q.negocio_id = public.current_tenant())
) with check (
  public.puede_gestionar() and exists (select 1 from public.cotizaciones q where q.id = cotizacion_items.cotizacion_id and q.negocio_id = public.current_tenant()));

-- gastos (administrador, o empleado con permiso granular 'gastos' delegado)
drop policy if exists gastos_admin_all on public.gastos;
create policy gastos_admin_all on public.gastos for all
  using ((public.is_administrador() or public.tiene_permiso('gastos')) and negocio_id = public.current_tenant())
  with check ((public.is_administrador() or public.tiene_permiso('gastos')) and negocio_id = public.current_tenant());

-- comprobantes (lectura para todo el negocio; escritura solo service_role)
drop policy if exists comprobantes_read on public.comprobantes;
create policy comprobantes_read on public.comprobantes for select using (negocio_id = public.current_tenant());

-- descuentos (administrador, o empleado con permiso granular 'descuentos')
drop policy if exists descuentos_read  on public.descuentos;
drop policy if exists descuentos_write on public.descuentos;
create policy descuentos_read on public.descuentos for select using (negocio_id = public.current_tenant());
create policy descuentos_write on public.descuentos for all
  using ((public.is_administrador() or public.tiene_permiso('descuentos')) and negocio_id = public.current_tenant())
  with check ((public.is_administrador() or public.tiene_permiso('descuentos')) and negocio_id = public.current_tenant());

-- campanias_email (administrador, o empleado con permiso granular 'marketing')
drop policy if exists campanias_read  on public.campanias_email;
drop policy if exists campanias_write on public.campanias_email;
create policy campanias_read on public.campanias_email for select using (negocio_id = public.current_tenant());
create policy campanias_write on public.campanias_email for all
  using ((public.is_administrador() or public.tiene_permiso('marketing')) and negocio_id = public.current_tenant())
  with check ((public.is_administrador() or public.tiene_permiso('marketing')) and negocio_id = public.current_tenant());

-- ================================================================
-- AUDIT LOG: registro por triggers de TODAS las escrituras de gestión
-- Auditoría "real" en la DB (no a nivel de app): captura cada insert/update/
-- delete aunque venga del SQL Editor. Solo el administrador de cada negocio
-- lee el suyo; nadie escribe a mano (solo el trigger security definer).
-- ================================================================
create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  ts         timestamptz not null default now(),
  negocio_id uuid,                 -- para filtrar por tenant en la lectura
  actor_id   uuid,                 -- auth.uid() (null si lo hizo cron/service_role)
  accion     text not null,        -- INSERT | UPDATE | DELETE
  tabla      text not null,
  fila_id    text,
  datos_old  jsonb,
  datos_new  jsonb
);
create index if not exists idx_audit_ts       on public.audit_log(ts desc);
create index if not exists idx_audit_tabla    on public.audit_log(tabla);
create index if not exists idx_audit_negocio  on public.audit_log(negocio_id);

create or replace function public.fn_audit()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_old jsonb; v_new jsonb; v_id text; v_negocio uuid;
  sensibles text[] := array['avatar_base64'];
  k text;
begin
  if (tg_op = 'DELETE') then
    v_old := to_jsonb(old); v_id := old.id::text;
  elsif (tg_op = 'INSERT') then
    v_new := to_jsonb(new); v_id := new.id::text;
  else
    v_old := to_jsonb(old); v_new := to_jsonb(new); v_id := new.id::text;
  end if;
  foreach k in array sensibles loop
    if v_old is not null then v_old := v_old - k; end if;
    if v_new is not null then v_new := v_new - k; end if;
  end loop;

  -- negocio_id: de la fila si la tabla lo tiene, si no, del propio actor.
  v_negocio := coalesce(
    (case when v_new is not null then v_new->>'negocio_id' else v_old->>'negocio_id' end)::uuid,
    public.current_tenant()
  );

  insert into public.audit_log (negocio_id, actor_id, accion, tabla, fila_id, datos_old, datos_new)
  values (v_negocio, auth.uid(), tg_op, tg_table_name, v_id, v_old, v_new);
  return null;  -- AFTER trigger
end $$;

revoke execute on function public.fn_audit() from public, anon, authenticated;

do $$
declare t text;
begin
  -- Solo tablas sensibles/financieras del dominio (clientes, recetas, ventas,
  -- gastos) — se omiten movimientos_stock/venta_items/inventario por volumen,
  -- igual que asistencia en el patrón de referencia tramys-rrhh.
  foreach t in array array['negocios','empleados','suscripciones','clientes','recetas','ventas','gastos','descuentos','proveedores','cotizaciones'] loop
    execute format(
      'drop trigger if exists trg_audit_%1$s on public.%1$s;
       create trigger trg_audit_%1$s after insert or update or delete on public.%1$s
         for each row execute function public.fn_audit();', t);
  end loop;
end $$;

alter table public.audit_log enable row level security;
drop policy if exists audit_read on public.audit_log;
create policy audit_read on public.audit_log for select
  using (public.is_administrador() and negocio_id = public.current_tenant());
grant select on public.audit_log to authenticated;
revoke insert, update, delete on public.audit_log from anon, authenticated;

-- ================================================================
-- STORAGE: bucket avatars (opcional — alternativa a empleados.avatar_base64)
-- MVP usa avatar_base64; este bucket queda listo por si se migra a Storage.
-- ================================================================
insert into storage.buckets (id, name, public) values ('avatars','avatars',true)
on conflict (id) do nothing;
drop policy if exists "avatars_upload" on storage.objects;
drop policy if exists "avatars_update" on storage.objects;
drop policy if exists "avatars_delete" on storage.objects;
create policy "avatars_upload" on storage.objects for insert with check (
  bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "avatars_update" on storage.objects for update using (
  bucket_id = 'avatars' and auth.uid() = (storage.foldername(name))[1]::uuid);
create policy "avatars_delete" on storage.objects for delete using (
  bucket_id = 'avatars' and auth.uid() = (storage.foldername(name))[1]::uuid);

-- ================================================================
-- pg_cron: expiración diaria de trials vencidos sin pago (brief §4/§8)
-- ================================================================
create or replace function public.revisar_trials_vencidos()
returns void language plpgsql security definer
set search_path = public as $$
begin
  update public.suscripciones
     set estado = 'vencida'
   where estado = 'trial'
     and trial_fin < current_date;
end $$;

revoke execute on function public.revisar_trials_vencidos() from public, anon, authenticated;

do $$ begin perform cron.unschedule('opticaly_revisar_trials');
exception when others then null; end $$;

select cron.schedule('opticaly_revisar_trials', '0 3 * * *',
  $$ select public.revisar_trials_vencidos(); $$);

-- ================================================================
-- REALTIME + REPLICA IDENTITY FULL
-- ================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'negocios','empleados','suscripciones',
    'clientes','citas','recetas','productos','inventario','movimientos_stock','ventas','venta_items','gastos','comprobantes',
    'descuentos','campanias_email','proveedores','cotizaciones','cotizacion_items'
  ] loop
    if not exists (select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
    execute format('alter table public.%I replica identity full', t);
  end loop;
end $$;

-- ================================================================
-- POST-INSTALACIÓN (manual, una sola vez por ambiente)
-- 1) Pegar este archivo completo en el SQL Editor de Supabase → Run.
-- 2) Confirmar que Realtime quedó habilitado en Database → Replication.
-- 3) Authentication → URL Configuration: añadir <origin>/auth/confirm y
--    <origin>/login/nueva-clave a las Redirect URLs (local y prod).
-- 4) El primer negocio + administrador se crean por el flujo de registro
--    self-service (/api/registro), NO manualmente.
-- 5) Panel admin.dominio (Fase 5): crear tu propio usuario por Authentication
--    → Users → Add user (con contraseña), luego:
--      insert into public.super_admins (id, nombre, email)
--      values ('<UUID-DEL-USER>', 'Tu nombre', 'tu-email@dominio.com');
--    No hay alta self-service para super_admins a propósito.
-- ================================================================

select 'Schema SaaS Óptica (auth + tenant + roles) creado correctamente' as resultado;
