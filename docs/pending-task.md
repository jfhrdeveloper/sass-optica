# Tareas pendientes y bitácora

> Control de estado, decisiones y trabajo pendiente. Una entrada por sesión de trabajo.
> Fechas en formato ISO año-mes-día (`YYYY-MM-DD`).

## Roadmap
- [ ] Fase 1 — Schema multi-tenant en Supabase (`negocios`, `suscripciones`, roles, RLS)
- [ ] Fase 2 — Auth real (3 clientes Supabase, `middleware.ts`, registro self-service)
- [ ] Fase 3 — Landing conectada al registro real (slug picker en vivo)
- [ ] Fase 4 — Integración de pagos Culqi (checkout embebido + webhook + cron de trial)
- [ ] Fase 5 — Panel admin cross-tenant (`admin.dominio`)
- [ ] Validar con 3-5 negocios reales (Puente Piedra / Los Olivos) antes de seguir sumando funciones

## Pendientes activos
- [ ] Decidir permisos exactos de `gastos` para el rol `encargado` (hoy: solo `administrador`)
- [ ] Definir nombre de marca y dominio final (ver brief §12 — Barberly/Dentaly/Materna descartados por conflicto de marca)
- [ ] Instalar `@supabase/supabase-js` + `@supabase/ssr` al arrancar la Fase 2
- [ ] Definir variables de entorno reales (ver `docs/architecture.md` §7)

## Bitácora de sesiones

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
