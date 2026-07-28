# SaaS Óptica

SaaS multi-tenant de gestión para ópticas peruanas (mini-ERP: clientes/pacientes, citas y
recetas, ventas e inventario, gastos, empleados). Un solo despliegue + una sola base de datos
Supabase compartida entre todas las ópticas clientes (tenants), aisladas por `negocio_id` +
RLS — no una instalación por compañía. Cada óptica se registra self-service, obtiene un
subdominio propio, arranca en trial (30 días) y pasa a plan pago vía Culqi.

- **Stack:** Next.js (App Router) · React · TypeScript · Tailwind CSS v4 · **Supabase**
  (PostgreSQL + auth + storage) · **Culqi** (pagos, Yape incluido) · Vercel.
- **Dev:** `npm run dev`
- **Modelo:** multi-tenant real. Ver `docs/architecture.md` para el detalle completo (incluye
  el brief de producto: mercado, roles, pagos, SUNAT, checklist de lanzamiento).

## Documentos relacionados

- **`docs/style-guide.md`** — Estilo visual, tipografía, paleta, componentes, animación, accesibilidad y convenciones de código.
- **`docs/architecture.md`** — Cómo está construido el sistema: stack, capa de datos, rutas, auth, integraciones e invariantes.
- **`docs/pending-task.md`** — Roadmap, bitácora de sesiones y trabajo pendiente.
- **`docs/supabase-schema.sql`** — Fuente única ejecutable del schema de base de datos.
