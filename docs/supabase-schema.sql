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
-- Solo lectura para el administrador del negocio; los cambios de estado los
-- hace service_role vía webhook de Culqi y el cron de expiración de trial.
drop policy if exists suscripciones_admin_read on public.suscripciones;
create policy suscripciones_admin_read on public.suscripciones for select
  using (public.is_administrador() and negocio_id = public.current_tenant());

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
  foreach t in array array['negocios','empleados','suscripciones'] loop
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
  foreach t in array array['negocios','empleados','suscripciones'] loop
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
-- ================================================================

select 'Schema SaaS Óptica (auth + tenant + roles) creado correctamente' as resultado;
