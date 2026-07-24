-- ============================================================================
-- SaaS Óptica — Schema de base de datos (Supabase / PostgreSQL)
-- ----------------------------------------------------------------------------
-- Fuente única ejecutable del modelo de datos. Multi-tenant real: una sola
-- base de datos compartida entre todas las ópticas (tenants), aisladas por
-- negocio_id + RLS. Ver docs/architecture.md para el diseño completo.
--
-- Idempotente: se puede pegar y correr en el SQL Editor varias veces sin
-- romper (IF NOT EXISTS / DO). Cualquier cambio al modelo de datos se hace
-- AQUÍ (no duplicar SQL en los .md).
--
-- ESTADO: esqueleto. La skill `plantillabase-auth` completa la parte de
-- auth/tenant/roles/RLS (negocios, suscripciones, empleados/usuarios,
-- helpers current_tenant()/current_rol(), GRANTs, políticas). Las tablas de
-- dominio (clientes, citas, recetas, productos, ventas, gastos...) se agregan
-- después siguiendo el mismo patrón de negocio_id + RLS.
-- ============================================================================

-- Extensiones ------------------------------------------------------------
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- Ejemplo de tabla idempotente con aislamiento por tenant:
-- create table if not exists public.ejemplo (
--   id          uuid primary key default gen_random_uuid(),
--   negocio_id  uuid not null references public.negocios (id) on delete cascade,
--   creado_en   timestamptz not null default now()
-- );
-- alter table public.ejemplo enable row level security;
