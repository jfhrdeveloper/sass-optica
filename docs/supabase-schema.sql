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
  create type plan_suscripcion as enum ('gratis', 'basico', 'premium');
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
  constraint negocios_subdominio_longitud check (char_length(subdominio) between 3 and 30),
  -- Defensa en profundidad: ColorWell.tsx (src/lib/color.ts) ya valida el
  -- formato hex y el contraste contra texto blanco antes de dejar guardar,
  -- pero eso es solo del lado del cliente — cualquiera con acceso directo a
  -- la tabla (SQL Editor, un futuro endpoint) podría dejar un valor
  -- inválido que luego rompe `style.setProperty('--color-primary', …)` en
  -- HydrationGate.tsx. NULL sigue permitido (paleta por defecto).
  constraint negocios_color_primario_formato check (color_primario is null or color_primario ~ '^#[0-9a-fA-F]{6}$')
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

-- Sucursales (multisedes — opcional, la mayoría de negocios no crea ninguna)
-- ----------------------------------------------------------------------------
-- Un negocio que NUNCA inserta una fila acá sigue funcionando exactamente
-- igual que antes: `sucursal_id` es nullable en todas las tablas que lo usan,
-- y NULL significa "pertenece a la única sede implícita del negocio" (no
-- deuda técnica, un estado permanente y válido). No hay migración retroactiva
-- que le asigne una sucursal a filas existentes.
create table if not exists public.sucursales (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references public.negocios(id) on delete cascade,
  nombre      text not null,
  direccion   text,
  telefono    text,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_sucursales_negocio on public.sucursales(negocio_id);

-- Multisedes es exclusivo del plan Premium. La UI (`/dashboard/sucursales`)
-- ya deshabilita el botón "Nueva sucursal" si el plan no es Premium, pero
-- eso es solo ergonomía — un administrador podría llamar a Supabase directo
-- con su propia sesión y saltarse ese chequeo. Mismo patrón que
-- `bloquear_venta_limite_gratis` (trigger plano, sin security definer: solo
-- lee una fila que el propio tenant ya puede ver bajo RLS) — a diferencia de
-- los permisos por rol (RLS alcanza y sobra ahí), un límite de PLAN sí
-- necesita esta capa server-side, porque es dinero, no solo acceso.
create or replace function public.bloquear_sucursal_sin_premium()
returns trigger language plpgsql as $$
declare
  v_plan plan_suscripcion;
begin
  select plan into v_plan from public.suscripciones where negocio_id = new.negocio_id;
  if v_plan is distinct from 'premium' then
    raise exception 'Multisedes requiere el plan Premium.';
  end if;
  return new;
end $$;

drop trigger if exists trg_sucursales_solo_premium on public.sucursales;
create trigger trg_sucursales_solo_premium
  before insert on public.sucursales
  for each row execute function public.bloquear_sucursal_sin_premium();

-- roles_personalizados (permisos delegables reutilizables, aplicables a
-- varios empleados a la vez) --------------------------------------------------
-- Capa OPCIONAL por encima del rol PRINCIPAL fijo (administrador/encargado/
-- trabajador, columna `rol` de empleados — ese no se toca ni se renombra: la
-- RLS y el proxy dependen de ese enum exacto). El administrador arma un rol
-- personalizado con nombre propio ("Cajero", "Recepción") y decide, módulo
-- por módulo, si ese rol tiene 'ninguno' | 'lectura' | 'escritura' — y lo
-- aplica a varios empleados con un clic (empleados.rol_personalizado_id) en
-- vez de repetir la configuración persona por persona.
--
-- A diferencia de un permiso suelto (siempre aditivo): un empleado CON rol
-- personalizado asignado queda gobernado ENTERAMENTE por lo que ese rol
-- tenga configurado — para un encargado esto SÍ puede restarle acceso que
-- tendría por defecto (ver puede_gestionar()/sin_rol_personalizado() más
-- abajo). Un empleado SIN rol personalizado sigue funcionando exactamente
-- como siempre: encargado con su piso amplio de siempre, trabajador con
-- lectura abierta y escritura nula salvo lo que tenga en su propia columna
-- `empleados.permisos` (legado, ver esa columna).
--
-- Sin distinción de a qué rol principal aplica: el mismo rol personalizado
-- sirve igual para un encargado que para un trabajador — la diferencia de
-- fondo entre ambos (el piso de acceso por defecto SIN rol personalizado)
-- sigue existiendo, pero deja de importar en cuanto se asigna uno.
create table if not exists public.roles_personalizados (
  id         uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  nombre     text not null,
  -- Un valor por módulo delegable (ver src/lib/permisos.ts): 'ninguno'
  -- (default si la clave ni aparece) | 'lectura' | 'escritura'.
  permisos   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_roles_personalizados_negocio on public.roles_personalizados(negocio_id);

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
  -- Permisos LEGADO por empleado (valor por módulo: 'lectura'/'escritura',
  -- ausente = ninguno) — capa por encima del rol PRINCIPAL fijo
  -- (administrador/encargado/trabajador). Se IGNORA por completo si
  -- `rol_personalizado_id` está asignado (ver esa columna y
  -- tiene_permiso_lectura()/tiene_permiso_escritura() más abajo) — sigue
  -- existiendo solo para el caso sin rol personalizado, hoy nada en la UI
  -- escribe acá directo (el flujo real es siempre vía un rol personalizado).
  -- Default '{}' = ningún extra; solo el administrador puede seguir
  -- gestionando empleados/ajustes, eso NUNCA se delega por este campo.
  permisos      jsonb not null default '{}'::jsonb,
  -- Rol personalizado opcional (ver public.roles_personalizados) — si está
  -- asignado, tiene_permiso_lectura()/tiene_permiso_escritura() resuelven
  -- los permisos delegables desde ahí en vez de la columna `permisos` de
  -- arriba, Y deja de aplicar el piso de acceso por defecto del rol
  -- principal (ver puede_gestionar()/sin_rol_personalizado()) — el rol
  -- personalizado pasa a ser la única fuente de verdad para ese empleado.
  rol_personalizado_id uuid references public.roles_personalizados(id) on delete set null,
  -- % de comisión sobre sus propias ventas (estado='pagada'), ver
  -- lib/comisiones.ts. Editable solo por administrador (misma policy
  -- empleados_admin_update de abajo) — gratis, sin RLS nueva.
  comision_pct  numeric(5,2) not null default 0 check (comision_pct >= 0 and comision_pct <= 100),
  -- NULL = ve/gestiona TODAS las sedes del negocio (caso común: negocio sin
  -- multisedes, o un administrador/encargado multi-sede). Fijar una sede
  -- puntual restringe ese empleado a esa sucursal (y a filas sin sede) — ver
  -- current_sucursal() más abajo. A diferencia de negocio_id, sucursal_id SÍ
  -- se puede reasignar libremente (cambiar de sede es operación normal).
  sucursal_id   uuid references public.sucursales(id) on delete set null,
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

-- Un self-update (policy empleados_self_update más abajo, `using (id =
-- auth.uid())`) nunca puede tocar rol/permisos/rol_personalizado_id — esa
-- policy solo filtra POR FILA, no por columna, así que sin este trigger
-- cualquier trabajador o encargado podría auto-ascenderse a administrador
-- (o auto-asignarse un rol personalizado más permisivo) con un UPDATE
-- directo (vía supabase-js) sobre su propia fila, sin pasar por ninguna
-- pantalla. Un administrador gestionando a OTRO empleado entra por
-- empleados_admin_update (auth.uid() distinto de la fila objetivo) y no
-- pasa por acá. service_role (altas/invitaciones, admin.ts) queda exento
-- explícitamente — BYPASSRLS salta las policies pero NO los triggers.
create or replace function public.bloquear_autoescalada_empleado()
returns trigger language plpgsql
set search_path = public as $$
begin
  if (new.rol is distinct from old.rol
      or new.permisos is distinct from old.permisos
      or new.rol_personalizado_id is distinct from old.rol_personalizado_id)
     and auth.uid() = old.id
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'No puedes modificar tu propio rol o permisos.';
  end if;
  return new;
end $$;

drop trigger if exists trg_empleados_lock_privilegios on public.empleados;
create trigger trg_empleados_lock_privilegios
  before update on public.empleados
  for each row execute function public.bloquear_autoescalada_empleado();

-- suscripciones (una por negocio: gratis permanente ↔ trial de 30 días de un
-- plan pago → básico/premium vía Culqi. `estado='trial'` SIEMPRE va con un
-- plan pago (nunca con 'gratis') — lo garantiza el check de abajo. Si el
-- trial vence sin pago, el cron `revertir_trials_a_gratis` (más abajo)
-- vuelve el negocio a plan='gratis'/estado='activa', nunca lo bloquea. -----
create table if not exists public.suscripciones (
  id                     uuid primary key default gen_random_uuid(),
  negocio_id             uuid not null unique references public.negocios(id) on delete cascade,
  plan                   plan_suscripcion not null default 'gratis',
  estado                 estado_suscripcion not null default 'activa',
  trial_inicio           date,
  trial_fin              date,
  fecha_pago_ultimo      date,
  proximo_cobro          date,
  culqi_customer_id      text,
  culqi_subscription_id  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint suscripciones_gratis_sin_trial check (not (plan = 'gratis' and estado = 'trial'))
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

-- pagos_saas (cobros de Culqi a las suscripciones — Fase 5, panel admin) ----
-- Registro individual de cada cobro exitoso: `suscripciones` solo guarda el
-- estado agregado (activa/vencida), esto es "quién pagó, cuánto y cómo" para
-- el panel admin.dominio. Lo insertan /api/pagos/culqi/cargo (vía primaria) y
-- /api/webhooks/culqi (respaldo async) — culqi_cargo_id único evita filas
-- duplicadas si ambos caminos confirman el mismo cargo. Nunca se lee desde el
-- cliente autenticado, solo admin.ts (service_role).
create table if not exists public.pagos_saas (
  id             uuid primary key default gen_random_uuid(),
  negocio_id     uuid not null references public.negocios(id) on delete cascade,
  monto          numeric(10,2) not null,
  moneda         text not null default 'PEN',
  metodo_pago    text,               -- 'tarjeta' | 'yape' | lo que informe Culqi
  culqi_cargo_id text unique,
  estado         text not null default 'exitoso',
  created_at     timestamptz not null default now()
);
create index if not exists idx_pagos_saas_negocio on public.pagos_saas(negocio_id);
create index if not exists idx_pagos_saas_fecha    on public.pagos_saas(created_at desc);

-- eventos_uso (telemetría ligera de actividad — panel admin) ---------------
-- Un evento por cada módulo del dashboard que un empleado visita (ver
-- DashboardShell.tsx, que lo registra al navegar). Responde en admin.dominio
-- a "qué tan seguido usa el sistema este negocio, qué día/hora y qué
-- módulos" — señal de adopción/riesgo de abandono que `suscripciones` (solo
-- estado activa/vencida) no da. Insert-only desde el propio negocio
-- autenticado (cada quien solo puede escribir SU fila, nunca leerla de
-- vuelta); la lectura cross-tenant es exclusiva de admin.ts (service_role).
-- Sin datos personales del empleado — negocio_id + ruta + timestamp alcanzan
-- para el propósito (frecuencia/horario/módulos), y así no hace falta
-- proteger esta tabla como si tuviera PII.
create table if not exists public.eventos_uso (
  id         uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  ruta       text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_eventos_uso_negocio_fecha on public.eventos_uso(negocio_id, created_at desc);
-- Purga de eventos con más de 90 días — no hace falta el historial completo
-- para siempre, solo la ventana reciente que muestra el admin panel.
create index if not exists idx_eventos_uso_fecha on public.eventos_uso(created_at);

-- libro_reclamaciones (D.S. 011-2011-PCE — exigido por INDECOPI) -----------
-- Reclamos/quejas de CUALQUIER consumidor sobre SaaS Óptica (el proveedor
-- del servicio, no un negocio-tenant individual) — NO tiene negocio_id, es
-- global. Alta EXCLUSIVA vía service_role desde /api/libro-reclamaciones
-- (rate-limitado, ver rate-limit.ts): nunca desde el cliente autenticado ni
-- anon directo, mismo criterio deny-all que pagos_saas, porque contiene PII
-- de un tercero (el reclamante) que ningún negocio-tenant debe poder leer.
-- `numero` es el correlativo que la ley exige entregarle al consumidor como
-- constancia (se genera solo, vía secuencia — nunca a mano ni por conteo,
-- que tendría condición de carrera).
create sequence if not exists public.libro_reclamaciones_numero_seq start 1;

create table if not exists public.libro_reclamaciones (
  id                           uuid primary key default gen_random_uuid(),
  numero                       text not null unique
    default ('RC-' || lpad(nextval('public.libro_reclamaciones_numero_seq')::text, 6, '0')),
  tipo                         text not null check (tipo in ('reclamo', 'queja')),
  consumidor_nombres           text not null,
  consumidor_apellidos         text not null,
  consumidor_documento_tipo    text not null,
  consumidor_documento_numero  text not null,
  consumidor_domicilio         text not null,
  consumidor_telefono          text,
  consumidor_email             text not null,
  es_menor_edad                boolean not null default false,
  -- Obligatorio (a nivel de aplicación) si es_menor_edad — la hoja oficial
  -- de INDECOPI exige el nombre del padre/madre/apoderado en ese caso.
  apoderado_nombre             text,
  bien_tipo                    text not null check (bien_tipo in ('producto', 'servicio')),
  bien_descripcion             text not null,
  monto_reclamado              numeric(10,2),
  detalle                      text not null,
  pedido                       text not null,
  estado                       text not null default 'pendiente' check (estado in ('pendiente', 'atendido')),
  respuesta                    text,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);
create trigger trg_libro_reclamaciones_updated_at
  before update on public.libro_reclamaciones
  for each row execute function public.set_updated_at();
create index if not exists idx_libro_reclamaciones_fecha on public.libro_reclamaciones(created_at desc);

-- notas_soporte (bitácora interna del dueño del SaaS sobre un negocio-tenant) --
-- Registro de contacto/soporte que un super_admin deja en la ficha de un
-- negocio (admin.dominio/negocios/[id]) — "llamó por tal motivo", "se le
-- avisó que vence el trial", etc. Alta EXCLUSIVA vía service_role desde
-- /api/admin/negocios/notas: mismo criterio deny-all que pagos_saas, ningún
-- negocio-tenant debe poder leer ni escribir esto sobre sí mismo.
create table if not exists public.notas_soporte (
  id         uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  autor_id   uuid not null references public.super_admins(id),
  texto      text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_notas_soporte_negocio on public.notas_soporte(negocio_id);

-- mejoras_sugeridas / mejoras_votos (buzón de mejoras + votación) ----------
-- A diferencia de TODO lo demás en este schema (aislado por negocio_id vía
-- RLS), esto es DELIBERADAMENTE cross-tenant: todas las ópticas ven y votan
-- el mismo tablero de mejoras, para que el dueño del SaaS priorice según
-- demanda real. Solo `administrador` propone (decisión de producto, evita
-- spam); cualquier rol puede votar, pero el voto es POR NEGOCIO (1 óptica =
-- 1 voto por mejora, sin importar cuántos empleados tenga — así una óptica
-- grande no pesa más que una chica). Anónimo entre ópticas (una no ve qué
-- otra propuso o votó tal cosa) — la vista pública de abajo nunca expone
-- negocio_id — pero el dueño del SaaS SÍ lo ve completo en admin-panel
-- (vía service_role, que ignora RLS como en el resto del panel).
create table if not exists public.mejoras_sugeridas (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references public.negocios(id) on delete cascade,
  titulo      text not null,
  descripcion text,
  estado      text not null default 'pendiente'
    check (estado in ('pendiente', 'planificado', 'en_progreso', 'completado', 'rechazado')),
  created_at  timestamptz not null default now()
);
create index if not exists idx_mejoras_sugeridas_estado on public.mejoras_sugeridas(estado);

create table if not exists public.mejoras_votos (
  mejora_id  uuid not null references public.mejoras_sugeridas(id) on delete cascade,
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (mejora_id, negocio_id)
);

alter table public.mejoras_sugeridas enable row level security;
drop policy if exists mejoras_sugeridas_select_propia on public.mejoras_sugeridas;
create policy mejoras_sugeridas_select_propia on public.mejoras_sugeridas for select
  using (negocio_id = public.current_tenant());
drop policy if exists mejoras_sugeridas_insert on public.mejoras_sugeridas;
create policy mejoras_sugeridas_insert on public.mejoras_sugeridas for insert
  with check (public.is_administrador() and negocio_id = public.current_tenant());
-- Sin policy de update/delete: cambiar el estado (pendiente→planificado→...)
-- es exclusivo del dueño del SaaS vía service_role (admin-panel), nunca del
-- negocio que la propuso.

alter table public.mejoras_votos enable row level security;
drop policy if exists mejoras_votos_select_propio on public.mejoras_votos;
create policy mejoras_votos_select_propio on public.mejoras_votos for select
  using (negocio_id = public.current_tenant());
drop policy if exists mejoras_votos_insert on public.mejoras_votos;
create policy mejoras_votos_insert on public.mejoras_votos for insert
  with check (negocio_id = public.current_tenant());
drop policy if exists mejoras_votos_delete on public.mejoras_votos;
create policy mejoras_votos_delete on public.mejoras_votos for delete
  using (negocio_id = public.current_tenant());

-- Vista pública anonimizada: el único camino de lectura del tablero
-- compartido. Nunca expone negocio_id de un tercero — `es_mia`/`ya_vote` se
-- resuelven contra current_tenant() del que consulta, no contra un negocio_id
-- crudo. Al NO ser `security_invoker` (opción de Postgres 15+, default
-- false), corre con el rol dueño de la vista y así puede leer TODAS las filas
-- de mejoras_sugeridas/mejoras_votos cruzando tenants — el filtrado real de
-- qué se expone lo hace esta vista, ya no la RLS restrictiva de las tablas
-- base (que sigue ahí para bloquear el acceso directo a esas tablas).
create or replace view public.mejoras_publicas as
select
  m.id,
  m.titulo,
  m.descripcion,
  m.estado,
  m.created_at,
  (m.negocio_id = public.current_tenant()) as es_mia,
  coalesce(v.total_votos, 0)::int as total_votos,
  exists (
    select 1 from public.mejoras_votos mv
    where mv.mejora_id = m.id and mv.negocio_id = public.current_tenant()
  ) as yo_vote
from public.mejoras_sugeridas m
left join (
  select mejora_id, count(*) as total_votos
  from public.mejoras_votos
  group by mejora_id
) v on v.mejora_id = m.id;

grant select on public.mejoras_publicas to authenticated;

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

-- Sede FIJA del empleado (empleados.sucursal_id), no una preferencia de
-- sesión/cookie: Postgres no puede leer headers de la request dentro de una
-- función SQL, así que sigue el mismo patrón exacto que current_tenant().
-- NULL = el empleado ve/gestiona todas las sedes del negocio (caso común).
-- El selector de sede del topbar es solo un filtro de conveniencia en la UI
-- sobre datos que esta función ya aprobó — nunca reemplaza este chequeo.
create or replace function public.current_sucursal()
returns uuid language sql stable security definer
set search_path = public as $$ select sucursal_id from public.empleados where id = auth.uid(); $$;

create or replace function public.current_rol()
returns rol_empleado language sql stable security definer
set search_path = public as $$ select rol from public.empleados where id = auth.uid(); $$;

create or replace function public.is_administrador()
returns boolean language sql stable security definer
set search_path = public as $$ select coalesce(public.current_rol() = 'administrador', false); $$;

-- ¿Este empleado NO tiene un rol personalizado asignado? (ver
-- public.roles_personalizados). Cuando es true, aplica el piso de acceso
-- por defecto de su rol PRINCIPAL (puede_gestionar() + las policies de
-- lectura abiertas de abajo) — el comportamiento de siempre. Cuando es
-- false, su acceso a los módulos delegables lo define ENTERAMENTE el rol
-- personalizado (tiene_permiso_lectura()/tiene_permiso_escritura()), sin
-- excepción ni para encargado — es lo que permite RESTRINGIR a un encargado
-- por debajo de su piso normal, no solo sumarle cosas.
create or replace function public.sin_rol_personalizado()
returns boolean language sql stable security definer
set search_path = public as $$
  select coalesce(
    (select rol_personalizado_id is null from public.empleados where id = auth.uid()),
    false
  );
$$;

-- "Gestión operativa" = administrador, o encargado SIN rol personalizado
-- asignado (stock/ventas/clientes/citas, sin reportes financieros completos
-- — ver brief §5). Un encargado CON rol personalizado deja de pasar acá
-- automáticamente en cuanto se le asigna uno — desde ahí su acceso lo
-- decide exclusivamente tiene_permiso_escritura(), igual que un trabajador.
create or replace function public.puede_gestionar()
returns boolean language sql stable security definer
set search_path = public as $$
  select coalesce(
    public.current_rol() = 'administrador'
    or (public.current_rol() = 'encargado' and public.sin_rol_personalizado()),
    false
  );
$$;

-- Valor crudo del permiso para un módulo — 'ninguno' (o NULL si la clave ni
-- aparece) | 'lectura' | 'escritura'. Resuelve desde el rol personalizado
-- asignado si hay uno; si no, desde los permisos propios (legado) del
-- empleado — ver el comentario de esa columna. Nunca se combinan las dos
-- fuentes: si hay rol personalizado, la columna `permisos` del empleado se
-- ignora por completo.
create or replace function public.nivel_permiso(clave text)
returns text language sql stable security definer
set search_path = public as $$
  select
    case
      when e.rol_personalizado_id is not null then rp.permisos ->> clave
      else e.permisos ->> clave
    end
  from public.empleados e
  left join public.roles_personalizados rp on rp.id = e.rol_personalizado_id
  where e.id = auth.uid();
$$;

-- Un administrador SIEMPRE pasa cualquier chequeo (is_administrador() ya lo
-- cubre en cada policy con `or`) — estas dos funciones solo resuelven el
-- caso "no soy admin, ¿qué nivel tengo en este módulo puntual?".
-- 'escritura' implica lectura (no hay forma de dar escritura sin lectura).
create or replace function public.tiene_permiso_lectura(clave text)
returns boolean language sql stable security definer
set search_path = public as $$
  select coalesce(public.nivel_permiso(clave) in ('lectura', 'escritura'), false);
$$;

create or replace function public.tiene_permiso_escritura(clave text)
returns boolean language sql stable security definer
set search_path = public as $$
  select coalesce(public.nivel_permiso(clave) = 'escritura', false);
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
alter table public.pagos_saas    enable row level security;
-- pagos_saas: sin policies para anon/authenticated a propósito — deny-all,
-- solo service_role (admin.ts) lo lee/escribe, nunca el cliente autenticado.
alter table public.eventos_uso   enable row level security;
-- eventos_uso: insert-only para el propio negocio (registra su propia
-- navegación), sin policy de select — ni siquiera el negocio que lo generó
-- puede leerlo de vuelta. La lectura cross-tenant es exclusiva de admin.ts
-- (service_role), igual que pagos_saas.
drop policy if exists eventos_uso_insert on public.eventos_uso;
create policy eventos_uso_insert on public.eventos_uso for insert
  with check (negocio_id = public.current_tenant());

alter table public.libro_reclamaciones enable row level security;
-- libro_reclamaciones: sin policies para anon/authenticated a propósito —
-- deny-all, igual que pagos_saas. El alta pasa por service_role
-- (/api/libro-reclamaciones) y la lectura/respuesta por service_role
-- (admin-panel, membresía en super_admins) — nunca el cliente autenticado.

alter table public.notas_soporte enable row level security;
-- notas_soporte: sin policies para anon/authenticated a propósito —
-- deny-all, igual que pagos_saas. Alta y lectura exclusivas de service_role
-- (admin-panel, membresía en super_admins) — nunca un negocio-tenant.

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

-- ====== ROLES_PERSONALIZADOS ======
-- Exclusivo del administrador — encargado/trabajador nunca necesitan LEER el
-- rol personalizado en sí (sus permisos efectivos se resuelven server-side
-- vía tiene_permiso_lectura()/tiene_permiso_escritura(), no consultando
-- esta tabla desde el cliente).
alter table public.roles_personalizados enable row level security;
drop policy if exists roles_personalizados_admin on public.roles_personalizados;
create policy roles_personalizados_admin on public.roles_personalizados for all
  using (public.is_administrador() and negocio_id = public.current_tenant())
  with check (public.is_administrador() and negocio_id = public.current_tenant());

-- ====== SUSCRIPCIONES ======
-- Lectura para TODO empleado del negocio (no solo administrador): el proxy
-- necesita poder chequear el estado para cualquier rol, para bloquear el
-- acceso si una suscripción pagada queda `vencida` (cobro recurrente sin
-- renovar — brief §4/§10) — sin esto, RLS le ocultaría la fila a encargado/
-- trabajador y el bloqueo nunca se activaría para ellos. Un trial de plan
-- pago que vence SIN pago no pasa por acá: vuelve solo a plan='gratis' (ver
-- el cron `revertir_trials_a_gratis` más abajo), nunca bloquea el acceso.
-- Los cambios de plan/estado los hace SIEMPRE service_role, vía
-- /api/registro, /api/suscripcion/probar-plan, webhook/cargo de Culqi y el
-- cron de reversión de trial — nunca el cliente.
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
  -- Papelera (soft delete): NULL = activo. "Eliminar" desde la UI solo
  -- setea esta columna; la fila se purga sola a los 30 días
  -- (purgar_clientes_papelera(), más abajo) o antes si alguien la borra a
  -- mano desde la papelera. citas/recetas siguen en cascada al PURGAR, no
  -- al mandar a papelera (ver comentario en purgar_clientes_papelera).
  eliminado_en     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_clientes_negocio    on public.clientes(negocio_id);
create index if not exists idx_clientes_eliminado  on public.clientes(eliminado_en) where eliminado_en is not null;
create index if not exists idx_clientes_apellidos  on public.clientes(apellidos);

-- Citas / turnos ----------------------------------------------------------
create table if not exists public.citas (
  id           uuid primary key default gen_random_uuid(),
  negocio_id   uuid not null references public.negocios(id) on delete cascade,
  cliente_id   uuid not null references public.clientes(id) on delete cascade,
  empleado_id  uuid references public.empleados(id) on delete set null,
  sucursal_id  uuid references public.sucursales(id) on delete set null,
  fecha_hora   timestamptz not null,
  motivo       text,
  estado       estado_cita not null default 'programada',
  notas        text,
  -- Duración en minutos: NULL = no especificada (la UI asume 30 min). Se
  -- llena al agendar arrastrando en la vista Día/N días/Semana (de la hora
  -- X a la hora Y) o eligiéndola a mano en el formulario.
  duracion_min integer,
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

-- Exámenes optométricos (agudeza visual, queratometría, anamnesis) ---------
-- Tabla separada de `recetas` a propósito: un examen no siempre coincide 1:1
-- con una receta nueva (control sin cambio de graduación, o reposición de
-- lentes sin examen nuevo) — acoplarlos forzaría dos eventos clínicos
-- distintos a ocurrir siempre juntos.
create table if not exists public.examenes_optometricos (
  id           uuid primary key default gen_random_uuid(),
  negocio_id   uuid not null references public.negocios(id) on delete cascade,
  cliente_id   uuid not null references public.clientes(id) on delete cascade,
  cita_id      uuid references public.citas(id) on delete set null,
  receta_id    uuid references public.recetas(id) on delete set null,
  empleado_id  uuid references public.empleados(id) on delete set null,
  fecha        date not null default current_date,
  -- Agudeza visual como texto: la notación clínica real ("20/20", "20/40 -1",
  -- "CD 3m") no es una fracción numérica pura. sc = sin corrección, cc = con
  -- corrección.
  od_av_sc     text, od_av_cc text,
  oi_av_sc     text, oi_av_cc text,
  od_k1        numeric(5,2), od_k2 numeric(5,2), od_eje_k smallint check (od_eje_k between 0 and 180),
  oi_k1        numeric(5,2), oi_k2 numeric(5,2), oi_eje_k smallint check (oi_eje_k between 0 and 180),
  anamnesis    text,
  notas        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_examenes_negocio on public.examenes_optometricos(negocio_id);
create index if not exists idx_examenes_cliente on public.examenes_optometricos(cliente_id);

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
  -- Parámetros propios de lentes de contacto (curva base y potencia en
  -- dioptrías, diámetro en mm) — solo tienen sentido si categoria =
  -- 'lente_contacto'; el check evita cargarlos por error en una montura/luna.
  curva_base    numeric(4,2),
  diametro      numeric(4,2),
  potencia      numeric(5,2),
  imagen_url    text,
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint productos_lente_contacto_campos check (
    categoria = 'lente_contacto' or (curva_base is null and diametro is null and potencia is null)
  )
);
create unique index if not exists idx_productos_negocio_codigo on public.productos(negocio_id, codigo) where codigo is not null;
create index if not exists idx_productos_negocio   on public.productos(negocio_id);
create index if not exists idx_productos_categoria on public.productos(categoria);

-- Inventario (stock 1:1 — hereda el tenant vía producto_id) ----------------
-- Sigue siendo la fuente de verdad para negocios SIN multisedes (la
-- mayoría). Si el negocio crea su primera sucursal, el stock pasa a vivir
-- en `stock_sucursal` (Fase B de Multisedes) — ver comentario ahí.
create table if not exists public.inventario (
  producto_id   uuid primary key references public.productos(id) on delete cascade,
  stock_actual  integer not null default 0,
  stock_minimo  integer not null default 0,
  ubicacion     text,
  updated_at    timestamptz not null default now()
);

-- Stock por sede (Multisedes Fase B) — tabla nueva, `inventario` NO se
-- migra ni se borra. Regla binaria aplicada en DataProvider.tsx: si el
-- negocio no tiene ninguna sucursal, todo sigue leyendo/escribiendo
-- `inventario` exactamente como antes (cero cambio de comportamiento). Si
-- tiene al menos una, el stock por producto pasa a ser la SUMA de sus filas
-- acá, y `ajustarStock` escribe en la fila de la sede correspondiente en
-- vez de en `inventario`.
create table if not exists public.stock_sucursal (
  producto_id   uuid not null references public.productos(id) on delete cascade,
  sucursal_id   uuid not null references public.sucursales(id) on delete cascade,
  stock_actual  integer not null default 0,
  stock_minimo  integer not null default 0,
  ubicacion     text,
  updated_at    timestamptz not null default now(),
  primary key (producto_id, sucursal_id)
);

-- Movimientos de stock (trazabilidad — brief §6) --------------------------
create table if not exists public.movimientos_stock (
  id           uuid primary key default gen_random_uuid(),
  negocio_id   uuid not null references public.negocios(id) on delete cascade,
  producto_id  uuid not null references public.productos(id) on delete cascade,
  sucursal_id  uuid references public.sucursales(id) on delete set null,
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
  sucursal_id  uuid references public.sucursales(id) on delete set null,
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

-- Límite de 30 ventas/mes del plan Gratis (freemium) — `ventas` se inserta
-- directo desde el navegador (DataProvider.addVenta), a diferencia de
-- empleados (que pasa 100% por /api/empleados/invitar con service_role), así
-- que acá SÍ hace falta un trigger: RLS aísla tenants entre sí, pero no
-- protege límites de negocio dentro del propio tenant — un check solo en el
-- cliente sería bypasseable con la propia sesión del negocio. Mismo patrón
-- que bloquear_cambio_subdominio/bloquear_autoescalada_empleado (trigger
-- plano, sin security definer: solo lee filas que el propio tenant ya puede
-- ver bajo RLS). ------------------------------------------------------------
create or replace function public.bloquear_venta_limite_gratis()
returns trigger language plpgsql as $$
declare
  v_plan plan_suscripcion;
  v_conteo integer;
begin
  select plan into v_plan from public.suscripciones where negocio_id = new.negocio_id;
  if v_plan = 'gratis' then
    select count(*) into v_conteo
      from public.ventas
     where negocio_id = new.negocio_id
       and estado <> 'anulada'
       and date_trunc('month', fecha) = date_trunc('month', new.fecha);
    if v_conteo >= 30 then
      raise exception 'Llegaste al límite de 30 ventas del mes en el plan Gratis.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_ventas_limite_gratis on public.ventas;
create trigger trg_ventas_limite_gratis
  before insert on public.ventas
  for each row execute function public.bloquear_venta_limite_gratis();

-- Órdenes de laboratorio (seguimiento del armado de lentes) ----------------
-- `cancelado` es el 8vo estado (no pedido explícitamente) — mismo criterio
-- que estado_venta tiene 'anulada' y estado_cotizacion tiene 'rechazada':
-- sin un estado de salida para "el laboratorio no pudo hacerlo", la única
-- alternativa sería borrar la fila y perder la trazabilidad.
do $$ begin create type estado_orden_laboratorio as enum (
  'generado','enviado','en_proceso','terminado','en_transito','recibido','entregado','cancelado'
); exception when duplicate_object then null; end $$;

create table if not exists public.ordenes_laboratorio (
  id                   uuid primary key default gen_random_uuid(),
  negocio_id           uuid not null references public.negocios(id) on delete cascade,
  venta_id             uuid references public.ventas(id) on delete set null,
  venta_item_id        uuid references public.venta_items(id) on delete set null,
  cliente_id           uuid references public.clientes(id) on delete set null,
  receta_id            uuid references public.recetas(id) on delete set null,
  empleado_id          uuid references public.empleados(id) on delete set null,
  sucursal_origen_id   uuid references public.sucursales(id) on delete set null,
  sucursal_destino_id  uuid references public.sucursales(id) on delete set null,
  laboratorio_nombre   text,
  estado               estado_orden_laboratorio not null default 'generado',
  fecha_generado       timestamptz not null default now(),
  fecha_estimada       date,
  avisado_whatsapp_en  timestamptz,
  notas                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists idx_ordenes_lab_negocio on public.ordenes_laboratorio(negocio_id);
create index if not exists idx_ordenes_lab_estado   on public.ordenes_laboratorio(estado);

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
-- Caja (apertura/cierre diario, cuadre por método de pago) ----------------
do $$ begin create type estado_caja as enum ('abierta','cerrada'); exception when duplicate_object then null; end $$;

create table if not exists public.cajas (
  id                       uuid primary key default gen_random_uuid(),
  negocio_id               uuid not null references public.negocios(id) on delete cascade,
  sucursal_id              uuid references public.sucursales(id) on delete set null,
  empleado_apertura_id     uuid references public.empleados(id) on delete set null,
  empleado_cierre_id       uuid references public.empleados(id) on delete set null,
  fecha_apertura           timestamptz not null default now(),
  fecha_cierre             timestamptz,
  monto_inicial            numeric(10,2) not null default 0,
  -- Desglose del monto inicial por método/ítem al momento de abrir la caja
  -- (ej. ya había un saldo en Yape antes de empezar el turno, o un fondo fijo
  -- aparte del efectivo) — array de {metodo, monto} escrito por la UI de
  -- apertura, `monto_inicial` de arriba es SIEMPRE la suma de este array
  -- (calculada en el cliente, no en la DB). Solo el/los ítems con
  -- metodo='efectivo' participan del cuadre físico (ver lib/caja.ts);
  -- el resto es puramente informativo, igual que el resto de esta tabla no
  -- reconcilia medios electrónicos. `[]` en cajas antiguas antes de esta
  -- columna: el monto_inicial de esas filas se sigue tratando como 100%
  -- efectivo (comportamiento anterior, sin migración retroactiva).
  desglose_apertura        jsonb not null default '[]'::jsonb,
  -- Snapshot por método de pago al momento del cierre (calculado sobre
  -- `ventas` del rango y congelado acá vía lib/caja.ts) — así el historial
  -- no cambia si una venta de ese período se anula después del cierre.
  total_efectivo           numeric(10,2) not null default 0,
  total_tarjeta            numeric(10,2) not null default 0,
  total_yape               numeric(10,2) not null default 0,
  total_plin               numeric(10,2) not null default 0,
  total_transferencia      numeric(10,2) not null default 0,
  -- Solo el efectivo se cuenta físicamente; los medios electrónicos se
  -- reconcilian contra el banco/POS, fuera de alcance de este módulo.
  monto_efectivo_esperado  numeric(10,2) not null default 0,
  monto_efectivo_contado   numeric(10,2),
  diferencia               numeric(10,2) generated always as (monto_efectivo_contado - monto_efectivo_esperado) stored,
  estado                   estado_caja not null default 'abierta',
  notas                    text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists idx_cajas_negocio on public.cajas(negocio_id);
create index if not exists idx_cajas_estado  on public.cajas(estado);
-- Como máximo una caja abierta por sede (o por negocio entero, si no usa
-- sedes) a la vez — evita doble apertura por doble click o dos pestañas.
create unique index if not exists idx_cajas_una_abierta
  on public.cajas(negocio_id, coalesce(sucursal_id, '00000000-0000-0000-0000-000000000000'))
  where estado = 'abierta';

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
do $$ begin create type ambito_descuento as enum ('cotizaciones', 'ventas', 'ambos'); exception when duplicate_object then null; end $$;
create table if not exists public.descuentos (
  id            uuid primary key default gen_random_uuid(),
  negocio_id    uuid not null references public.negocios(id) on delete cascade,
  codigo        text not null,
  tipo          tipo_descuento not null default 'porcentaje',
  valor         numeric(10,2) not null check (valor > 0),
  -- A qué se puede aplicar el cupón: solo cotizaciones, solo ventas directas,
  -- o ambos. Sin esto no había forma de restringir dónde vale un código.
  aplica_a      ambito_descuento not null default 'ambos',
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
  foreach t in array array['sucursales','clientes','citas','recetas','examenes_optometricos','productos','inventario','ventas','ordenes_laboratorio','cajas','descuentos','campanias_email','proveedores','cotizaciones'] loop
    execute format(
      'drop trigger if exists trg_%1$s_updated on public.%1$s;
       create trigger trg_%1$s_updated before update on public.%1$s
         for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- ====== RLS: módulo de dominio ======
alter table public.sucursales        enable row level security;
alter table public.clientes          enable row level security;
alter table public.citas             enable row level security;
alter table public.recetas           enable row level security;
alter table public.examenes_optometricos enable row level security;
alter table public.productos         enable row level security;
alter table public.inventario        enable row level security;
alter table public.movimientos_stock enable row level security;
alter table public.ventas            enable row level security;
alter table public.venta_items       enable row level security;
alter table public.ordenes_laboratorio enable row level security;
alter table public.cajas             enable row level security;
alter table public.gastos            enable row level security;
alter table public.comprobantes      enable row level security;
alter table public.descuentos        enable row level security;
alter table public.campanias_email   enable row level security;
alter table public.proveedores       enable row level security;
alter table public.cotizaciones      enable row level security;
alter table public.cotizacion_items  enable row level security;

-- sucursales: gestionar sedes es ESTRUCTURAL (como empleados), no operativo
-- — is_administrador() a secas, sin puede_gestionar() ni permiso delegable.
drop policy if exists sucursales_read  on public.sucursales;
drop policy if exists sucursales_write on public.sucursales;
create policy sucursales_read on public.sucursales for select using (negocio_id = public.current_tenant());
create policy sucursales_write on public.sucursales for all
  using (public.is_administrador() and negocio_id = public.current_tenant())
  with check (public.is_administrador() and negocio_id = public.current_tenant());

-- clientes / recetas / examenes_optometricos / productos / proveedores /
-- cotizaciones: lectura abierta SOLO sin rol personalizado asignado (el
-- piso de siempre — ver sin_rol_personalizado()); con uno asignado, la
-- lectura pasa a exigir tiene_permiso_lectura(). Escritura: puede_gestionar()
-- (administrador, o encargado SIN rol personalizado) O
-- tiene_permiso_escritura() del módulo. recetas/examenes_optometricos
-- comparten la clave 'clientes' — son parte de la misma ficha del paciente
-- en la UI, no un módulo delegable aparte. citas/ventas quedan FUERA de
-- este loop a propósito: llevan además el filtro de sede (ver policies
-- dedicadas más abajo).
do $$
declare t text; clave text;
begin
  foreach t in array array['clientes','recetas','examenes_optometricos','productos','proveedores','cotizaciones'] loop
    clave := case t when 'recetas' then 'clientes' when 'examenes_optometricos' then 'clientes' else t end;
    execute format('drop policy if exists %1$s_read  on public.%1$s;', t);
    execute format('drop policy if exists %1$s_write on public.%1$s;', t);
    execute format(
      'create policy %1$s_read on public.%1$s for select
         using ((public.sin_rol_personalizado() or public.tiene_permiso_lectura(%2$L)) and negocio_id = public.current_tenant());', t, clave);
    execute format(
      'create policy %1$s_write on public.%1$s for all
         using ((public.puede_gestionar() or public.tiene_permiso_escritura(%2$L)) and negocio_id = public.current_tenant())
         with check ((public.puede_gestionar() or public.tiene_permiso_escritura(%2$L)) and negocio_id = public.current_tenant());', t, clave);
  end loop;
end $$;

-- citas / ventas: mismo patrón que el loop genérico (clave = nombre de
-- tabla) + un filtro de sede adicional. `current_sucursal() is null` cubre
-- el caso común (negocio sin multisedes, o empleado con acceso a todas las
-- sedes) — la fila también pasa si SU PROPIA sucursal_id es null (dato
-- histórico o sin sede asignada) o si coincide exactamente con la sede del
-- empleado. Si esta condición se escribe sin el primer `is null`, un
-- negocio de una sola sede (el caso más común) queda sin poder ver ni
-- escribir ninguna cita/venta — probar contra Postgres real antes de dar
-- por buena cualquier cambio acá.
do $$
declare t text;
begin
  foreach t in array array['citas','ventas'] loop
    execute format('drop policy if exists %1$s_read  on public.%1$s;', t);
    execute format('drop policy if exists %1$s_write on public.%1$s;', t);
    execute format(
      'create policy %1$s_read on public.%1$s for select
         using (
           (public.sin_rol_personalizado() or public.tiene_permiso_lectura(%1$L)) and negocio_id = public.current_tenant()
           and (public.current_sucursal() is null or sucursal_id is null or sucursal_id = public.current_sucursal())
         );', t);
    execute format(
      'create policy %1$s_write on public.%1$s for all
         using (
           (public.puede_gestionar() or public.tiene_permiso_escritura(%1$L)) and negocio_id = public.current_tenant()
           and (public.current_sucursal() is null or sucursal_id is null or sucursal_id = public.current_sucursal())
         )
         with check (
           (public.puede_gestionar() or public.tiene_permiso_escritura(%1$L)) and negocio_id = public.current_tenant()
           and (public.current_sucursal() is null or sucursal_id is null or sucursal_id = public.current_sucursal())
         );', t);
  end loop;
end $$;

-- ordenes_laboratorio: OPERATIVO (como citas/ventas). Lectura abierta solo
-- sin rol personalizado (cualquier empleado debe poder consultar el estado
-- si un cliente llama preguntando — eso sigue así por defecto); con un rol
-- personalizado asignado, pasa a exigir tiene_permiso_lectura('laboratorio').
-- Escritura (cambiar el estado): puede_gestionar() O
-- tiene_permiso_escritura('laboratorio') — pensado para extender el acceso
-- a un trabajador puntual (ej. recepción) sin ascenderlo de rol.
drop policy if exists ordenes_lab_read  on public.ordenes_laboratorio;
drop policy if exists ordenes_lab_write on public.ordenes_laboratorio;
create policy ordenes_lab_read on public.ordenes_laboratorio for select
  using ((public.sin_rol_personalizado() or public.tiene_permiso_lectura('laboratorio')) and negocio_id = public.current_tenant());
create policy ordenes_lab_write on public.ordenes_laboratorio for all
  using ((public.puede_gestionar() or public.tiene_permiso_escritura('laboratorio')) and negocio_id = public.current_tenant())
  with check ((public.puede_gestionar() or public.tiene_permiso_escritura('laboratorio')) and negocio_id = public.current_tenant());

-- cajas: mismo criterio OPERATIVO que ordenes_laboratorio — clave propia
-- 'caja', separada de 'gastos'. Antes compartían clave (ambas se
-- delegaban con el mismo checkbox "Gastos y caja"), pero el PISO por
-- defecto de cada una es distinto: cajas es operativo (puede_gestionar(),
-- un encargado sin rol personalizado ya puede abrir/cerrar caja) mientras
-- que la tabla gastos NUNCA tuvo ese piso ni para encargado (ver más abajo)
-- — compartir clave habría hecho que activar "Gastos" para un encargado
-- con rol personalizado tocara sin querer el acceso a Caja, o viceversa.
drop policy if exists cajas_read  on public.cajas;
drop policy if exists cajas_write on public.cajas;
create policy cajas_read on public.cajas for select
  using ((public.sin_rol_personalizado() or public.tiene_permiso_lectura('caja')) and negocio_id = public.current_tenant());
create policy cajas_write on public.cajas for all
  using ((public.puede_gestionar() or public.tiene_permiso_escritura('caja')) and negocio_id = public.current_tenant())
  with check ((public.puede_gestionar() or public.tiene_permiso_escritura('caja')) and negocio_id = public.current_tenant());

-- inventario (hereda tenant vía productos.negocio_id) — mismo permiso
-- delegable 'productos' que la tabla productos: ajustar stock es parte de
-- gestionar ese módulo, no algo aparte.
drop policy if exists inventario_read  on public.inventario;
drop policy if exists inventario_write on public.inventario;
create policy inventario_read  on public.inventario for select using (
  (public.sin_rol_personalizado() or public.tiene_permiso_lectura('productos'))
  and exists (select 1 from public.productos p where p.id = inventario.producto_id and p.negocio_id = public.current_tenant()));
create policy inventario_write on public.inventario for all using (
  (public.puede_gestionar() or public.tiene_permiso_escritura('productos')) and exists (select 1 from public.productos p where p.id = inventario.producto_id and p.negocio_id = public.current_tenant())
) with check (
  (public.puede_gestionar() or public.tiene_permiso_escritura('productos')) and exists (select 1 from public.productos p where p.id = inventario.producto_id and p.negocio_id = public.current_tenant()));

-- stock_sucursal (Multisedes Fase B) — hereda tenant vía productos.negocio_id,
-- + el mismo filtro de sede que citas/ventas + el permiso delegable 'productos'.
alter table public.stock_sucursal enable row level security;
drop policy if exists stock_sucursal_read  on public.stock_sucursal;
drop policy if exists stock_sucursal_write on public.stock_sucursal;
create policy stock_sucursal_read on public.stock_sucursal for select using (
  (public.sin_rol_personalizado() or public.tiene_permiso_lectura('productos'))
  and exists (select 1 from public.productos p where p.id = stock_sucursal.producto_id and p.negocio_id = public.current_tenant())
  and (public.current_sucursal() is null or sucursal_id = public.current_sucursal())
);
create policy stock_sucursal_write on public.stock_sucursal for all using (
  (public.puede_gestionar() or public.tiene_permiso_escritura('productos'))
  and exists (select 1 from public.productos p where p.id = stock_sucursal.producto_id and p.negocio_id = public.current_tenant())
  and (public.current_sucursal() is null or sucursal_id = public.current_sucursal())
) with check (
  (public.puede_gestionar() or public.tiene_permiso_escritura('productos'))
  and exists (select 1 from public.productos p where p.id = stock_sucursal.producto_id and p.negocio_id = public.current_tenant())
  and (public.current_sucursal() is null or sucursal_id = public.current_sucursal())
);

-- movimientos_stock (solo lectura + insert; nunca update/delete — trazabilidad)
-- — mismo permiso delegable 'productos' que inventario/stock_sucursal.
drop policy if exists movstock_read  on public.movimientos_stock;
drop policy if exists movstock_write on public.movimientos_stock;
create policy movstock_read  on public.movimientos_stock for select using (
  (public.sin_rol_personalizado() or public.tiene_permiso_lectura('productos')) and negocio_id = public.current_tenant());
create policy movstock_write on public.movimientos_stock for insert
  with check ((public.puede_gestionar() or public.tiene_permiso_escritura('productos')) and negocio_id = public.current_tenant());

-- venta_items (hereda tenant vía ventas.negocio_id) — mismo permiso
-- delegable 'ventas' que la tabla ventas: sin esto, un trabajador con
-- 'ventas' en escritura podría crear la venta pero no cargarle productos.
drop policy if exists venta_items_read  on public.venta_items;
drop policy if exists venta_items_write on public.venta_items;
create policy venta_items_read  on public.venta_items for select using (
  (public.sin_rol_personalizado() or public.tiene_permiso_lectura('ventas'))
  and exists (select 1 from public.ventas v where v.id = venta_items.venta_id and v.negocio_id = public.current_tenant()));
create policy venta_items_write on public.venta_items for all using (
  (public.puede_gestionar() or public.tiene_permiso_escritura('ventas')) and exists (select 1 from public.ventas v where v.id = venta_items.venta_id and v.negocio_id = public.current_tenant())
) with check (
  (public.puede_gestionar() or public.tiene_permiso_escritura('ventas')) and exists (select 1 from public.ventas v where v.id = venta_items.venta_id and v.negocio_id = public.current_tenant()));

-- cotizacion_items (hereda tenant vía cotizaciones.negocio_id) — mismo
-- permiso delegable 'cotizaciones' que la tabla cotizaciones.
drop policy if exists cotizacion_items_read  on public.cotizacion_items;
drop policy if exists cotizacion_items_write on public.cotizacion_items;
create policy cotizacion_items_read  on public.cotizacion_items for select using (
  (public.sin_rol_personalizado() or public.tiene_permiso_lectura('cotizaciones'))
  and exists (select 1 from public.cotizaciones q where q.id = cotizacion_items.cotizacion_id and q.negocio_id = public.current_tenant()));
create policy cotizacion_items_write on public.cotizacion_items for all using (
  (public.puede_gestionar() or public.tiene_permiso_escritura('cotizaciones')) and exists (select 1 from public.cotizaciones q where q.id = cotizacion_items.cotizacion_id and q.negocio_id = public.current_tenant())
) with check (
  (public.puede_gestionar() or public.tiene_permiso_escritura('cotizaciones')) and exists (select 1 from public.cotizaciones q where q.id = cotizacion_items.cotizacion_id and q.negocio_id = public.current_tenant()));

-- gastos: SIN piso por defecto para nadie salvo administrador (ni siquiera
-- un encargado sin rol personalizado lee esto gratis — a diferencia de
-- todo lo de arriba, esta tabla nunca tuvo lectura universal, ver brief §5:
-- "sin reportes financieros" para encargado/trabajador). Separado en
-- read/write (antes era una sola policy "for all") para poder dar lectura
-- sin escritura — ej. un encargado que solo debe PODER VER el historial de
-- gastos, sin poder cargar uno nuevo.
drop policy if exists gastos_admin_all on public.gastos;
drop policy if exists gastos_read  on public.gastos;
drop policy if exists gastos_write on public.gastos;
create policy gastos_read on public.gastos for select
  using ((public.is_administrador() or public.tiene_permiso_lectura('gastos')) and negocio_id = public.current_tenant());
create policy gastos_write on public.gastos for all
  using ((public.is_administrador() or public.tiene_permiso_escritura('gastos')) and negocio_id = public.current_tenant())
  with check ((public.is_administrador() or public.tiene_permiso_escritura('gastos')) and negocio_id = public.current_tenant());

-- comprobantes (lectura para todo el negocio; escritura solo service_role)
drop policy if exists comprobantes_read on public.comprobantes;
create policy comprobantes_read on public.comprobantes for select using (negocio_id = public.current_tenant());

-- descuentos: mismo criterio que gastos (sin piso por defecto salvo admin).
drop policy if exists descuentos_read  on public.descuentos;
drop policy if exists descuentos_write on public.descuentos;
create policy descuentos_read on public.descuentos for select
  using ((public.is_administrador() or public.tiene_permiso_lectura('descuentos')) and negocio_id = public.current_tenant());
create policy descuentos_write on public.descuentos for all
  using ((public.is_administrador() or public.tiene_permiso_escritura('descuentos')) and negocio_id = public.current_tenant())
  with check ((public.is_administrador() or public.tiene_permiso_escritura('descuentos')) and negocio_id = public.current_tenant());

-- campanias_email: mismo criterio que gastos/descuentos. Sin UI propia
-- todavía (/dashboard/marketing no existe en el proyecto), se deja
-- consistente con el resto igual — no hace falta que exista la pantalla
-- para que la RLS esté bien.
drop policy if exists campanias_read  on public.campanias_email;
drop policy if exists campanias_write on public.campanias_email;
create policy campanias_read on public.campanias_email for select
  using ((public.is_administrador() or public.tiene_permiso_lectura('marketing')) and negocio_id = public.current_tenant());
create policy campanias_write on public.campanias_email for all
  using ((public.is_administrador() or public.tiene_permiso_escritura('marketing')) and negocio_id = public.current_tenant())
  with check ((public.is_administrador() or public.tiene_permiso_escritura('marketing')) and negocio_id = public.current_tenant());

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
  foreach t in array array['negocios','empleados','suscripciones','sucursales','clientes','recetas','examenes_optometricos','ventas','cajas','gastos','descuentos','proveedores','cotizaciones'] loop
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
-- pg_cron: reversión diaria de trials de plan pago vencidos sin pago
-- (freemium — brief §4/§8). Un trial que vence sin pago NUNCA bloquea el
-- sistema: vuelve al negocio al plan Gratis permanente, con los límites de
-- siempre. `vencida` queda reservado para el futuro (cobro recurrente que
-- deja de renovarse, todavía no implementado) — este cron nunca produce ese
-- estado.
-- ================================================================
create or replace function public.revertir_trials_a_gratis()
returns void language plpgsql security definer
set search_path = public as $$
begin
  update public.suscripciones
     set plan = 'gratis', estado = 'activa', trial_inicio = null, trial_fin = null
   where estado = 'trial'
     and trial_fin < current_date;
end $$;

revoke execute on function public.revertir_trials_a_gratis() from public, anon, authenticated;

do $$ begin perform cron.unschedule('opticaly_revisar_trials');
exception when others then null; end $$;
do $$ begin perform cron.unschedule('opticaly_revertir_trials_gratis');
exception when others then null; end $$;

select cron.schedule('opticaly_revertir_trials_gratis', '0 3 * * *',
  $$ select public.revertir_trials_a_gratis(); $$);

-- ================================================================
-- pg_cron: purga diaria de la papelera de clientes (más de 30 días
-- eliminados) — el DELETE real dispara la cascada a citas/recetas y queda
-- registrado en audit_log vía trg_audit_clientes, así que la purga sigue
-- siendo trazable aunque ya no se pueda restaurar.
-- ================================================================
create or replace function public.purgar_clientes_papelera()
returns void language plpgsql security definer
set search_path = public as $$
begin
  delete from public.clientes
   where eliminado_en is not null
     and eliminado_en < now() - interval '30 days';
end $$;

revoke execute on function public.purgar_clientes_papelera() from public, anon, authenticated;

do $$ begin perform cron.unschedule('opticaly_purgar_clientes_papelera');
exception when others then null; end $$;

select cron.schedule('opticaly_purgar_clientes_papelera', '0 4 * * *',
  $$ select public.purgar_clientes_papelera(); $$);

-- ================================================================
-- pg_cron: purga diaria de eventos_uso con más de 90 días (telemetría
-- ligera, no necesita retención larga — el admin panel solo muestra las
-- últimas semanas)
-- ================================================================
create or replace function public.purgar_eventos_uso_viejos()
returns void language plpgsql security definer
set search_path = public as $$
begin
  delete from public.eventos_uso where created_at < now() - interval '90 days';
end $$;

revoke execute on function public.purgar_eventos_uso_viejos() from public, anon, authenticated;

do $$ begin perform cron.unschedule('opticaly_purgar_eventos_uso');
exception when others then null; end $$;

select cron.schedule('opticaly_purgar_eventos_uso', '0 5 * * *',
  $$ select public.purgar_eventos_uso_viejos(); $$);

-- ================================================================
-- REALTIME + REPLICA IDENTITY FULL
-- ================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'negocios','empleados','suscripciones','sucursales',
    'clientes','citas','recetas','examenes_optometricos','productos','inventario','stock_sucursal','movimientos_stock','ventas','venta_items','ordenes_laboratorio','cajas','gastos','comprobantes',
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
