# 🏗️ SaaS Óptica — Arquitectura

> Fuente única de verdad sobre cómo está construido el sistema y por qué.
> No duplicar aquí el estilo visual ni las convenciones de código: eso vive en `docs/style-guide.md`.
> No duplicar el detalle del schema: eso vive en `docs/supabase-schema.sql`.
>
> Brief de producto completo (mercado, roles, pagos, SUNAT, checklist de lanzamiento):
> `brief-saas-proyecto.md` en la raíz del repo.

## 0. Qué es esto
SaaS **multi-tenant** de gestión para ópticas peruanas (pymes de 3-10 trabajadores). Un solo
despliegue + una sola base de datos Supabase **compartida** entre todas las ópticas clientes
(tenants) — no una instalación por compañía. Cada óptica se registra self-service, obtiene un
subdominio propio, arranca en trial (30 días) y pasa a plan pago vía Culqi.

Es un producto **independiente** de otros verticales que el mismo fundador pueda construir a
futuro (dental, veterinaria, ferretería...): no comparte código, base de datos ni deploy con
ellos — cada vertical es un proyecto propio. Sí comparte el patrón de auth/RLS multi-tenant
(`plantillabase-auth`, referencia de producción: proyecto `tramys-rrhh`), adaptado porque aquí
cada negocio ES el tenant (no hay jerarquía de sub-grupos dentro de un owner único).

## 1. Stack y decisiones
| Pieza | Elección | Por qué |
|---|---|---|
| Framework | Next.js (App Router) | Server Actions/Route Handlers + middleware para resolver subdominios |
| Lenguaje | TypeScript | Tipado estático |
| UI | React + Tailwind CSS v4 | Utilidades, rapidez; sin librería de componentes decidida aún |
| **Base de datos** | **Supabase (PostgreSQL), un solo proyecto** | DB compartida multi-tenant + auth + storage en uno |
| **Auth** | **Supabase Auth** | 3 clientes por privilegio (browser/server/admin); login genérico + redirección a subdominio |
| **Pagos** | **Culqi** (checkout embebido, incluye Yape) | Stripe no opera para negocios peruanos locales |
| Facturación electrónica | OSE tipo Nubefact (fase posterior al MVP) | No construir integración directa a SUNAT; delegar en proveedor especializado |
| Hosting | Vercel | Dominio raíz (canónico, sin `www`) + dominio wildcard para subdominios de tenants |

## 2. Regla central de datos
- Multi-tenant con base de datos **compartida**: toda tabla de negocio lleva `negocio_id`.
- **Doble capa de autorización, ambas obligatorias:** middleware (resuelve el tenant por
  subdominio, bloquea el bypass de UI) + RLS en Postgres, filtrando siempre por
  `negocio_id = current_tenant()` (bloquea el bypass de datos). No confiar en una sola.
- El navegador nunca habla con Supabase con la `service_role`; operaciones privilegiadas
  (alta/baja de empleados, cambios de suscripción) viven en Route Handlers server-side.
- Flujo de datos:
  Cliente → middleware (resuelve tenant por hostname) → Server Action / Route Handler → cliente de Supabase (server o admin) → PostgreSQL (RLS por `negocio_id`)
- Regla para features nuevas: un campo nuevo en la DB implica tres sitios a tocar — el tipo
  TS del dato, los mappers (si aplica), y la tabla/RLS en `supabase-schema.sql`.

## 3. Mapa de rutas / endpoints

**Landing** (dominio raíz, pública, indexable):
- `/` — home / hero
- `/precios`
- `/login` — login genérico, sin subdominio todavía (identifica el tenant por email y redirige)
- `/registro` — self-service: nombre del negocio → slug en vivo (✅/❌ estilo Instagram) → crea negocio + admin + trial

**Dashboard** (subdominio del tenant, privada, `noindex`): `[negocio].dominio/dashboard`
- `/dashboard`, `/dashboard/clientes`, `/dashboard/citas`, `/dashboard/productos`,
  `/dashboard/ventas`, `/dashboard/gastos` (solo `administrador`),
  `/dashboard/empleados` (solo `administrador`), `/dashboard/config` (solo `administrador`)

**Admin del SaaS** (subdominio reservado `admin.dominio`, solo el dueño del SaaS, namespace
interno `src/app/admin-panel/*` con su propio sidebar — `AdminShell`/`AdminNav`):
- `/admin-panel` — resumen: KPIs (negocios/trial/pagando/por vencer/MRR estimado por plan) +
  lista de trials que vencen en ≤7 días.
- `/admin-panel/negocios` — tabla completa (búsqueda, filtro por estado incl. "por vencer").
- `/admin-panel/negocios/[id]` — detalle de un negocio: datos de contacto, empleados,
  suscripción, historial de pagos, uso del sistema (frecuencia, día/hora pico, módulos más
  usados — ver `eventos_uso` y `lib/uso.ts`), y la acción de suspender/reactivar
  (`negocios.activo`, reversible, nunca un DELETE — mismo criterio que la "Zona de peligro" del
  dashboard de negocio).
- `/admin-panel/pagos` — historial cross-tenant de `pagos_saas` + gráfico de MRR por mes.
- Todas usan el cliente `admin.ts` (service role) server-side únicamente — nunca se expone al
  navegador.

**API privilegiada** (server-only, `service_role`):
- `/api/registro` — crea negocio + primer usuario admin + suscripción trial (atómico)
- `/api/empleados/invitar`, `/api/empleados/eliminar`
- `/api/webhooks/culqi` — confirma pago, reactiva suscripción, registra el cobro en `pagos_saas`
- `/api/pagos/culqi/cargo` — crea el cargo (vía primaria de pago), reactiva suscripción, registra
  el cobro en `pagos_saas`
- `/api/admin/negocios/toggle-activo` — suspende/reactiva un negocio (solo `super_admins`)

## 4. Autenticación y autorización
- **Supabase Auth**, 3 clientes separados por privilegio: `client.ts` (browser, anon),
  `server.ts` (server, anon + cookies), `admin.ts` (service role, solo server-side).
- Roles (dentro de cada negocio, **planos** — sin scope de sub-grupo, porque el negocio YA es
  el tenant, a diferencia del patrón `tramys-rrhh` que tiene un owner único con sedes):
  - `administrador` (dueño): todo, incluidos reportes financieros y gestión de empleados.
  - `encargado`: stock, ventas, clientes, turnos — sin reportes financieros completos.
  - `trabajador`: solo ventas/atención y consulta de stock.
- Cookie de sesión a nivel de dominio padre (`Domain=.dominio`) para que el login en el
  dominio raíz deje al usuario logueado al redirigir a su subdominio.
- Dónde se valida: `middleware.ts` (resuelve tenant por hostname, exige sesión) + políticas
  RLS en la DB — siempre las dos, defensa en profundidad.
- Alta de usuarios entra siempre con el rol de menor privilegio; el `encargado` (si en algún
  momento gestiona altas) solo dentro de su propio negocio. Se valida en el servidor, nunca
  confiando en el payload del cliente.

## 5. Layout de carpetas y módulos
- `src/app/` → App Router: rutas de landing (dominio raíz) y de dashboard (subdominio),
  diferenciadas por `middleware.ts` según el hostname de cada request.
- `src/middleware.ts` → resuelve landing vs. dashboard vs. admin por hostname; inyecta el
  tenant en el contexto de la request.
- `src/lib/supabase/` → `client.ts` / `server.ts` / `admin.ts`.
- `src/components/providers/` → `SessionProvider`, `DataProvider` (store único + Realtime).
- `src/components/` → UI reutilizable.
- `public/` → assets estáticos. `docs/` → esta documentación.

## 6. Servicios externos e integraciones
| Servicio | Para qué | Quién lo consume |
|---|---|---|
| Supabase | DB (Postgres), Auth, Storage | Toda la app (server-side; el cliente solo vía `client.ts`/`server.ts` con RLS) |
| Culqi | Checkout embebido de suscripciones (tarjeta + Yape) | `/dashboard` (pantalla de pago) y `/api/webhooks/culqi` |
| OSE (Nubefact u otro) | Emisión de comprobantes SUNAT de las suscripciones cobradas | Fase posterior al MVP; disparado tras confirmación de Culqi |
| Vercel | Hosting, dominio wildcard, cron jobs | Deploy único del proyecto |

## 7. Variables de entorno (qué alimenta qué)
| Variable | Módulo que la usa | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente y servidor | Pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente (con RLS) | Pública, segura solo con RLS activo |
| `SUPABASE_SERVICE_ROLE_KEY` | **Solo servidor** | **NUNCA** exponer al cliente / sin prefijo `NEXT_PUBLIC_` |
| `CULQI_PUBLIC_KEY` | Cliente (checkout embebido) | Pública, por ambiente (test/prod) |
| `CULQI_SECRET_KEY` | **Solo servidor** | Confirmar webhook, crear cargos |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Middleware (cliente y servidor) | Dominio raíz para distinguir landing/subdominio/admin |

## 8. SEO / build / despliegue
- **Dominio canónico: sin `www`** (`dominio.pe`, no `www.dominio.pe`) — coherente con que los
  subdominios de tenants cuelgan del dominio raíz, no de `www`. `www` redirige 301 al raíz.
- Landing indexable (sitemap, metadata, OG); dashboard con `noindex` en todas sus rutas.
- Vercel: dominio raíz + dominio wildcard (`*.dominio.pe`) con SSL automático + subdominio
  reservado `admin`.
- Build: `npm run build` → `npm run start`. Dev: `npm run dev`.

## 9. Diagrama general
```
Navegador
   │
   ▼
middleware.ts ── lee hostname
   ├─ dominio raíz        → rutas de landing (pública, indexable)
   ├─ [negocio].dominio   → resuelve tenant, exige sesión → rutas de dashboard
   └─ admin.dominio       → panel del dueño del SaaS (cross-tenant, solo service_role)
   │
   ▼
Server Action / Route Handler
   │
   ▼
Supabase: PostgreSQL (RLS por negocio_id) + Auth + Storage
   │
   ▼
Culqi (checkout embebido) ──webhook──> reactiva suscripción ──> (fase 2) OSE emite comprobante
```

## 10. Invariantes arquitectónicos ("no romper")
- El cliente NUNCA usa la `service_role` de Supabase; esa clave es solo de servidor.
- Toda tabla de negocio tiene `negocio_id` + **RLS activado**, filtrando siempre por
  `negocio_id = current_tenant()`.
- Ninguna credencial/secreto en el cliente (`NEXT_PUBLIC_*` solo para valores públicos).
- El subdominio de un negocio **no se puede cambiar** post-registro (decisión de producto,
  ver brief §2) — bloqueado también a nivel de trigger en la tabla `negocios`, no solo en la UI.
- Alta/baja de empleados siempre vía `/api/*` con `service_role`, nunca insert/delete directo
  desde el cliente autenticado.
- El registro self-service (`/api/registro`) es atómico: si falla cualquier paso (crear
  negocio, crear usuario, crear suscripción trial), no debe quedar un negocio "huérfano" sin
  administrador ni un usuario de Auth sin perfil.
- Las fuentes se cargan vía `next/font` (no `<link>` manual).
