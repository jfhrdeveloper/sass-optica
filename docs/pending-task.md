# Tareas pendientes y bitácora

> Control de estado, decisiones y trabajo pendiente. Una entrada por sesión de trabajo.
> Fechas en formato ISO año-mes-día (`YYYY-MM-DD`).

## Roadmap
- [x] Fase 1 — Schema multi-tenant en Supabase (`negocios`, `suscripciones`, roles, RLS)
- [x] Fase 2 — Auth real (3 clientes Supabase, `proxy.ts`, registro self-service)
- [x] Fase 3 — Landing con las 10 secciones del brief (sin branding/paleta final todavía)
- [x] Fase 4 — Integración de pagos Culqi (checkout embebido + webhook + bloqueo por trial vencido)
- [x] Fase 5 — Panel admin cross-tenant (`admin.dominio`, tabla `super_admins` separada)
- [x] Fase 6 — Módulos de dominio de la óptica (clientes, citas, recetas, productos, ventas, gastos)
- [ ] Validar con 3-5 negocios reales (Puente Piedra / Los Olivos) antes de seguir sumando funciones
- [ ] Conectar la facturación electrónica SUNAT (OSE tipo Nubefact) — fase posterior al MVP, brief §9

**Todas las fases del MVP están construidas y pasan `npm run build`/`npm run lint`.
Nada se ha probado contra credenciales reales (Supabase/Culqi) — ver Pendientes activos.**

## Pendientes activos (bloquean probar el sistema de verdad)
- [ ] Crear el proyecto real en Supabase y pegar `docs/supabase-schema.sql` en el SQL Editor
- [ ] Completar `.env.local` con credenciales reales (Supabase + Culqi) — hoy vacío a propósito
- [ ] Crear el primer `super_admin` a mano (ver POST-INSTALACIÓN al final de `supabase-schema.sql`)
- [ ] Activar cuenta Culqi real (24-48h) y confirmar el shape exacto de su API de cargos/webhooks
      contra la documentación oficial — `/api/pagos/culqi/cargo` y `/api/webhooks/culqi` están
      escritos con la mejor información disponible pero SIN haber sido probados contra Culqi real
- [ ] Authentication → URL Configuration en Supabase: añadir `<origin>/auth/confirm` y
      `<origin>/login/nueva-clave` a las Redirect URLs (local y prod)
- [ ] Probar el flujo completo con subdominios reales (`[slug].dominio.pe`) — en `localhost` la
      cookie de sesión NO comparte dominio entre root y subdominios (ver `cookie-domain.ts`),
      revisar si esto complica probar el flujo login→subdominio en dev local

## Pendientes activos (no bloquean, pero quedan abiertos)
- [ ] Decidir permisos exactos de `gastos` para el rol `encargado` (hoy: solo `administrador`)
- [ ] Definir nombre de marca, dominio final y precio del plan Pro en soles (ver brief §12)
- [ ] Diseñar la landing real (paleta, tipografía, capturas reales) con la skill `ui-ux-pro-max`
      — hoy tiene copy/estructura completos pero placeholders visuales (`[ mockup... ]`)
- [ ] `addVenta` en `DataProvider.tsx` hace 2 escrituras secuenciales (venta + ítems), no una
      transacción real — aceptable para el volumen de una óptica pyme, revisar si se vuelve
      un problema real (ítems huérfanos si la 2ª escritura falla)
- [ ] Suscripción Culqi real (renovación automática) no está implementada — hoy es un cargo
      único que activa 30 días; para cobro recurrente automático hace falta la API de
      Suscripciones/Planes de Culqi, no solo Cargos

## Bitácora de sesiones

### 2026-07-24 (3) — Fases 3 a 6: MVP completo (dominio, landing, Culqi, panel admin)
- **Qué cambió:** a pedido explícito de "haz todas las fases de una vez", se construyeron las
  4 fases restantes en la misma sesión, cada una commiteada por separado y verificada con
  `npm run build` + `npm run lint` antes de pasar a la siguiente:
  1. **Fase 6 (dominio):** se agregaron al schema `clientes`, `citas`, `recetas`, `productos`,
     `inventario`, `movimientos_stock`, `ventas`, `venta_items`, `gastos`, `comprobantes`
     (esqueleto), con el mismo patrón `negocio_id` + RLS que la capa de auth. `DataProvider`
     ampliado con las 8 entidades y sus mutaciones. Páginas CRUD en
     `/dashboard/{clientes,citas,productos,ventas,gastos,empleados}` — patrón "lista +
     formulario inline", sin fichas de detalle separadas ni PDFs/CSV/calendario (fuera de
     alcance del MVP a propósito). `DashboardNav` nueva, oculta rutas admin-only en la UI.
  2. **Fase 3 (landing):** reescrita con las 10 secciones exactas del brief §3 (header, hero,
     prueba social, problema→solución×3, funciones, cómo funciona, precios, FAQ, CTA final,
     footer). Copy completo; visuales son placeholders `[ captura/mockup ]` — falta el diseño
     real con `ui-ux-pro-max` cuando haya marca.
  3. **Fase 4 (Culqi):** `CulqiCheckoutButton` (script v4, checkout embebido sin redirección),
     `/api/pagos/culqi/cargo` (crea el cargo server-side con `CULQI_SECRET_KEY`, reactiva la
     suscripción), `/api/webhooks/culqi` (respaldo para eventos async futuros — sin validar
     firma todavía, no hay credenciales reales contra las cuales probarla). Página
     `/dashboard/facturacion`. El proxy bloquea TODO el dashboard hacia esa página si
     `suscripciones.estado = 'vencida'`. Requirió aflojar la RLS de lectura de `suscripciones`
     (antes solo `administrador`, ahora cualquier empleado del negocio) porque el proxy
     necesita chequear el estado para todos los roles al aplicar el bloqueo.
  4. **Fase 5 (panel admin):** tabla nueva `super_admins` (sin alta self-service, se agrega a
     mano por SQL Editor — ver POST-INSTALACIÓN del schema), separada de `empleados` porque un
     super_admin no pertenece a ningún negocio. El proxy, en el subdominio `admin`, reescribe
     (`NextResponse.rewrite`, transparente para el navegador) hacia el namespace interno
     `src/app/admin-panel/*`, con un route group `(protegido)` para que `/login` quede fuera
     de la guardia de sesión (si no, redirect loop). El dashboard admin es un Server Component
     puro que usa `admin.ts` directo (justificado: su código nunca llega al navegador, misma
     garantía de seguridad que un route handler).
  5. **Bug real encontrado y corregido en el proxy:** varios `redirect`/`rewrite` devolvían un
     `NextResponse` nuevo en vez de reutilizar `supabaseResponse`, perdiendo las cookies de
     refresco de sesión que Supabase pudo haber encolado en `getUser()` — se centralizó en dos
     helpers (`redirigir`/`reescribir`) que copian esas cookies siempre. Bug pre-existía desde
     la Fase 2, no era exclusivo del código nuevo de esta ronda.
  - `npm run build` y `npm run lint` limpios después de cada fase.
- **Por qué:** el usuario pidió explícitamente completar todo el roadmap de una sola vez en
  vez de ir fase por fase con checkpoints.
- **Pendiente:** nada de esto se ha probado contra credenciales reales (Supabase ni Culqi) —
  es la siguiente acción antes de poder demostrar el sistema a un negocio real. Ver
  "Pendientes activos (bloquean probar el sistema de verdad)" arriba.

### 2026-07-24 (2) — Fase 1 y 2: schema multi-tenant + auth real
- **Qué cambió:** con `plantillabase-auth` como base (adaptada — ver diferencias abajo), se
  construyó la capa completa de auth/tenant/roles/suscripciones:
  1. **`docs/supabase-schema.sql`**: tablas `negocios` (tenant, subdominio único con trigger
     que bloquea su cambio post-registro), `empleados` (1:1 con `auth.users`, rol
     `administrador/encargado/trabajador`, `negocio_id` bloqueado tras la asignación inicial),
     `suscripciones` (trial 30 días por defecto, solo lectura para el administrador — la
     escritura queda reservada a `service_role` vía webhook/cron). Helpers RLS
     `current_tenant()`/`current_rol()`/`is_administrador()`/`puede_gestionar()`, GRANTs,
     `audit_log` por triggers, Realtime + `replica identity full`, `pg_cron` diario que vence
     trials. Sin `accesos_temporales` (no aplica a este proyecto).
  2. **`src/lib/supabase/`**: `client.ts`/`server.ts`/`admin.ts` (3 clientes por privilegio) +
     `cookie-domain.ts` (cookie de sesión a nivel de dominio padre para compartirla entre el
     login del dominio raíz y los subdominios de negocio).
  3. **`src/proxy.ts`** (renombrado desde `middleware.ts` — Next.js 16 deprecó esa convención,
     ver `nextjs.org/docs/messages/middleware-to-proxy`): resuelve landing (dominio raíz) vs.
     dashboard (subdominio de negocio, exige sesión + valida que el empleado pertenezca a ESE
     negocio) vs. `admin` (subdominio reservado, sin panel construido todavía). Redirige
     `www` → raíz (301) y, si ya hay sesión en `/login`, redirige directo al subdominio del
     negocio del usuario.
  4. **`/api/registro`** (nuevo — no es parte del patrón base de la skill, que solo cubre
     invitación): registro self-service atómico — crea negocio, usuario de Auth
     (`createUser`, no `inviteUserByEmail`, porque el propio usuario fija su contraseña),
     perfil de `administrador` y suscripción trial; revierte todo si cualquier paso falla.
     `/api/registro/disponibilidad` para el chequeo en vivo del slug (pasa por `service_role`
     porque RLS no deja leer negocios ajenos). `src/lib/slug.ts`: `generarSlug`/
     `validarFormatoSlug`/blacklist de reservados, portados del brief.
  5. **`/api/empleados/invitar` y `/eliminar`**: adaptados para que solo `administrador` (no
     `encargado`) dé de alta/baja, siempre dentro de su propio negocio, siempre con rol de
     menor privilegio.
  6. **Providers**: `DataProvider` (empleados/negocio/suscripción, Realtime) + `SessionProvider`
     (sin impersonación — no aplica aquí) + `Providers`/`HydrationGate`. `src/app/dashboard/`
     (layout con defensa en profundidad vía header `x-negocio-id` + página placeholder que
     confirma negocio/rol/suscripción). Páginas `/login`, `/login/nueva-clave`, `/registro`
     (con el slug picker en vivo) y landing mínima en `/`.
  7. **Bugs propios corregidos en el camino:** un comentario con `*/` sin escapar rompía el
     parser (`add*/update*/delete*` cerraba el bloque de comentario antes de tiempo); un
     regex de tildes con `̀-ͯ` se corrompió al pasar por una herramienta que
     interpreta JSON (se reemplazó por una función que filtra por rango de código Unicode,
     sin depender de escapes `\u` en un literal). Reglas nuevas de lint
     (`react-hooks/set-state-in-effect`, `react-hooks/refs`) obligaron a quitar el patrón
     `cargarRef` (innecesario: `cargar` ya era estable) y a derivar el estado del slug picker
     en vez de fijarlo sincrónicamente dentro del efecto.
  - `npm run build` y `npm run lint` limpios.
- **Diferencia clave con el patrón base de `plantillabase-auth`:** la skill asume un owner
  único con "managers de grupo/sede" (`tenant_id` = sub-grupo dentro del mismo owner). Aquí
  cada negocio YA ES el tenant — no hay ese nivel intermedio, los 3 roles son planos dentro
  de cada negocio.
- **Por qué:** cerrar la base de auth/tenant antes de construir los módulos de dominio de la
  óptica (Fase 6), que dependen de tener `negocio_id` + roles + RLS funcionando de punta a
  punta.
- **Pendiente:** nada de esto se ha probado contra un proyecto Supabase real todavía (falta
  crear el proyecto y pegar el schema — ver Pendientes activos). La landing es una versión
  mínima sin diseño real. Los módulos de dominio (clientes, citas, recetas, productos,
  ventas, gastos) son la siguiente fase.

### 2026-07-24 — Inicialización de documentación + scaffold del proyecto
- **Qué cambió:** se generó la estructura `docs/` (style-guide, architecture, pending-task,
  supabase-schema.sql) con `plantillabase-docs`, y se enlazó desde `CLAUDE.md`. Previo a esto:
  se scaffoldeó el proyecto Next.js (App Router, TypeScript, Tailwind v4) en esta carpeta
  (antes solo tenía `brief-saas-proyecto.md`). `docs/architecture.md` se rellenó con contenido
  real (no placeholders) a partir de una sesión extensa de diseño de arquitectura: modelo
  multi-tenant con `negocio_id` + RLS, subdominios dinámicos por negocio, dominio raíz sin
  `www`, subdominio `admin` reservado para el dueño del SaaS, roles `administrador/encargado/
  trabajador` planos dentro de cada negocio, Culqi para pagos (Stripe descartado por no operar
  en Perú), y facturación SUNAT delegada a un OSE en fase posterior al MVP.
  - Se evaluó primero pivotar el código ya avanzado en un proyecto hermano
    (`proyecto-optica/gestion-optica`, un mini-ERP maquetado con UI completa pero sin
    multi-tenant real) pero se decidió **no tocarlo** y construir el SaaS real aquí, en
    `sass-base`, desde cero.
- **Por qué:** estandarizar la documentación y arrancar el código del SaaS de óptica en esta
  carpeta, que es donde vive el brief de producto y donde el usuario quiere que continúe todo
  el trabajo (decisión explícita: no mezclar con otros proyectos existentes).
- **Pendiente:** rellenar `docs/style-guide.md` con paleta/tipografía reales cuando se defina
  la marca; Fase 1 (schema multi-tenant real en `docs/supabase-schema.sql`, hoy solo
  esqueleto) es el siguiente bloque de trabajo.
