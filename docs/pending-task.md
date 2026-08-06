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
- [ ] Activar cuenta Culqi real (24-48h, requiere que el usuario complete el KYC: RUC, datos
      bancarios — no delegable) y confirmar el shape exacto de su API de cargos/webhooks contra la
      documentación oficial — `/api/pagos/culqi/cargo` y `/api/webhooks/culqi` están escritos con
      la mejor información disponible pero SIN haber sido probados contra Culqi real. El lado de
      código que SÍ se pudo avanzar sin cuenta real (sesión 2026-07-28 (11)): el checkout ahora
      cobra el monto real de Básico/Premium × mensual/anual (antes era un monto fijo de S/49
      desconectado de `lib/precios.ts`) y activa el plan correcto en `suscripciones.plan` (antes
      siempre ponía "premium" sin importar qué se pagó) — ver detalle en esa entrada de bitácora.
- [ ] Authentication → URL Configuration en Supabase: añadir `<origin>/auth/confirm`,
      `<origin>/auth/callback` (nuevo, ver bitácora 2026-07-24 (11)) y
      `<origin>/login/nueva-clave` a las Redirect URLs (local y prod)
- [ ] Habilitar el proveedor Google en Supabase (Authentication → Providers): pegar Client ID/
      Secret de un proyecto en Google Cloud Console, con `https://<proyecto>.supabase.co/auth/v1/callback`
      whitelisteado ahí. El código (botones "Continuar/Registrarse con Google", `/auth/callback`,
      `/registro/completar`) ya está escrito y compila, pero sin este paso manual Supabase
      rechaza el `signInWithOAuth({ provider: "google" })` — mismo tipo de pendiente que Culqi.
- [ ] Probar el flujo completo con subdominios reales (`[slug].dominio.pe`) — en `localhost` la
      cookie de sesión NO comparte dominio entre root y subdominios (ver `cookie-domain.ts`),
      revisar si esto complica probar el flujo login→subdominio en dev local
- [ ] Configurar rate limiting real en Vercel Firewall una vez desplegado y enlazado (`vercel
      link`) — hoy `src/lib/rate-limit.ts` da una protección best-effort en memoria (por
      instancia, no compartida), ver bitácora 2026-07-28 (13). Comandos listos para pegar:
      ```
      vercel firewall rules add "Rate limit registro" \
        --condition '{"type":"path","op":"eq","value":"/api/registro"}' \
        --action rate_limit --rate-limit-window 600 --rate-limit-requests 5 \
        --rate-limit-keys ip --rate-limit-action deny --yes
      vercel firewall rules add "Rate limit cargo Culqi" \
        --condition '{"type":"path","op":"eq","value":"/api/pagos/culqi/cargo"}' \
        --action rate_limit --rate-limit-window 300 --rate-limit-requests 10 \
        --rate-limit-keys ip --rate-limit-action deny --yes
      vercel firewall publish --yes
      ```
      Seguir el rollout escalonado recomendado (log → preview → producción) antes de publicar en
      `deny` directo si el tráfico real es incierto.
- [ ] **Analítica (sesión 2026-08-02 (25)) — dejado a propósito para cuando el proyecto pase a
      producción, no antes:**
      - Crear cuenta gratis en posthog.com, pegar `NEXT_PUBLIC_POSTHOG_KEY` en `.env.local` (hoy
        vacío a propósito → `AnalyticsProvider` no inicializa nada sin esto).
      - `vercel link` / deploy real del proyecto (hoy `sass-optica` no existe en la cuenta de
        Vercel del usuario) para que `<Analytics />` (Vercel Analytics) empiece a mandar datos —
        el componente ya está en el layout raíz, solo necesita el sitio desplegado ahí.
      - Con datos reales entrando, armar el embudo Landing→Registro→Pago desde el panel propio de
        PostHog (configuración, no código).

## Pendientes activos (no bloquean, pero quedan abiertos)
- [x] Decidir permisos exactos de `gastos` para el rol `encargado` — resuelto de forma más
      general de lo pedido: permisos granulares delegables por empleado (`empleados.permisos`),
      ver bitácora 2026-07-24 (8). `gastos` sigue siendo admin-only por defecto, pero el
      administrador ahora puede delegarlo puntualmente sin cambiar el rol fijo.
- [x] Precio de los planes definido en soles — Básico S/89.90/mes (S/899.00/año) y Premium
      S/149.90/mes (S/1,499.00/año, = facturación SUNAT), ver bitácora 2026-07-24 (12).
      El patrón "precio oculto tras WhatsApp" (bitácora (8)) quedó retirado — ya no depende
      de `WHATSAPP_NUMERO`. Sigue pendiente: nombre de marca y dominio final (brief §12).
- [x] Paleta/tipografía/estilo de componentes definidos (ver `docs/style-guide.md` y bitácora
      2026-07-24 (4)) — sigue faltando: logo real (ya hay UI para subirlo en Ajustes), nombre de
      marca final, y capturas reales reemplazando los placeholders `[ mockup/captura ]` de la landing
- [ ] `addVenta` en `DataProvider.tsx` hace 2 escrituras secuenciales (venta + ítems), no una
      transacción real — aceptable para el volumen de una óptica pyme, revisar si se vuelve
      un problema real (ítems huérfanos si la 2ª escritura falla)
- [ ] Suscripción Culqi real (renovación automática) no está implementada — hoy es un cargo
      único que activa 30 días; para cobro recurrente automático hace falta la API de
      Suscripciones/Planes de Culqi, no solo Cargos
- [ ] Campañas de email (`/dashboard/marketing`) son SOLO scaffold — no hay proveedor de email
      conectado (Resend/Postmark vía Marketplace de Vercel); "Enviar" no manda correos reales
      todavía, ver bitácora (8)
- [ ] Gestión de `super_admins` sigue siendo manual por SQL Editor a propósito (ver bitácora
      2026-07-25 (1)) — no hay UI para dar de alta/baja accesos de este nivel, es deliberadamente
      de mayor fricción que el resto del alta de usuarios del proyecto
- [ ] **Revisión legal profesional de `/legal`** — los textos de Términos y Política de privacidad
      existen y están redactados según la Ley N° 29733, pero NO los revisó un abogado. Es
      obligatorio antes de operar con clientes reales: se tratan datos de salud (graduaciones y
      recetas), que la ley clasifica como dato sensible con protección reforzada.
- [x] Datos de contacto reales cargados en `src/lib/contacto.ts` (WhatsApp `51931314659`,
      correo `jfhrdeveloper@gmail.com`) — ver bitácora 2026-07-25 (7)
- [x] Oferta anual: resuelto con una unión discriminada (`OFERTA_ANUAL`) que hace imposible
      configurar descuento Y meses gratis a la vez. Activo hoy: `{ tipo: "meses_gratis", meses: 2 }`
- [x] **RUC definido**: RUC 10 `10708343931` (persona natural), cargado en `src/lib/contacto.ts`
      y usado en el Libro de Reclamaciones (ver bitácora 2026-07-29 (15)). Sigue abierto, pero ya
      no bloquea nada: confirmar con un contador si conviene migrar a RUC 20 (EIRL/SAC) más
      adelante por la separación de patrimonio (se custodian datos de salud de terceros), y qué
      nombre comercial ve el cliente en el descriptor de cobro de Culqi.
- [ ] Tests de RLS (aislamiento entre ópticas) — el riesgo real del producto sigue sin cobertura;
      necesita el proyecto Supabase creado para poder correrlos. **Ahora es más urgente**: la RLS
      de `citas`/`ventas`/`stock_sucursal` (Multisedes, bitácora 2026-07-31) agregó una condición
      nueva (`current_sucursal() is null or sucursal_id is null or sucursal_id = current_sucursal()`)
      que, si está mal escrita, rompe el acceso de TODOS los negocios de una sola sede — probar
      contra Postgres real antes de dar por buena esa migración es el primer test de RLS a correr.
- [x] **Multisedes — UI de reparto de stock** al crear la primera sucursal de un negocio que YA
      tiene stock cargado: `SucursalesPage` ahora, tras crear la PRIMERA sucursal (y solo esa vez),
      abre un segundo `SlideOver` con cada producto con stock y un input para repartirlo a la sede
      nueva (por defecto, el stock completo; editable a un reparto parcial; "Omitir por ahora" para
      no asignar nada). Usa la función nueva `repartirStockInicial` en `DataProvider.tsx`, que
      escribe valores ABSOLUTOS por producto en `stock_sucursal` (no un delta como `ajustarStock`,
      que hubiera duplicado el stock — ver comentario junto a la función). Lo que se deja en 0 queda
      sin asignar a ninguna sede a propósito, nunca un default silencioso.
- [x] Selector de sede del topbar (`DashboardTopbar.tsx`) — se elevó `sucursalFiltro`/
      `setSucursalFiltro` de un hook local a `DataProvider`/`useData()` para que cualquier página
      pueda leerlo. `citas` y `ventas` ahora FILTRAN sus listas por la sede elegida ahí (una cita o
      venta sin `sucursalId` sigue mostrándose bajo cualquier filtro — nunca desaparece, mismo
      criterio que el reparto de stock). Ambos formularios (agendar cita / nueva venta) ahora tienen
      un campo "Sede" (oculto si el negocio no tiene sucursales), con default = la sede fija del
      empleado si la tiene, si no la que esté elegida en el topbar.
- [ ] **Descubierto al conectar el filtro de sede (2026-08-01)**: `addVenta`/`anularVenta` en
      `DataProvider.tsx` llaman a `ajustarStock(...)` para descontar/devolver stock SIN pasarle
      `sucursalId` (aunque la venta en sí ya quede etiquetada con la sede elegida en el formulario).
      Mientras el negocio no tenga sucursales esto es exactamente el comportamiento de siempre (cero
      impacto). Pero en cuanto tiene al menos una, cada venta sigue descontando del `inventario`
      global en vez de la fila de `stock_sucursal` de la sede donde se vendió — el stock por sede
      queda congelado en lo que se repartió inicialmente y deja de reflejar las ventas reales de esa
      sede. Falta decidir de qué sede descontar (¿la de la venta? ¿la del empleado?) y pasarla a esos
      dos `ajustarStock(...)`.

## Ideas de UX de research de competencia (OkVet / Finegym) — ✅ LAS 13 IMPLEMENTADAS
Research hecho en vivo contra las apps reales (landing + señal de cuenta creada + dashboard
logueado de Finegym vía Playwright, y análisis de landing de OkVet). A pedido explícito del
usuario, las 13 ideas se implementaron en la sesión 2026-07-24 (8) — **incluidos los ítems 9 y
11, que originalmente se habían marcado como "no recomendados"** (ver el detalle de cada uno y
el porqué del cambio de criterio en la nota de cada ítem):

1. ✅ **Checklist de onboarding en el dashboard** — `OnboardingChecklist.tsx`, 6 tareas derivadas
   de datos reales (sin campo nuevo de "onboarding completo" en la DB), visible en `/dashboard`.
2. ✅ **Panel lateral deslizante para las altas** — `SlideOver.tsx`, reemplaza el formulario
   inline en clientes/citas/productos/gastos(alta)/empleados/descuentos/marketing.
3. ✅ **Flujos de alta en 2 pasos** — `Stepper.tsx` + wizard de 2 pasos en clientes y productos
   (los formularios más largos); el resto no lo necesitaba por ser corto.
4. ✅ **Filtros como selects en la cabecera** — citas (estado + rango fechas), productos
   (categoría + estado), ventas (método de pago + rango fechas), gastos (categoría + rango
   fechas), clientes (en riesgo / al día).
5. ✅ **Estado Activo/Borrador en productos** — el campo `activo` ya existía en el schema; ahora
   tiene badge clickeable + filtro en la UI.
6. ✅ **"Zona de peligro"** — nueva página `/dashboard/ajustes`, con "Desactivar negocio"
   (`negocios.activo=false`, reversible por soporte) en vez de un DELETE real.
7. ✅ **Precio del plan Pro por botón de WhatsApp** — landing (`src/app/page.tsx`),
   `WHATSAPP_NUMERO` sigue siendo placeholder (ver pendiente arriba).
8. ✅ Descuentos/cupones (`/dashboard/descuentos`, tabla `descuentos`), personalización de marca
   — logo + color primario — en Ajustes (aplicado vía CSS var en `HydrationGate.tsx`), badge
   "En riesgo" en clientes (sin cita hace más de 180 días, solo si ya tiene historial).
9. ✅ Permisos granulares por empleado — **implementado como capa ADITIVA sobre los 3 roles
   fijos, no como reemplazo** (columna `empleados.permisos` jsonb, claves `gastos`/
   `descuentos`/`marketing`; gestión de empleados/ajustes sigue siendo SIEMPRE exclusiva del
   `administrador`, nunca delegable). Esto evita la razón original por la que no se recomendaba
   (tirar abajo el modelo de roles del brief) mientras cubre el caso de uso real: un
   administrador delegando un módulo puntual sin ascender a nadie de rol.
10. ✅ **Feature-gating "candado visible"** — `FeatureGateBanner.tsx`, aplicado al módulo de
    facturación SUNAT en `/dashboard/facturacion` (banner + formulario visible en modo lectura).
11. ✅ Nav superior con dropdowns por hover — **`TopNav.tsx` reemplazó el sidebar** (`DashboardNav`
    fue eliminado). Colapsa a menú plano en mobile. Cambio de criterio respecto a la
    recomendación original: el usuario pidió explícitamente el reemplazo pese a la advertencia
    de que el sidebar agrupado era más simple en mobile — a vigilar cómo se comporta en pantallas
    angostas reales.
12. ✅ Onboarding vía tooltip + stepper — `CoachTooltip.tsx`, complementa el checklist (ítem 1)
    apuntando a una sola acción a la vez, cierre persistido por negocio en localStorage.
13. ✅ Campañas de email (`/dashboard/marketing`, tabla `campanias_email`) — **scaffold sin envío
    real** (falta conectar un proveedor de email, ver pendiente arriba) + banner de changelog
    (`ChangelogBanner.tsx`) en el dashboard.

**Nota operativa del research (no es UX, es proceso):** el login de OkVet exige captcha —
no se puede automatizar con Playwright sin intervención humana. El patrón que funcionó: abrir
Chromium en modo visible (`headless: false`) con el formulario ya prellenado, el usuario
resuelve el captcha y cierra cualquier modal bloqueante a mano, y el script detecta el cambio
de URL / la desaparición del modal para continuar solo. Script de referencia:
`okvet2-explore.js` en el scratchpad de la sesión (no versionado, es herramienta de research).

## Bitácora de sesiones

### 2026-08-06 (26) — Edición de citas/recetas/exámenes desde la ficha del cliente + agrupamiento de solapes en la agenda
- **Qué cambió:**
  1. **Ficha de cliente — pestañas Citas/Recetas/Exámenes editables**: antes solo se gestionaban
     desde sus páginas principales (`/dashboard/citas`, etc.); ahora cada pestaña de la ficha
     permite editar y eliminar directo, con el mismo patrón de deshacer por toast que ya usa el
     resto del dashboard. De paso: paginación de "seguimientos" en la ficha (reemplaza el "+N más"
     colapsable por un `Pagination` de 4 por página), `EstadoCitaBadge` extraído como componente
     compartido (antes duplicado en varios lugares) y `SettingsTabs` ganó la variante `gridMobile2`.
  2. **Agenda (Día/3 días/5 días/Semana) — citas solapadas**: hasta ahora, cuando varias citas
     caían a la misma hora, se repartían en columnas cada vez más angostas sin límite. En desktop,
     desde 4+ solapes las que sobran ahora se fusionan en un chip "+N más" que abre el mismo
     panel/popover de lista que ya existía en la vista Mes (sidebar en desktop, popover flotante en
     mobile). En mobile va más lejos: cada franja horaria se agrupa por solape REAL (no por el
     máximo del día completo, que angostaba citas sueltas sin necesidad) — una cita sola queda
     legible a ancho completo, y cualquier solape de 2+ colapsa en un cúmulo de puntos de color por
     estado (mismo idioma visual que los puntitos de Mes), tocarlo abre la lista.
  3. Se evaluó imitar el patrón de Google Calendar (columnas infinitas sin fusionar, texto que
     desaparece cuando no hay espacio, apoyo en la vista Lista para el detalle) pero se descartó
     para este producto: para el volumen real de una óptica (pocas citas simultáneas) el panel
     agrupado da mejor "cuántas hay de un vistazo" sin perder tap-target ni legibilidad.
  4. Se quitó la hora del texto de los chips de la agenda (Día/3/5 días/Semana) — la posición
     vertical en la grilla ya la indica, era ruido que le quitaba espacio al nombre; sigue
     disponible en el tooltip (`title`) al pasar el cursor.
  - Verificado tras cada bloque: `npx tsc --noEmit`, `npm run lint` y `npm test` (249/249) limpios;
    visual con Playwright en navegador real (desktop y mobile), inyectando temporalmente citas
    solapadas en el mock data para forzar el caso y revirtiéndolo después.
- **Por qué:** pedido explícito del usuario, iterando sobre el resultado en vivo — primero notó que
  faltaba poder editar/eliminar citas desde la ficha del cliente, y después que la vista Mes ya
  resolvía bien "muchas citas en un día" pero las vistas de agenda no, seguido de una ronda de
  comparación de alternativas (apilar verticalmente, imitar Google Calendar) antes de converger en
  el panel agrupado + puntos en mobile.
- **Pendiente:** nada nuevo bloqueante. El problema de fondo de columnas angostas en mobile cuando
  se muestran VARIOS DÍAS a la vez (3 días/5 días/Semana en una pantalla de ~390px, ya angosto
  incluso sin ningún solape) no se tocó — quedó fuera de alcance de esta sesión, que se centró en
  el solape dentro de un mismo día.

### 2026-08-02 (25) — Vercel Analytics + PostHog (analítica solo en páginas públicas) + banner de cookies real
- **Qué cambió:** el usuario preguntó por Google Analytics/heatmaps para medir clics y tiempo en
  página. Se le explicaron las dos categorías (tráfico vs. heatmaps/session recording) y se
  confirmaron 2 decisiones con el usuario: combinación **Vercel Analytics + PostHog** (sin
  Microsoft Clarity, redundante con PostHog) y **sin desplegar a Vercel todavía** (`sass-optica`
  no está en la cuenta de Vercel del usuario — se verificó con `vercel project ls` contra sus 7
  proyectos existentes — así que Vercel Analytics queda cableado en el código pero inactivo hasta
  que el usuario despliegue). Implementado:
  1. **`@vercel/analytics`** — `<Analytics />` en el layout raíz, sitio completo (sin cookies, sin
     PII, dato anónimo agregado descartado a las 24h — no necesita el consentimiento del punto 2).
  2. **PostHog** (`posthog-js`, `src/lib/analytics/posthog.ts`) — inerte sin
     `NEXT_PUBLIC_POSTHOG_KEY` (mismo patrón que Supabase/Culqi), import dinámico, grabación de
     sesión desactivada por defecto (`disable_session_recording: true` — se activa a mano desde
     el panel de PostHog si el usuario lo decide más adelante, no por defecto).
  3. **`AnalyticsProvider.tsx`** (nuevo, montado en el layout raíz) — el corazón de la decisión de
     diseño: PostHog **nunca** se inicializa en `/dashboard` ni `/admin-panel` (ahí se ve
     información real de pacientes — graduaciones, recetas — que el auto-enmascarado genérico de
     estas herramientas no está pensado para detectar), y en las páginas públicas donde sí corre,
     **no se inicializa hasta que el visitante acepta el banner** — nunca antes, nunca por
     defecto. Banner con botones "Aceptar"/"Rechazar" del mismo peso visual (`btn-primary`/
     `btn-outline`), sin casillas premarcadas, consistente con lo investigado en la sesión (24)
     sobre la Ley 29733.
  4. **Pestaña "Política de cookies" reescrita** (`LegalHub.tsx`) — ya no dice "no usamos
     analítica"; ahora documenta PostHog, su alcance (solo páginas públicas), duración de la
     cookie (~1 año) y agrega botón nuevo "Cambiar mi preferencia de cookies"
     (`reiniciarConsentimientoCookies()` en `cookie-consent.ts`, borra el localStorage y recarga
     para que el banner reaparezca — los dos árboles de componentes no se hablan directamente).
  5. `.env.example`/`.env.local`: `NEXT_PUBLIC_POSTHOG_KEY`/`NEXT_PUBLIC_POSTHOG_HOST` nuevas,
     vacías a propósito (el usuario todavía no tiene cuenta en posthog.com).
  - Verificado: `npx tsc --noEmit`, `npm run lint`, `npm run build` y `npm test` (249/249)
    limpios. Visual con Playwright (instalado ad-hoc en el scratchpad de la sesión, no es
    dependencia del proyecto): banner visible en la landing con botones parejos, screenshot
    revisado; confirmado que el banner NO aparece en `/dashboard` — sí aparece en `/login` cuando
    `/dashboard` redirige ahí por falta de sesión, que es el comportamiento correcto (`/login` es
    página pública).
- **Por qué:** pedido explícito del usuario tras una ronda de preguntas para acotar el alcance
  (qué herramientas, y si desplegar a Vercel ahora o no).
- **Pendiente:** el usuario necesita crear su cuenta gratuita en posthog.com y pegar la key en
  `.env.local` para que la analítica arranque de verdad (no delegable, requiere su cuenta). Vercel
  Analytics necesita el deploy real (fuera de alcance de esta sesión, a propósito). Cuando haya
  datos reales, el embudo Landing→Registro→Pago se configura desde el panel propio de PostHog
  (no es código).

### 2026-08-02 (24) — Pestaña "Política de cookies" + derecho de portabilidad en Privacidad
- **Qué cambió:** el usuario preguntó por qué no había un banner de aceptar/rechazar cookies en la
  landing, y qué debe llevar exactamente una política de privacidad/términos para un SaaS
  peruano. Investigación contra la Ley N° 29733 y su reglamento (D.S. 016-2024-JUS, vigente desde
  marzo de 2025, WebSearch + WebFetch a docs.culqi.com/recordinglaw.com/kukie.io) más una
  revisión del código real: el sitio hoy **no pone ninguna cookie no esencial** (sin analítica ni
  marketing en el proyecto; el tema claro/oscuro usa `localStorage`, no cookie) — la única cookie
  es la de sesión de Supabase, que aparece recién al iniciar sesión/registrarse y es estrictamente
  necesaria (exceptuada de consentimiento previo por ley). Conclusión: no hacía falta un banner de
  aceptar/rechazar (no hay nada opcional que consentir), pero sí una política de cookies honesta
  que lo explique, y el usuario confirmó implementar eso más un hallazgo nuevo (portabilidad):
  1. **Pestaña nueva "Política de cookies"** en `/legal` (`LegalHub.tsx`, mismo patrón que las
     otras 3 — array `COOKIES` + `TabId`/`TABS`): explica qué cookies se usan hoy (solo sesión),
     por qué no hay banner (nada opcional que rechazar), y el compromiso de mostrar un banner
     real de aceptar/rechazar/personalizar el día que se sume analítica o marketing. Registrada en
     `src/app/legal/page.tsx` (metadata + parseo de `tabInicial`), `sitemap.ts` y el footer de
     `src/app/page.tsx`.
  2. **Derecho de portabilidad** — nuevo desde sept-2025 en el reglamento peruano, no estaba
     mencionado. Sección nueva "8. Derecho a la portabilidad" en la pestaña Privacidad
     (`priv-8`), renumerando las 2 secciones siguientes (`priv-9`/`priv-10`) — solo texto, sin
     botón de exportar todavía (no se pidió implementarlo).
  - Verificado: `npx tsc --noEmit`, `npm run lint`, `npm run build` (incluida `/legal`) y
    `npm test` (249/249) limpios.
- **Por qué:** pedido explícito del usuario tras explicarle el marco legal completo; confirmó
  exactamente estos 2 ítems de una lista de 3 opciones (la tercera era "no tocar código todavía").
- **Pendiente (mencionado al usuario, no implementado a propósito):** dos hallazgos nuevos de la
  investigación, fuera del alcance pedido esta sesión — **registro del banco de datos personales
  ante la ANPD vía la plataforma SIPDP** (gratuito y obligatorio, sin evidencia de haberse hecho,
  es un trámite del usuario, no código) y un **botón de exportar los datos de la cuenta**
  (la portabilidad hoy solo está documentada como "escríbenos", no hay self-service). El DPO
  (Oficial de Protección de Datos) NO aplica todavía: el umbral por ingresos da plazo hasta
  noviembre de 2028 para empresas con menos de S/825k anuales.

### 2026-08-02 (23) — Webhook de Culqi: verificación server-a-server (Culqi no firma sus webhooks)
- **Qué cambió:** en la sesión anterior una auditoría de seguridad (RLS/aislamiento — sin gaps
  cross-tenant) encontró un hallazgo real fuera de RLS: `/api/webhooks/culqi` activaba la
  suscripción del `negocio_id` que viniera en el body del POST sin validar nada, porque el
  endpoint es público y Culqi lo llama sin sesión. Se investigó contra `docs.culqi.com`
  (WebFetch) si Culqi expone algún mecanismo de firma de webhook (HMAC, secreto compartido,
  header especial) — **confirmado que no expone ninguno**, a diferencia de Stripe. La mitigación
  estándar para proveedores sin firma es no confiar en el payload y volver a consultar el recurso
  contra la API real: el webhook ahora toma solo el `id` del cargo del body, hace un
  `GET https://api.culqi.com/v2/charges/{id}` server-a-server con `CULQI_SECRET_KEY`, y solo
  activa la suscripción con los datos que Culqi confirme en esa respuesta (`metadata.negocio_id`,
  `amount`, `currency_code`, `source.type`) — nunca con lo que el body original decía. Si no hay
  `CULQI_SECRET_KEY` configurada (hoy, sin cuenta real) o Culqi no reconoce el cargo, el evento se
  ignora sin tocar ninguna suscripción, igual que antes de tener cuenta Culqi real.
  Verificado: `npx tsc --noEmit` y `npm run lint` limpios. No se pudo probar contra Culqi real
  (sigue sin `CULQI_SECRET_KEY`, pendiente de la cuenta real — ver "Pendientes activos").
- **Por qué:** el hallazgo de la auditoría anterior quedó explícitamente pendiente de decisión
  ("¿lo arreglo ahora o lo dejo anotado?"); el usuario pidió resolver todo lo que no dependa de
  crear el proyecto Supabase real (explícitamente descartado por ahora), y este era el único
  ítem de esa lista resoluble 100% en código.

### 2026-08-01 (22) — 4 features de research de competencia + los 2 cabos sueltos de Multisedes
- **Qué cambió:** de una lista de 14 ideas de research (tendencias de software para ópticas +
  tendencias generales de SaaS), a pedido explícito, se implementaron 4: seguimiento de clientes
  (reposición de lentes de contacto + garantía, unificando los ítems #2 y #10 de la lista porque
  comparten el mismo mecanismo), escaneo de código de barras (`BarcodeDetector` nativo, sin
  dependencia npm), import/export de productos vía Excel (`exceljs`, ya presente en el proyecto) y
  venta cruzada por co-ocurrencia. Se explicaron sin implementar los ítems #1 (recall automático),
  #11 (WhatsApp Business API real) y #12 (resumen de historia clínica con IA) — el usuario preguntó
  "¿cómo sería?", no pidió construirlos.
- Aparte, se resolvieron los 2 cabos sueltos que quedaban anotados en "Pendientes activos" desde la
  sesión de Multisedes (2026-07-31 (20)): el selector de sede del topbar ahora FILTRA `citas` y
  `ventas` (se elevó `sucursalFiltro` de un hook local de `DashboardTopbar.tsx` a `DataProvider`), y
  crear la primera sucursal de un negocio con stock ya cargado dispara un paso de reparto explícito
  (`repartirStockInicial`) en vez de dejar que el stock "desaparezca" de `stock_sucursal`. Ver el
  detalle de ambos, y el gap nuevo que se descubrió de paso (`ajustarStock` en `addVenta`/
  `anularVenta` no recibe `sucursalId` todavía), en "Pendientes activos" arriba.
- **Por qué:** pedido explícito del usuario en un solo mensaje: implementar 5 ítems de la lista de
  research (`2, 3, 9, 10, 13`), explicar 3 (`1, 11, 12`), descartar el resto, y además "revisar el
  proyecto y ver si hay algo que falta conectar" — de ahí salieron los 2 cabos sueltos, que el
  usuario pidió resolver en el mismo hilo apenas se los reporté.
- Después, a pedido explícito ("solo haz la primera, recall"), sí se implementó el ítem #1 (recall
  automático de control anual): `calcularRecallControlAnual` en `lib/seguimiento-clientes.ts` calcula
  12 meses después de la última receta/examen optométrico del cliente — mismo mecanismo ya usado
  para reposición/garantía, unificado en la misma lista de `Seguimiento` (tipo `"control_anual"`).
  Igual que el recordatorio de citas de mañana, el envío es manual: un ícono de WhatsApp junto a cada
  alerta en la ficha del cliente abre `wa.me` con el mensaje ya armado — automatizar el envío en sí
  necesita la API real de WhatsApp Business (ítem #11, explicado pero no implementado). De paso se
  corrigió un bug latente en `sumarMeses` (`lib/seguimiento-clientes.ts`): parseaba la fecha ISO como
  UTC-medianoche y llamaba `setMonth()` en hora LOCAL — con un huso negativo como el de Perú
  (UTC-5) eso desfasaba el resultado un día cada vez que el mes de destino tenía distinta cantidad de
  días que el de origen (afectaba `garantiaMeses` no múltiplos de 12, entre otros). Ahora usa
  aritmética 100% en UTC.
- **Pendiente:** el gap de `ajustarStock` sin `sucursalId` en `addVenta`/`anularVenta`, recién
  anotado arriba — no se tocó en esta sesión (fuera del alcance de "los 2 cabos sueltos", que eran
  específicamente el selector del topbar y el reparto inicial).

### 2026-07-31 (21) — Lista de 20 pedidos de UX/negocio sobre Clientes, Citas, Comercial y Administración
- **Qué cambió:** el usuario pegó una lista larga de pedidos puntuales (feedback de uso real) sobre
  Clientes, Citas, Ventas, Cotizaciones, Laboratorio, Caja, Gastos, Informes y reglas generales del
  dashboard, y pidió analizarla, convertirla en un plan y luego implementar todo. Se investigó cada
  punto contra el código real (4 forks de exploración en paralelo) antes de tocar nada — varios
  pedidos ya estaban resueltos (eliminar cita sin confirmación + deshacer, cancelado terminal en
  laboratorio, venta no revertible en cotizaciones) y uno contradecía código existente (botón "Volver
  a pendiente" en cotizaciones rechazadas). Confirmadas 3 decisiones abiertas con el usuario antes de
  implementar (contenido de "Reportes" en Informes, instalar `exceljs`, quitar también la reversión en
  rechazadas) y luego se implementaron los 20 puntos:
  1. **Clientes**: acciones de la lista reducidas a Ver/Eliminar (`clientes/page.tsx`), Editar+Eliminar
     movidos dentro de la ficha (`clientes/[id]/page.tsx`) con `ConfirmDialog`; botón "← Clientes" con
     underline animado (`.link`, ya existía en `globals.css`); validación propia de email (regex +
     mensaje inline + `noValidate`) reemplazando el tooltip nativo en `ClienteFormSlideOver.tsx`;
     flechas del `DatePicker`/`DateRangePicker` a `dark:text-slate-100` (bajo contraste en dark mode);
     notas editables inline sin abrir el wizard completo; citas y exámenes optométricos paginados a 4
     por página (`usePaginado` parametrizado, antes tenía `10` fijo). Móvil: filtros en grid 2×2,
     columna "Historial" oculta (`hidden md:table-cell`, mismo patrón ya usado en productos/ventas),
     exámenes optométricos como 2 tarjetas OD/OI apiladas en vez de tabla con scroll horizontal.
  2. **Citas**: la eliminación ya no pedía confirmación (ya estaba así, con deshacer vía toast) — sin
     cambios. Móvil: vista por defecto "Día" (antes "Mes"), selector de vista partido en 2
     `SegmentedControl` (Día/3 días/5 días · Semana/Mes/Lista), filtro de estado + rango de fecha en
     grid 2 columnas, botón "Agendar cita" a ancho completo.
  3. **Ventas**: opción "+ Nuevo cliente" en el selector con mini-formulario inline (crea el cliente
     con `addCliente` al confirmar la venta); código de descuento pasó de input libre a `<select>` con
     los cupones activos/vigentes (indicando % o S/); checkbox "Incluir recargo por tarjeta" (5%,
     constante `RECARGO_TARJETA_PCT` local) visible solo con método "tarjeta", registrado en
     `ventas.notas` para no tocar el schema.
  4. **Cotizaciones**: mismo dropdown de descuentos que ventas; quitado el botón "Volver a pendiente"
     de cotizaciones rechazadas (confirmado con el usuario: ningún estado se revierte, no solo "ya es
     venta" que ya estaba resuelto).
  5. **Laboratorio**: "Fecha estimada de entrega" pasó de `<input type="date">` nativo al `DatePicker`
     propio del proyecto.
  6. **Caja**: apertura con desglose por método (`cajas.desglose_apertura jsonb`, columna nueva
     aditiva — filas de "método + monto" dinámicas, suma automática); `lib/caja.ts` ganó
     `sumaDesglose`/`efectivoDeDesglose` (solo el ítem "efectivo" participa del cuadre físico, el
     resto es informativo — cajas sin desglose siguen tratando `monto_inicial` como 100% efectivo,
     comportamiento anterior intacto). Export a Excel con diseño real (`exceljs`, import dinámico —
     nueva dependencia, confirmada con el usuario, introduce vulnerabilidades `high` transitivas vía
     `archiver`/`brace-expansion` que no tienen fix sin romper `eslint`; riesgo bajo en este uso
     porque solo escribe `.xlsx` desde datos propios, nunca parsea entrada externa) y a PDF vía el
     mismo patrón HTML-imprimible ya usado (`construirHtmlListadoCaja`, sin dependencia nueva).
  7. **Gastos**: el `<select>` de categoría mostraba "Sueldos" cerrado pero "sueldos" abierto —
     causa real: `className="capitalize"` puesto en `<option>`, que el popover nativo desplegado no
     respeta. Fix: capitalizar el texto en JS, no vía CSS.
  8. **Informes**: reestructurado con `SettingsTabs` (generalizado para aceptar `tabs` por prop, antes
     tenía el array de Ajustes/Facturación hardcodeado) — pestaña "Ingresos y egresos" (contenido
     anterior intacto) + pestaña nueva "Reportes" (`/dashboard/informes/reportes`): generador de
     reportes exportables (Excel/PDF) de Ingresos vs Egresos por rango de fechas, con desglose por
     método de pago y por categoría de gasto (`lib/informes.ts`: `desgloseIngresosPorMetodo`/
     `desgloseEgresosPorCategoria`, nuevas funciones puras).
  9. **General**: ventas y cotizaciones bloqueadas sin una caja abierta (`CajaCerradaBanner.tsx`
     nuevo, deshabilita el botón de confirmar); fix del acordeón de "Administración" que se cerraba
     al cambiar entre pestañas de Ajustes/Facturación o de Informes/Reportes (`DashboardNav.tsx`:
     `esActivo` no reconocía `/dashboard/facturacion` ni `/dashboard/informes/reportes` como parte del
     mismo ítem del sidebar — generalizado a un mapa `RUTAS_HERMANAS`); accesos rápidos de Inicio
     ahora configurables (lápiz junto al título abre un `SlideOver` con checkboxes sobre el catálogo
     completo de `NAV`, persistido en localStorage por negocio — mismo patrón que el selector de sede
     de `DashboardTopbar.tsx`); rol "trabajador" se muestra como "Vendedor/Empleado" en la UI de
     Empleados (`lib/roles.ts` nuevo, el valor real del enum no cambia — RLS/proxy.ts siguen intactos).
     Multisedes: no era un pedido de implementación, era una pregunta ("¿cómo sería?") — se le explicó
     al usuario que la infraestructura ya existe pero el selector de sede del topbar sigue siendo solo
     un filtro de UI sin conectar a las queries de citas/ventas (pendiente ya trackeado más arriba).
  - Verificado: `npm test` (202/202), `npx tsc --noEmit`, `npm run lint` y `npm run build` limpios
    tras cada bloque de cambios — incluida la ruta nueva `/dashboard/informes/reportes` en el output
    del build.
- **Por qué:** pedido explícito del usuario de analizar una lista larga de feedback real de uso y
  luego implementar todo, tras confirmar 3 decisiones que genuinamente no tenían un default razonable
  (contenido de "Reportes", instalar una dependencia nueva, alcance exacto de "no revertir" en
  cotizaciones).
- **Pendiente:** nada nuevo de esta sesión que no estuviera ya trackeado — el punto de Multisedes
  (conectar el selector de sede a los filtros de citas/ventas) sigue en "Pendientes activos" de más
  arriba, sin cambios. `npm audit` reporta vulnerabilidades `high` nuevas por la cadena de `exceljs`
  (`archiver`→`readdir-glob`→`brace-expansion`, ReDoS) sin fix disponible que no rompa `eslint` — a
  revisar si conviene reemplazar `exceljs` más adelante; el uso actual (solo escritura de `.xlsx`
  desde datos propios del negocio) acota bastante el riesgo real.

### 2026-07-31 (20) — 7 features nuevas: historia clínica ampliada, comisiones, multisedes, laboratorio y caja
- **Qué cambió:** el usuario pidió analizar dos propuestas externas sobre qué le faltaba al SaaS
  (módulo clínico, laboratorio, inventario especializado, caja, comisiones, adaptación a Perú,
  multisedes). El análisis contra el código real mostró que varias cosas ya estaban hechas
  (Yape/Plin, IGV, terminología peruana, anular-sin-borrar) y que otras eran huecos genuinos. Tras
  confirmar alcance con el usuario en varias rondas de preguntas (excluyendo explícitamente lo que
  depende de un proveedor externo pago: RENIEC/SUNAT, facturación electrónica OSE, notas de
  crédito/débito, envío real de email), se entró en modo plan (3 agentes Explore + 1 agente Plan)
  y se implementaron 7 features 100% de código interno, en este orden:
  1. **Parámetros de lentes de contacto** — `productos.curva_base/diametro/potencia` (nullable,
     con `check` que exige `categoria = 'lente_contacto'`), sección condicional en el `SlideOver`
     de `/dashboard/productos` que se limpia sola al cambiar de categoría.
  2. **Historia clínica ampliada** — tabla nueva `examenes_optometricos` (agudeza visual sc/cc,
     queratometría K1/K2/eje, anamnesis), **separada de `recetas` a propósito**: un examen no
     siempre coincide 1:1 con una receta nueva (control sin cambio de graduación, o reposición sin
     examen nuevo). Sin página propia, mismo precedente que `recetas`: sección + alta dentro de
     `clientes/[id]/page.tsx`.
  3. **Comisiones por vendedor** — hallazgo real durante la investigación: `ventas.empleado_id`
     ya existía en el schema pero estaba **muerto** (no estaba en la interfaz `Venta` ni se seteaba
     nunca desde `ventas/page.tsx`). Se cableó ese gap en vez de crear una columna nueva. % único
     por empleado (`empleados.comision_pct`, admin-only gratis vía la RLS que ya existía),
     `lib/comisiones.ts` (puro, con tests) + página `/dashboard/comisiones` con exportación CSV.
  4. **Multisedes — Fase A (infraestructura)** — tabla `sucursales`, `current_sucursal()` (mismo
     patrón `SECURITY DEFINER` que `current_tenant()`, lee `empleados.sucursal_id`, nunca una
     cookie), `sucursal_id` opcional en `citas`/`ventas`/`empleados`, RLS con el filtro adicional
     `current_sucursal() is null or sucursal_id is null or sucursal_id = current_sucursal()`,
     selector de sede en `DashboardTopbar.tsx` (solo filtro de UI, localStorage — no toca RLS).
     **Sin migración retroactiva**: un negocio que nunca crea una sucursal no nota ningún cambio
     de comportamiento, `sucursal_id NULL` es un estado permanente y válido, no deuda técnica.
  5. **Órdenes de laboratorio** — tabla `ordenes_laboratorio`, 8 estados (los 7 del brief del
     usuario + `cancelado`, mismo criterio que `estado_venta.anulada`), `lib/laboratorio.ts` con
     `TRANSICIONES_VALIDAS` (con tests), página `/dashboard/laboratorio` con botón "Avisar por
     WhatsApp" (reusa `urlWhatsAppContacto` del patrón ya usado en `/dashboard/citas`). Permiso
     granular nuevo `'laboratorio'` en `MODULOS_DELEGABLES`. **Sin Kanban a propósito** — no existe
     ningún patrón drag-and-drop en el proyecto, un `<select>` de estado alcanza para el MVP.
  6. **Caja** — apertura/cierre diario con cuadre por método de pago, `cajas` con `diferencia`
     como columna generada y un índice único parcial (máximo una caja abierta por sede/negocio a
     la vez, evita doble apertura por doble click). `lib/caja.ts` (`calcularCuadreCaja`, con
     tests) + `lib/constancia-caja.ts` (HTML imprimible, mismo patrón que `lib/recibo.ts` pero
     archivo propio para no forzar su interfaz acoplada a `Venta`).
  7. **Multisedes — Fase B (stock por sede)** — tabla `stock_sucursal`, regla binaria en
     `DataProvider.tsx`: sin sucursales creadas, `inventario` sigue siendo la fuente de verdad
     (cero cambio); con al menos una, el stock se calcula como SUMA de `stock_sucursal` al cargar.
     `ajustarStock` acepta un `sucursalId` opcional para escribir en la sede correcta — pero
     **ningún formulario del dashboard todavía deja elegir sede** al ajustar stock, queda anotado
     en pendientes (falta el flujo explícito de "a qué sede asignas el stock actual", ver ahí).
  - **Decisiones de permisos confirmadas con el usuario** (no asumidas): Laboratorio y Caja son
    ambos **operativos** (`puede_gestionar()` — administrador o encargado gestionan sin permiso
    explícito, igual que ventas/citas), a diferencia de Gastos/Descuentos que son admin-gated.
  - Verificado tras cada feature: `npm test` (202/202, eran 176), `npx tsc --noEmit`, `npm run
    lint` y `npm run build` limpios; rutas nuevas confirmadas con `curl` en modo mock
    (`/dashboard/comisiones`, `/laboratorio`, `/caja`, `/sucursales`, todas 200).
- **Por qué:** pedido explícito del usuario ("implementa todo lo que se pueda realizar para que
  esté correctamente") tras confirmar el alcance exacto en varias rondas de preguntas — incluyendo
  Multisedes en versión completa, pese a la recomendación inicial de no construirlo de forma
  especulativa (el usuario lo confirmó explícitamente dos veces).
- **Pendiente:** ver los 3 ítems nuevos en "Pendientes activos (no bloquean)" — probar la RLS de
  sede contra Postgres real, construir el flujo de reparto de stock al crear la primera sucursal,
  y conectar el selector de sede del topbar a los filtros de `citas`/`ventas` (hoy solo guarda la
  preferencia, ninguna página la usa todavía).

### 2026-07-30 (19) — Modelo freemium real: plan Gratis permanente + prueba de 30 días para planes pagos
- **Qué cambió:** el usuario notó que Inicio mostraba "Plan: Gratis · Estado: Prueba gratuita" y
  preguntó por qué — la investigación destapó que la landing (`PreciosSection.tsx`) prometía hace
  varias sesiones un modelo freemium real ("Empieza gratis, para siempre", tarjeta "Gratis" con
  límites de 2 empleados/30 ventas al mes) que el backend nunca implementó: el registro seguía
  creando siempre un trial de 30 días que, al vencer, bloqueaba el dashboard entero
  (`estado='vencida'` + `proxy.ts`). Promesa de marketing incumplida por el producto real. Se
  entró en modo plan (2 agentes Explore + 1 agente Plan, investigación exhaustiva del modelo de
  suscripción existente) y se implementó el modelo correcto, confirmado con el usuario:
  1. **Elegir plan al registrarse** (Gratis/Básico/Premium) — nuevo `SegmentedControl` en el
     Paso 1 de `AuthPage.tsx`/`CompletarRegistroForm.tsx`, preseleccionado según `?plan=` (que
     ahora sí mandan los 3 botones de `PreciosSection.tsx`, antes todos iban a `/registro` a
     secas). `/auth/callback/route.ts` se ajustó para no descartar ese query string en el flujo
     de Google.
  2. **Gratis es permanente** — `plan_suscripcion` pasó de `('trial','basico','premium')` a
     `('gratis','basico','premium')` en `supabase-schema.sql` (proyecto aún sin desplegar, cambio
     de enum sin costo de migración). `estado='trial'` ahora SIEMPRE significa "probando un plan
     pago sin pagar" — nunca puede coexistir con `plan='gratis'` (constraint explícito). Límites
     de Gratis (2 empleados, 30 ventas/mes, confirmados por el usuario) ya reales: nuevo
     `src/lib/limites-plan.ts` (con tests), aplicado server-side en `/api/empleados/invitar` y
     vía un trigger nuevo (`bloquear_venta_limite_gratis`) + gate visual
     (`LimitePlanBanner.tsx`, hermano de `FeatureGateBanner.tsx`, no una variante) en
     `/dashboard/ventas`. La razón de usar un trigger de DB para ventas y no solo un chequeo en
     cliente: `ventas` se inserta directo desde el navegador (a diferencia de empleados, que
     siempre pasa por un route handler), así que un chequeo solo-cliente sería bypasseable con la
     sesión del propio negocio — RLS aísla tenants entre sí, nunca protegió límites de plan
     dentro de un mismo tenant.
  3. **Probar un plan pago sin pagar** — nuevo endpoint `/api/suscripcion/probar-plan` (sin
     Culqi) arranca un trial de 30 días de Básico/Premium; si vence sin pago, el cron
     `revisar_trials_vencidos` (reescrito como `revertir_trials_a_gratis`) NO bloquea nada — vuelve
     el negocio a `plan='gratis'/estado='activa'` automáticamente. Botón "Probar 30 días gratis"
     nuevo en `/dashboard/facturacion` (visible solo si el plan actual es Gratis).
  4. **Popup de bienvenida** tras crear la cuenta (pedido explícito del usuario) —
     `WelcomePlanModal.tsx` nuevo, montado en `DashboardShell.tsx`, dispara con `?bienvenida=` que
     agregan los redirects de registro; contenido armado desde `PLANES`/`LIMITE_*` (una sola
     fuente, no texto duplicado). Se muestra una sola vez por negocio (localStorage, mismo patrón
     que `CoachTooltip`) y limpia el query param al cerrar.
  5. **Bug real encontrado en la propia verificación visual** (Playwright, no solo tests): el KPI
     "Pagando" del admin panel (`/admin-panel` y el filtro de `NegociosTable.tsx`) contaba
     `estado==='activa'` sin excluir `plan==='gratis'` — como Gratis también es siempre "activa"
     (su estado normal y permanente), un negocio que nunca pagó nada inflaba ese conteo. El MRR
     ya estaba a salvo solo porque `PRECIO_PLAN["gratis"] ?? 0`; el conteo de negocios no tenía
     ese mismo "escudo" y hubo que agregar `&& plan !== "gratis"` en los dos lugares.
  6. **Arreglado de paso**: `addVenta` en `DataProvider.tsx` descartaba en silencio el `error` de
     Supabase (`const { data } = await ...`) — ahora devuelve `{id, error}`, permitiendo mostrar
     el mensaje real del límite (o de cualquier otro fallo) en vez de fallar mudo. Afecta también
     a `convertirCotizacionAVenta`/`cotizaciones/page.tsx`, únicos otros llamadores.
  7. **Mock data**: `MOCK_SUSCRIPCION` y `MOCK_ADMIN_SUSCRIPCIONES` actualizados a los nuevos
     valores de enum, con un 6º negocio nuevo (`adm-neg-6`, Gratis) agregado sin romper las
     historias ya existentes de pagos/uso de los otros 5 (verificado contra `MOCK_ADMIN_PAGOS`
     antes de reasignar estados, para no contradecir pagos reales ya simulados — ej. adm-neg-4
     pagó una vez y no renovó, por eso sigue en `vencida`, no revirtió a Gratis).
  - Verificado con Playwright en navegador real contra los 3 flujos (landing→registro con plan
    preseleccionado, popup de bienvenida no reaparece tras recargar, panel admin con las
    etiquetas/KPIs correctos) y con la suite completa: `npm test` (176/176), `npm run build`,
    `tsc --noEmit`, `lint` limpios.
- **Por qué:** el usuario detectó la inconsistencia entre lo que promete la landing y lo que hace
  el producto real, y pidió implementar el modelo freemium tal como ya estaba anunciado
  públicamente — no una idea nueva, sino cerrar una promesa de marketing que llevaba varias
  sesiones sin cumplirse en el código.
- **Pendiente:** el límite de empleados (403 del route handler) solo se puede probar de punta a
  punta contra Supabase real — sigue anotado en "Pendientes activos" como parte del mismo bloqueo
  de siempre (falta desplegar el proyecto real). La suscripción recurrente automática de Culqi
  (ya trackeada como pendiente) es la pieza que en el futuro haría que `estado='vencida'` se
  produzca de verdad — hoy ningún flujo nuevo la genera, queda reservada para eso.

### 2026-07-30 (18) — Buscador global movido al sidebar + reorden de Comercial + separadores en colapsado
- **Qué cambió:** tres pedidos encadenados del usuario sobre `DashboardNav.tsx`/`DashboardTopbar.tsx`:
  1. **Buscador global al sidebar:** el usuario pidió mover "el buscador de Inicio" al sidebar.
     Primer intento (equivocado, corregido en el mismo hilo): moví el botón "Buscar (Ctrl+K)" del
     command palette, que el usuario aclaró que debía quedarse en el topbar. El pedido real era el
     `BuscadorGlobal` (clientes/productos/proveedores con dropdown de resultados) que vivía suelto
     en `/dashboard/page.tsx`, visible solo en Inicio. Se movió el componente completo a
     `DashboardNav.tsx`, arriba de la navegación — ahora es visible y funcional desde **cualquier**
     página del dashboard, no solo Inicio (mejora incidental). Colapsado, se reduce a un ícono de
     lupa que expande el sidebar (`onToggle`) al hacer clic, mismo patrón que un sidebar tipo
     Notion. `dashboard/page.tsx` quedó sin el buscador y sin los imports que solo usaba él.
  2. **Reorden de "Comercial":** a pedido del usuario, sin crear un grupo nuevo — Ventas,
     Cotizaciones y Descuentos ahora van primero; Stock y Proveedores quedan después, en
     `lib/dashboard-nav.ts` (fuente única que comparten sidebar y `BottomTabBar` mobile).
  3. **Sidebar colapsado, primer intento — separadores:** el usuario notó que colapsado se veían
     12 íconos aplanados (los grupos "Comercial"/"Administración" pierden su encabezado al
     colapsar) sin separación visual. Se le presentaron 2 opciones (separador simple vs. colapsar
     a solo íconos principales + "expandir al click"); eligió la primera (`border-t` arriba de
     cada grupo aplanado) — implementada, pero descartada en el mismo hilo un mensaje después.
  4. **Sidebar colapsado, versión final — solo principales + expandir al elegir:** el usuario
     reconsideró y pidió la segunda opción después de todo. Cada grupo (Comercial/Administración)
     colapsado pasó de "N hijos aplanados" a **un solo ícono** (el del grupo): al hacer clic
     expande el sidebar completo Y abre ese grupo puntual (`onToggle()` + `setOverride({ path,
     key: item.key })`), en vez de solo listar los hijos sueltos. El riel colapsado quedó en 5
     íconos principales (Inicio/Clientes/Citas/Comercial/Administración) + el buscador, contra los
     14 de antes — reemplaza por completo el cambio del punto 3 (ya no aplica el `border-t`, no
     hace falta con solo 1 ícono por grupo).
  - Verificado con Playwright en navegador real en cada iteración (expandido, colapsado, dropdown
    de resultados, clic en ícono de grupo colapsado → expande y abre "Comercial"). `lint`/
    `tsc --noEmit` limpios.
- **Por qué:** pedidos explícitos del usuario tras revisar el sidebar en vivo; la aclaración del
  punto 1 fue necesaria porque la primera lectura del pedido ("el buscador que está en el inicio")
  era ambigua entre el command palette (Ctrl+K, vive en el topbar) y el buscador real de registros
  (vivía en la página Inicio) — el usuario corrigió apenas vio el resultado.

### 2026-07-30 (17) — Badge del Libro de Reclamaciones con transparencia real
- **Qué cambió:** el usuario preguntó si el badge `public/libro-reclamaciones-badge.png` (sesión
  (16), envuelto en una tarjeta blanca porque el PNG era RGB opaco sin canal alfa) se podía hacer
  transparente. Un chroma-key directo sobre blanco no servía: las páginas del libro son blancas
  igual que el fondo, así que hubiera perforado el propio libro. Se encontró el PDF fuente
  original (`AvisoVirtual.pdf`, en las Descargas del usuario, ya no versionado en el repo) y se
  re-renderizó con PyMuPDF usando `page.get_pixmap(alpha=True)`: esto distingue "no se dibujó
  nada" (transparente) de "se dibujó blanco" (opaco), preservando el libro y su sombra difusa
  intactos y dejando transparente solo el verdadero fondo de página. Verificado componiendo el
  PNG resultante sobre el color exacto del footer en ambos modos (`slate-950` dark / blanco
  light): se ve idéntico, sin halo ni recorte.
  - `public/libro-reclamaciones-badge.png` reemplazado por la versión con alfa real.
  - `src/app/page.tsx`: quitada la tarjeta blanca (`border`/`bg-white`/`shadow-sm`/padding) que
    envolvía el badge en el footer, ya no hace falta.
  - El usuario probó en paralelo una alternativa con una herramienta de remoción de fondo por IA
    (removebg) sobre un screenshot que ya tenía a mano; comparada con la versión de PyMuPDF, esa
    alternativa perdía la sombra del libro (la IA la interpretó como parte del fondo) y partía de
    menor resolución (screenshot 896×692 vs. render vectorial). Se descartó en un primer momento a
    favor de la versión con canal alfa exacto, y se borraron del repo los dos PNG de referencia
    que habían quedado sueltos sin trackear (`Captura de pantalla 2026-07-29 214607.png` y su
    variante `-removebg-preview.png`).
  - **Cambio final (mismo día):** el usuario pidió reusar directamente el PNG que ya tiene en
    `sass-combate` (su otro SaaS) — `public/libro-reclamaciones.png` ahí, mismo recorte por IA
    (568×439, alfa real 0-255) que ese proyecto usa sin tarjeta blanca en su footer
    (`footer-landing.tsx`). Copiado a `public/libro-reclamaciones-badge.png` en este proyecto
    (reemplazando la versión PyMuPDF), para que el badge de "Libro de Reclamaciones" se vea
    idéntico en ambos SaaS del usuario — prioridad de consistencia de marca entre proyectos por
    encima de la calidad ligeramente mayor (con sombra) de la versión propia. Ajustado
    `width`/`height` en `src/app/page.tsx` a la proporción real del nuevo PNG (568×439).
  - `lint` y `tsc --noEmit` limpios.
- **Por qué:** pedido explícito del usuario tras notar que el badge llevaba una tarjeta blanca de
  respaldo — resuelto de raíz en vez de solo ajustar el color de esa tarjeta, y luego alineado con
  el asset ya validado en su proyecto hermano `sass-combate` para mantener el mismo badge visual
  en todos sus SaaS.

### 2026-07-29 (16) — Ajuste del Libro de Reclamaciones contra la hoja oficial + badge del footer
- **Qué cambió:** el usuario pasó dos archivos de referencia (`virtual_archivo.pdf`, la Hoja de
  Reclamación Virtual oficial ya con la estructura de campos; `AvisoVirtual.pdf`, el gráfico oficial
  "Libro de Reclamaciones" que se muestra en el footer de un sitio). Se ajustó la implementación de
  la sesión (15) contra ambos:
  1. **Bug encontrado al comparar contra la hoja oficial**: el plazo de respuesta estaba mal —
     tenía escrito "30 días calendario" en 4 lugares (`lib/reclamos.ts`, `/libro-reclamaciones`
     ×2, `/admin-panel/reclamos`). La hoja oficial dice explícitamente "quince (15) días hábiles,
     el cual es improrrogable". Corregido en los 4 lugares.
  2. **Campo faltante**: la hoja oficial exige "SI ES MENOR DE EDAD, NOMBRE DEL PADRE, MADRE O
     APODERADO" — el formulario solo tenía el checkbox "Soy menor de edad" sin capturar ese nombre.
     Agregado `apoderado_nombre` (columna nueva en `libro_reclamaciones`, campo condicional en el
     formulario público — obligatorio solo si el checkbox está marcado, validado en
     `validarReclamo()` — y mostrado en el detalle del admin panel y en la constancia imprimible).
  3. **Badge del footer**: `AvisoVirtual.pdf` (gráfico "Libro de Reclamaciones" con ícono de libro)
     se renderizó a PNG con PyMuPDF (`pip install pymupdf`, no había herramienta de conversión
     PDF→imagen en el entorno), se recortó al contenido real (sin el espacio en blanco de página A4
     completa) y se redujo a 480×328px — nuevo `public/libro-reclamaciones-badge.png` (primer uso
     de `next/image` en el proyecto: es un asset estático de build, no contenido de usuario, así
     que no aplica la razón por la que se evitó `next/image` en la sesión (14)). Ubicado en la
     columna "Soporte" del footer, envuelto en una tarjeta blanca con borde — el gráfico trae sus
     propios colores fijos (no seguía la paleta ni el dark mode), así que necesitaba un fondo
     siempre claro para no verse roto sobre el footer oscuro.
  - Tests actualizados (`reclamos.test.ts`, 158/158 en total): validación del apoderado obligatorio/
    no obligatorio según `esMenorEdad`. `npm run build`/`lint`/`tsc --noEmit` limpios, badge servido
    y visible verificado con `curl` (200, `image/png`, srcset de `next/image` presente en el HTML).
- **Por qué:** el usuario proporcionó los documentos oficiales de referencia después de implementado
  el Libro de Reclamaciones, para verificar exactitud contra el modelo real en vez de solo contra la
  ley en abstracto — encontró 2 discrepancias reales (plazo mal y campo faltante) que se corrigieron
  de inmediato.

### 2026-07-29 (15) — Libro de Reclamaciones (INDECOPI) + resolución del RUC
- **Qué cambió:** el usuario pegó el checklist de aprobación de comercio de Culqi/INDECOPI y pidió
  auditar si el proyecto lo cumplía (fork de solo lectura). Hallazgo principal: el **Libro de
  Reclamaciones no existía en absoluto** (0 resultados de "reclamaci"/"indecopi" en todo el repo) —
  es obligatorio por ley (D.S. 011-2011-PCE) para cualquier proveedor peruano, con o sin Culqi de
  por medio. El usuario pidió implementarlo y confirmó dos datos que faltaban:
  - **RUC**: `10708343931` (RUC 10, persona natural) — cargado en `src/lib/contacto.ts`, resuelve
    el pendiente abierto desde la sesión (7).
  - **Dirección física**: NO existe — el servicio se ofrece 100% en línea, sin local físico. Se
    optó por declararlo explícitamente (`ATENCION_100_VIRTUAL` en `contacto.ts`) donde antes iría
    una dirección, en vez de inventar una.
  1. **`docs/supabase-schema.sql`**: tabla nueva `libro_reclamaciones` (global, SIN `negocio_id` —
     es sobre SaaS Óptica como proveedor, no sobre un negocio-tenant) con los campos que exige
     INDECOPI (datos del consumidor, del bien contratado, detalle, pedido) + `numero` correlativo
     (`RC-000001`...) generado por una `sequence`, nunca por conteo (evita condición de carrera).
     RLS deny-all para anon/authenticated, mismo patrón que `pagos_saas`: contiene PII de un
     tercero que ningún negocio-tenant debe poder leer: el alta es EXCLUSIVA vía `service_role`.
  2. **`src/lib/reclamos.ts`** (nuevo, con tests): `validarReclamo()` (validación server-side) +
     `construirHtmlConstanciaReclamo()` — arma la constancia imprimible que la ley exige entregarle
     al consumidor, generada en el propio navegador (`window.print()`, mismo patrón que
     `lib/recibo.ts` de la sesión anterior). Esto es clave para el requisito explícito del
     checklist: "no puede depender de formularios, enlaces ni archivos externos como Google Drive".
  3. **`/api/libro-reclamaciones`** (POST, público, rate-limitado a 3 cada 10 min por IP): valida
     e inserta vía `service_role`, devuelve el `numero` de constancia.
  4. **`/libro-reclamaciones`** (página pública nueva, sin login): formulario completo (datos del
     consumidor, bien contratado, Reclamo/Queja, detalle, pedido) → al confirmar, muestra el N° de
     reclamo y un botón "Descargar/Imprimir constancia". Enlazado desde el footer de la landing y
     agregado a `sitemap.ts`.
  5. **`/admin-panel/reclamos`** (nuevo, cuarto ítem de `ADMIN_NAV`): lista cross-tenant de todos
     los reclamos (Server Component + `service_role`, mismo patrón que `/admin-panel/pagos`), con
     stat de "Pendientes de responder" y un `SlideOver` para ver el detalle completo y marcar como
     atendido con una respuesta — sin esto, el Libro hubiera quedado sin forma real de procesarse.
     `/api/admin/reclamos/actualizar` reusa el mismo patrón de autorización (membresía en
     `super_admins`) que `/api/admin/negocios/toggle-activo`. Modo mock: overrides por cookie
     (`MOCK_RECLAMOS_OVERRIDE_COOKIE`), mismo criterio que `mock-admin-overrides.ts` ya usaba para
     suspender/reactivar negocios.
  - Tests nuevos: `reclamos.test.ts` (validación + escape XSS de la constancia) — 156/156 en
    total. `npm run build`/`lint`/`tsc --noEmit` limpios.
- **Por qué:** cumplimiento legal obligatorio (INDECOPI), detectado al auditar el checklist de
  aprobación de Culqi que el usuario compartió — independiente de si Culqi lo exige o no, la ley
  peruana ya lo exigía y no existía.
- **Pendiente:** el resto de hallazgos del mismo checklist quedaron fuera de esta sesión a
  propósito (el usuario solo pidió estos dos): falta de íconos de redes sociales (dijo que son
  opcionales), "Política de cambios y devoluciones" como sección propia (hoy solo cubierta
  parcialmente por "Cancelación" en Términos), y el punto de "mínimo 5 productos con foto" no
  aplica tal cual al ser un SaaS por suscripción — a aclarar directamente con Culqi si hace falta.

### 2026-07-29 (14) — Análisis completo + 9 funciones nuevas y pase de adaptación mobile en tablas
- **Qué cambió:** a pedido explícito del usuario ("analiza todo mi proyecto, qué podemos
  añadir/implementar" y luego "agregamos todo lo que me dijiste, y adaptamos todo a móvil"), un
  análisis exploratorio (research en fork, sin tocar código) encontró oportunidades nuevas no
  trackeadas todavía en este documento, y se implementaron todas en la misma sesión:
  1. **Headers HTTP de seguridad** (`next.config.ts`) — CSP, `X-Frame-Options: DENY`,
     `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. Defensa en profundidad a
     nivel de navegador (clickjacking, MIME sniffing) que no existía; NO reemplaza RLS/proxy.ts,
     que siguen siendo el modelo de amenaza real. CSP con allowlist explícito para
     `checkout.culqi.com` (script + frame) y `*.supabase.co` (fetch + websocket de Realtime).
  2. **Recetas: Adición + comparación con receta anterior** — el campo `odAdicion`/`oiAdicion`
     YA EXISTÍA en el modelo de datos y en los mappers (sesión previa), pero el formulario de
     `/dashboard/citas` nunca lo exponía (solo esfera/cilindro/eje + DIP). Se agregó el input de
     Adición por ojo y un bloque que muestra la última receta guardada del mismo cliente al abrir
     el formulario, para ver progresión de la graduación de un vistazo.
  3. **Alerta de stock bajo en el dashboard principal** — ya existía como stat card (mismo peso
     visual que "Clientes"/"Ventas totales"), se sumó un banner explícito (mismo patrón que las
     alertas de trial/vencido) que nombra los productos afectados.
  4. **Recordatorio de citas por WhatsApp** (`/dashboard/citas`) — botón por fila que abre WhatsApp
     con un mensaje prellenado (nombre, fecha/hora, motivo), más un badge "Mañana" en las citas
     programadas para el día siguiente. Manual a propósito: automatizarlo pediría un cron + número
     de negocio verificado en la API de WhatsApp Business, fuera de alcance del MVP.
  5. **Informes enriquecidos** (`lib/informes.ts`, nuevo, con tests) — pestaña "Análisis" en
     `/dashboard/informes` junto al libro existente: ticket promedio, cliente más frecuente, top 5
     productos vendidos (por monto, con barra horizontal) y comparativa mensual de ingresos/egresos
     (últimos 6 meses, barras de dos series). Toda aritmética pura reusando datos ya existentes en
     `DataProvider`, sin tocar el schema.
  6. **Exportación de datos** — `lib/csv.ts` (RFC 4180 + BOM para que Excel en Windows respete
     tildes) con botón "Exportar CSV" en el libro de informes; `lib/recibo.ts` (HTML autocontenido,
     con tests de escape XSS) + botón "Imprimir recibo" por venta en `/dashboard/ventas` (abre
     ventana nueva, `window.print()`). No es comprobante SUNAT — eso sigue en el roadmap posterior
     al MVP.
  7. **Command palette (Ctrl+K)** — `CommandPalette.tsx`, navegación rápida a cualquier sección del
     dashboard aplanando `lib/dashboard-nav.ts` (misma fuente única que el sidebar y el tab bar
     mobile, respeta permisos granulares/soloAdmin). Botón visible "Buscar" en `DashboardTopbar`
     para quien no conoce el atajo, además del propio `Ctrl+K`/`⌘K`.
  8. **Deshacer tras eliminar** — `ToastProvider` ahora soporta una acción opcional en el toast
     (botón "Deshacer", con más duración visible que un toast normal). Aplicado a citas, gastos,
     proveedores y descuentos (deletes duros, sin papelera) y a clientes (ya tenía papelera propia,
     esto evita tener que navegar hasta ahí para el caso común de "me equivoqué recién"). Productos
     no lo necesitaba: no tiene delete real, ya usa el patrón Activo/Borrador.
  9. **Performance** — `react-day-picker` (usado por `DatePicker`/`DateRangePicker` en 7 rutas del
     dashboard) pasó a `next/dynamic({ ssr: false })`: se descarga recién al primer clic en el
     selector, no en el JS inicial de cada página. **`next/image` se dejó fuera a propósito**: los
     3 usos de `<img>` del proyecto son avatares/logos en base64 subidos por el usuario
     (`lib/imagen.ts`), y activar el optimizador de Next sobre contenido de usuario reintroduciría
     el mismo trade-off de `sharp` que una sesión anterior (10) decidió evitar deliberadamente.
  10. **Adaptación mobile de TODAS las tablas del dashboard y admin panel** — patrón tomado del
     proyecto hermano `tramys-rrhh` (`ocultar columnas secundarias con `hidden md:table-cell`/
     `lg:table-cell` en vez de depender solo de scroll horizontal): aplicado en productos, ventas,
     gastos, cotizaciones, proveedores, descuentos, informes, y las tablas cross-tenant del admin
     panel (`NegociosTable`, `PagosTable`). Se dejaron sin tocar `clientes` (ya angosta, todas sus
     columnas cargan una acción real) y `empleados` (la columna "Permisos extra" es el ÚNICO punto
     de entrada para gestionar permisos delegables — ocultarla en mobile los haría inalcanzables
     desde el celular, se detectó y revirtió antes de aplicarlo).
  - Tests nuevos: `citas.test.ts`, `descuentos.test.ts`, `informes.test.ts`, `csv.test.ts`,
    `recibo.test.ts` — 147/147 en total (eran 108). `npm run build`/`lint`/`tsc --noEmit` limpios
    después de cada pieza, no solo al final.
- **Por qué:** pedido explícito del usuario de analizar el proyecto completo en busca de mejoras,
  y luego implementar todo lo encontrado más una adaptación mobile total usando como referencia el
  patrón ya validado en `tramys-rrhh` (proyecto hermano del mismo usuario).
- **Pendiente:** ninguno nuevo de este pase — todo lo no implementado (facturación SUNAT, Culqi
  recurrente, RUC/régimen tributario, revisión legal, tests de RLS, credenciales reales) ya estaba
  trackeado arriba en "Pendientes activos" y sigue igual.

### 2026-07-28 (13) — Adaptación mobile del admin panel, fix de fechas, SEO, bug crítico del proxy, tokens de diseño y rate limiting
- **Qué cambió:** sesión de "usa las skills disponibles y dime/hazlo todo" — seis piezas
  independientes, en orden:
  1. **Adaptación mobile del admin panel** (`b4ae8e1`) — el usuario pidió que el patrón mobile ya
     aplicado al dashboard de negocio (sidebar oculto + tab bar, sesión anterior) se extendiera a
     TODAS las vistas. Se encontró que `AdminNav`/`AdminShell` nunca lo habían recibido: sidebar
     fijo de 240px sin `hidden md:flex` y `ml-60` sin condición — en un celular eso dejaba el
     contenido real comprimido a ~30% del ancho. Nuevos `AdminMobileHeader.tsx` (título + tema +
     cerrar sesión, cerrar sesión deliberadamente FUERA del tab bar por ser una acción distinta en
     peso a "ir a Resumen/Negocios/Pagos") y `AdminBottomTabBar.tsx` (los 3 destinos completos, sin
     "Más" — a diferencia del dashboard de negocio que sí colapsa ~10 secciones). `lib/admin-nav.ts`
     nuevo como fuente única, mismo criterio que `lib/dashboard-nav.ts`.
  2. **Fix de formato de fecha** (`6d324ab`) — `trialFin`/`proximoCobro` se mostraban como ISO
     crudo (`2026-08-28`) en `/dashboard` y `/dashboard/facturacion` en vez de `DD-MM-AAAA` (la
     convención de TODO el proyecto, que el usuario reiteró explícitamente). Bug puntual de las
     páginas reescritas en la sesión de Culqi (11), el resto del proyecto ya lo hacía bien.
  3. **SEO técnico completo** (`5c092e9`, skill `seo-optimizer`) — la landing no tenía nada:
     `metadataBase`/OpenGraph/Twitter card, `icon.tsx`/`apple-icon.tsx`/`opengraph-image.tsx`
     (generados con `next/og` — no hay logo real todavía, ver pendiente de marca), `robots.ts`/
     `sitemap.ts`, JSON-LD (`Organization` + `SoftwareApplication` con los planes reales de
     `lib/precios.ts` + `FAQPage` reusando el array del acordeón existente) y `generateMetadata`
     por pestaña en `/legal`. `noindex` en dashboard/admin-panel como defensa en profundidad.
  4. **Bug crítico encontrado en la revisión de seguridad manual** (`3fa33c0`) — sin remoto
     configurado, `/security-review` no pudo correr (`git diff` contra `origin/HEAD` falla), así
     que la revisión fue manual. Hallazgo: `proxy.ts` seteaba `x-negocio-id`/`x-super-admin` con
     `response.headers.set(...)` DESPUÉS de construir la respuesta — verificado contra el código
     fuente de Next.js y con un test real (`src/proxy.test.ts`) que Next.js solo reconstruye el
     request que ve un Server Component a partir de headers pasados dentro de `{ request: {
     headers } }` AL CONSTRUIR la respuesta. Con el bug, `dashboard/layout.tsx` y
     `admin-panel/(protegido)/layout.tsx` habrían redirigido a `/login` a CUALQUIER usuario real
     (autenticado, con tenant válido) apenas se conectara Supabase real — nunca se detectó porque
     el modo mock usa una cookie en su lugar. No es una vulnerabilidad de acceso (falla cerrado) pero
     sí un bug que hubiera roto el producto completo justo al "validar con negocios reales". La RLS
     seguía protegiendo los datos independientemente, tal como documentaba el comentario original.
  5. **Tokens de diseño formalizados** (skill `ui-design-system`, cuyo script generador tiene un
     bug real — `SyntaxError` en `design_token_generator.py`, no se pudo usar) — `docs/design-tokens.json`
     nuevo, formato W3C Design Tokens, a mano a partir de los valores YA validados en
     `globals.css`/`style-guide.md` (no regenerado desde un color base, para no divergir de los
     ajustes de accesibilidad/dark-mode ya hechos sesión a sesión). De paso, corregida una
     referencia obsoleta a `middleware.ts` en `style-guide.md` (Next.js 16 lo renombró a `proxy.ts`).
  6. **Rate limiting defensivo** (`src/lib/rate-limit.ts`, con tests) en `/api/registro` (5 cada
     10 min por IP) y `/api/pagos/culqi/cargo` (10 cada 5 min por IP) — best-effort en memoria
     (no compartido entre instancias serverless) mientras no exista un proyecto Vercel desplegado
     y enlazado para configurar la regla real de Vercel Firewall (comandos exactos dejados en
     "Pendientes activos" arriba, listos para pegar tras el despliegue).
  - `npm run build`/`lint`/`tsc --noEmit` limpios y `npm test` 108/108 (eran 98) en cada paso.
- **Por qué:** pedido explícito del usuario de analizar las skills disponibles, decir qué más
  sumar al proyecto, y luego "hazlo todo" — más la corrección puntual de fechas y la adaptación
  mobile global del admin panel, pedidas en mensajes separados de la misma sesión.
- **Pendiente:** `vercel:marketplace` para retomar el email marketing (scaffold retirado en una
  sesión anterior por no tener proveedor real conectado) queda sin tocar a propósito — reconstruir
  esa UI sin una integración real provisionada repetiría el mismo error que ya se corrigió una vez.
  Ver conversación: se le preguntó al usuario en qué estado quiere dejarlo.

### 2026-07-28 (12) — Pase de accesibilidad (skills de diseño) + analítica de uso en el admin panel
- **Qué cambió:** el usuario pidió usar las skills de diseño disponibles sobre el dashboard de
  negocio y el admin panel, y además pidió construir en el admin panel una vista de qué tanto usa
  el sistema cada negocio (frecuencia, día/hora, módulos). Dos partes:
  1. **Pase de accesibilidad real** (guiado por `ui-ux-pro-max` y la skill `dataviz` para los
     charts nuevos, no un rediseño visual completo — el sistema de diseño ya establecido en
     `docs/style-guide.md` se mantuvo intacto): se encontraron **~20 botones/links de solo-ícono**
     en todo el dashboard y el admin panel (`row-icon-btn` en clientes/citas/cotizaciones/gastos/
     productos/proveedores/empleados/descuentos/ventas, el chevron de `NegociosTable.tsx`, el
     cierre de `SlideOver.tsx` y el descarte de `ToastProvider.tsx`) que dependían SOLO de
     `title` para su nombre accesible — `title` no se anuncia de forma confiable en lectores de
     pantalla y no existe en touch. Se agregó `aria-label` explícito y descriptivo (con el nombre
     del registro cuando aplica, ej. "Eliminar a Juan Pérez") a los ~20. `SlideOver` en particular
     es de alto impacto: lo usan casi todos los formularios de alta/edición del dashboard.
  2. **Analítica de uso por negocio (admin panel)** — tabla nueva `eventos_uso` en
     `docs/supabase-schema.sql` (negocio_id, ruta, created_at; insert-only por el propio negocio
     vía RLS `negocio_id = current_tenant()`, sin policy de select — la lectura cross-tenant es
     exclusiva de `admin.ts`/service_role, mismo patrón que `pagos_saas`; purga diaria a los 90
     días vía pg_cron, mismo patrón que la papelera de clientes). `DataProvider.tsx` registra un
     evento fire-and-forget en cada cambio de `pathname` dentro de `/dashboard` (no en modo mock,
     no fuera del dashboard) — sin bloquear ni avisar nada si falla, es telemetría best-effort.
     - **`src/lib/uso.ts`** (nuevo, con 26 tests en `uso.test.ts`): aritmética pura sobre eventos —
       última actividad + etiqueta relativa ("Hace 3 d"), serie diaria (con ceros, no huecos),
       heatmap 7×24 día/hora, pico de uso, ranking de módulos más usados (reusa `lib/dashboard-nav.ts`
       para las etiquetas, una sola fuente con el sidebar/tab bar). Todo el agrupamiento por día/hora
       usa **America/Lima explícitamente** (`Intl.DateTimeFormat` con `timeZone`), no la hora del
       servidor — Vercel corre en UTC y "qué día/hora usa el sistema una óptica peruana" solo tiene
       sentido en su huso horario. Verificado con un test que cruza medianoche UTC y cae en el día
       de Lima correcto.
     - **`ActividadBarChart.tsx`** y **`ActividadHeatmap.tsx`** (nuevos, `components/admin/`):
       siguiendo la skill `dataviz` — sequential de un solo hue (azul de marca vía opacidad de
       `--color-primary`, más oscuro = más uso), 0 eventos con gris neutro (no transparente),
       leyenda "Menos→Más", resumen textual del pico como alternativa accesible al grid completo
       (heatmap accesibilidad grado B por diseño: 168 celdas no son navegables una por una, pero el
       dato que importa —el pico— sí está en texto).
     - **`/admin-panel/negocios/[id]`**: nueva sección "Uso del sistema" con 3 stat cards (última
       actividad, eventos 30d, módulo más usado), el gráfico de barras (14 días) y el heatmap.
     - **`/admin-panel/negocios`**: columna "Última actividad" + badge "Sin uso" (≥14 días sin
       actividad, solo en negocios activos y sin cancelar) + filtro nuevo en el `<select>`.
     - **`/admin-panel`** (resumen): tarjeta "Sin uso reciente" junto a "Por vencer" — señal de
       riesgo de abandono que `suscripciones` sola no puede dar (un trial puede seguir "vigente"
       semanas sin que nadie entre).
     - **Datos mock deterministas** (`MOCK_ADMIN_EVENTOS_USO`, sin `Math.random`) con 3 patrones a
       propósito sobre los 5 negocios ya existentes: uso sano y reciente (adm-neg-2, premium),
       uso que se apagó hace 20 días (adm-neg-4, vencido — el caso de riesgo real) y un trial que
       se enfrió antes de decidir (adm-neg-5, por vencer en 3 días, sin actividad en los últimos
       12). Verificado sirviendo las 4 rutas en modo mock vía `curl` con `mock_admin_session=1`:
       "Hace 20 d" en el negocio inactivo, "Miércoles, 10:00–11:00" como pico, badge "Sin uso" y
       "Sin uso reciente" ambos presentes.
  - `npm run build`/`lint`/`tsc --noEmit` limpios, `npm test` 98/98 (eran 72).
- **Por qué:** pedido explícito del usuario de aplicar las skills de diseño disponibles a ambos
  paneles, y de construir del lado del admin una vista de "qué tanto se usa" cada negocio — señal
  de adopción/riesgo de abandono que hoy no existía en ningún lado del sistema.
- **Pendiente:** ninguno nuevo — la telemetría solo tendrá datos reales una vez exista el proyecto
  Supabase real (ver "Pendientes activos"); hasta entonces se verifica en modo mock como el resto
  del admin panel.

### 2026-07-28 (11) — Commit del trabajo pendiente + inicio de trabajo en Culqi
- **Qué cambió:** al iniciar la sesión había ~1400 líneas sin commitear de una sesión anterior que
  nunca se registró en esta bitácora (cupones con `aplicaA` aplicados de verdad en cotizaciones/
  ventas, buscador global en `/dashboard`, ficha de detalle de proveedor, `BottomTabBar.tsx` para
  nav mobile, nav extraída a `lib/dashboard-nav.ts`, tercera pestaña "Protección de datos" en
  `/legal` vía `LegalHub.tsx`, `anularVenta`, y remoción completa del scaffold de Marketing/
  campañas de email sin proveedor de envío real). Se verificó `build`/`lint`/`tsc --noEmit`/`test`
  (69/69) limpios, se revisó el diff completo para confirmar coherencia, y se commiteó
  (`605249a`). El usuario confirmó: aún no tiene cuenta Culqi activada (KYC pendiente de su lado),
  así que a partir de acá el trabajo de Culqi es solo de código, sin poder probar contra la API
  real.
- **Trabajo de Culqi (bug real encontrado y corregido, no solo "conectar credenciales"):**
  el checkout de `/dashboard/facturacion` y `/api/pagos/culqi/cargo` estaban desconectados de los
  2 planes pagos reales (`lib/precios.ts`: Básico S/89.90, Premium S/149.90, con oferta anual) —
  cobraban un monto fijo de S/49 (`MONTO_PLAN_PRO_CENTIMOS` en el componente, ni siquiera el mismo
  valor que `CULQI_MONTO_PLAN_PRO_CENTIMOS` del env, que eran DOS constantes distintas
  desincronizadas) y siempre activaban `plan: "premium"` sin importar qué se cobrara. Ya estaba
  anotado como pendiente desde la bitácora (12). Corregido:
  1. **`lib/precios.ts`**: nueva `montoCentimosSegunCiclo(planId, ciclo)` — única fuente del monto
     real a cobrar, deriva de `PLANES` + `precioSegunCiclo` (la misma aritmética que ya usa la
     landing). Devuelve `null` si el `planId` no existe, nunca un monto por defecto silencioso.
  2. **`/dashboard/facturacion`**: reescrita para dejar elegir Plan (Básico/Premium, con precio,
     bullets y badge "Plan actual" si coincide con la suscripción activa) + Ciclo (mensual/anual,
     mismo `SegmentedControl` y badge de oferta que la landing) ANTES de pagar — antes solo había
     un botón "Activar plan Pro" a precio fijo, sin elegir nada.
  3. **`CulqiCheckoutButton`**: recibe `planId`/`ciclo` además del monto (que solo usa para lo que
     Culqi muestra en su propio modal) y los reenvía al servidor.
  4. **`/api/pagos/culqi/cargo`**: el monto a cobrar YA NO se recibe del cliente ni de un env var —
     se recalcula server-side con `montoCentimosSegunCiclo(planId, ciclo)` a partir del `planId`
     que sí puede elegir el cliente. Esto es a propósito una corrección de seguridad, no solo de
     UX: con el código anterior un cliente que editara el JS del navegador para mandar un monto
     distinto se hubiera cobrado lo que quisiera. La suscripción activa ahora `plan: planId` (el
     que realmente se pagó) y calcula `proximo_cobro` a 30 días (mensual) o 365 (anual), en vez de
     30 fijo siempre.
  5. Quitado `CULQI_MONTO_PLAN_PRO_CENTIMOS` de `.env.example`/`.env.local` — ya no hace falta, el
     monto sale siempre de `lib/precios.ts`.
  6. 3 tests nuevos para `montoCentimosSegunCiclo` en `precios.test.ts` (72 en total, eran 69).
  - Verificado sirviendo `/dashboard/facturacion` en modo mock (`mock_session=1` vía `curl`, sin
    Playwright disponible en este entorno): los 2 planes muestran S/89.90 y S/149.90 reales, el
    toggle Mensual/Anual y el badge de oferta aparecen, y el aviso "Culqi no está configurado
    todavía" sigue mostrándose correctamente (esperado, sin llaves reales). `build`/`lint`/
    `tsc --noEmit`/`test` (72/72) limpios.
- **Por qué:** el usuario pidió resolver "todos los pendientes que necesites" y avanzar la
  integración de Culqi ("ir armando la interfaz... y ya realizarlo"); como no tiene cuenta Culqi
  activada todavía, "realizarlo" se interpretó como dejar el código lo más completo y correcto
  posible del lado de la app, no activar una cuenta real (eso requiere que el usuario complete el
  KYC de Culqi, no es delegable).
- **Pendiente:** activar la cuenta Culqi real y probar el cargo/webhook de punta a punta contra la
  API real (sigue en "Pendientes activos" arriba) — el shape exacto de la respuesta de Culqi
  (`cargo?.source?.type` para distinguir tarjeta/Yape) es la mejor lectura disponible sin
  credenciales reales, igual que antes.

### 2026-07-25 (10) — Análisis completo del proyecto + los 6 hallazgos corregidos
- **Qué cambió:** a pedido del usuario ("analiza todo el proyecto y dime qué falta, si hay un bug
  o algo que debemos mejorar"), se hizo una revisión sistemática (build/lint/tsc/tests, búsqueda
  de `TODO`/`console.log`/`any`/`eslint-disable`, superficie de seguridad —
  `dangerouslySetInnerHTML`, uso de `service_role`, `npm audit` —, y prueba en vivo de los
  componentes nuevos de la sesión en viewports angostos) y luego se corrigieron los 6 hallazgos
  accionables (excluidos a propósito los que dependen de Supabase/Culqi reales, ya trackeados):
  1. **Recorte de popovers en pantallas angostas** — `DateRangePicker.tsx` y `ColorWell.tsx`
     clampeaban la POSICIÓN al viewport pero no el ANCHO: en 320px (iPhone SE) medí `left: -8px`.
     Corregido clampeando también el ancho (`Math.min(anchoDeseado, innerWidth - margen*2)`).
     Reverificado en 320px: ambos quedan dentro del viewport.
  2. **Sin límite en el logo subido** (`dashboard/ajustes`) — un archivo sin comprimir se
     guardaba tal cual en `negocios.logo_url` (columna `text`, sin Storage), leída en CADA carga
     del dashboard. Nuevo `src/lib/imagen.ts` (`prepararImagen`): rechaza no-imágenes y >8MB,
     redimensiona a máx. 512px vía canvas, recodifica a JPEG (o PNG si el original ya era PNG,
     por la transparencia). Probado con una imagen de prueba de 3000×2000px generada en el momento:
     quedó en 512×341px / 4KB, proporción conservada. El rechazo por tamaño también se probó
     (19.7MB → toast de error, visible en captura).
  3. **`negocios.color_primario` sin constraint en la DB** — la validación de hex solo vivía en
     el cliente (`ColorWell.tsx`). Agregado `constraint negocios_color_primario_formato check
     (color_primario is null or color_primario ~ '^#[0-9a-fA-F]{6}$')` en `supabase-schema.sql`,
     mismo patrón que los constraints ya existentes de `subdominio`.
  4. **`.env.example` sin versionar** — resultó que el archivo YA EXISTÍA en disco con buen
     contenido, el problema real era el `.gitignore` (`.env*` lo excluía sin excepción). Agregada
     `!.env.example`, confirmado con `git status` que ahora aparece como archivo nuevo listable.
  5. **DatePicker de fecha única** (`src/components/DatePicker.tsx`, nuevo) — reemplaza los 3
     `<input type="date">` nativos que quedaban: `clientes` (fecha de nacimiento), `gastos`
     (fecha del gasto), `cotizaciones` (vigencia hasta). Componente aparte de
     `DateRangePicker.tsx` (no un `modo` compartido): react-day-picker tipa `selected`/`onSelect`
     distinto en `mode="single"` vs `"range"`, forzar ambos en un solo componente genérico hubiera
     peleado con esos tipos sin ganar nada — se aceptó duplicar el poco boilerplate de
     posicionamiento (mismo criterio que ya usa `ColorWell.tsx`). Probado en los 3 lugares con
     Playwright, incluido el caso de mayor riesgo (dentro del `SlideOver` de clientes): sin
     recorte, sin errores de consola.
  6. **`SegmentedControl` con `role="tablist"` incluso donde no hay pestañas** — el toggle
     Mensual/Anual de precios no revela un panel distinto, es una elección excluyente: debería
     ser `radiogroup`/`radio`, no `tablist`/`tab` (un lector de pantalla anunciaba "Anual, pestaña
     2 de 2"). Agregada una prop `variante="tabs" | "opciones"` (default `"tabs"`, no rompe el uso
     existente en `FuncionesShowcase`); precios pasa `variante="opciones"`. Verificado con
     Playwright que cada uso expone el rol correcto (`radiogroup`/`radio` con `aria-checked` en
     precios; `tablist`/`tab` con `aria-selected` intacto en funciones).
  - `npm test` (62/62), `build`, `lint` y `tsc --noEmit` limpios después de cada fix, no solo al
    final.
- **Por qué:** pedido explícito de corregir todo lo encontrado en el análisis, excepto lo que
  depende de Supabase/Culqi reales (fuera del alcance de este pase).
- **Hallazgos NO corregidos, a propósito o por estar fuera de alcance:**
  - `npm audit`: 3 vulnerabilidades altas, pero viven en copias internas de `postcss`/`sharp` que
    trae **Next.js mismo** (su optimizador de imágenes) — confirmado que el proyecto no usa
    `next/image` en ningún lado (todo son `<img>` planos), así que `sharp` nunca se ejecuta con
    contenido de usuario. Riesgo real bajo; revisar cuando Next saque una versión parchada.
  - `FuncionesShowcase.tsx` usa `role="tablist"`/`"tab"` pero le falta el resto del patrón ARIA de
    tabs (`role="tabpanel"`, `aria-controls`/`aria-labelledby` enlazando tab↔panel) — hallazgo
    nuevo encontrado de paso al revisar el punto 6, no estaba en la lista original pedida, se
    deja anotado para una sesión futura en vez de ampliar el alcance de esta.
  - Todo lo ya trackeado en "Pendientes activos" que depende de Supabase/Culqi reales (RLS sin
    probar, Culqi sin probar, suscripción recurrente, legal sin revisión de abogado, marketing
    por email sin proveedor) — excluido a pedido explícito del usuario.

### 2026-07-25 (9) — Breadcrumbs, grupo de radios, date range picker y color well
- **Qué cambió:** el usuario pasó 4 referencias de patrón de NameThatUI y se aplicaron al proyecto
  (tres forks en paralelo). Resultado:
  1. **`Breadcrumbs.tsx`** montado una sola vez en `DashboardShell`; reemplazó el `← Inicio` que
     repetían las 13 páginas del dashboard. Como las rutas del dashboard son planas
     (`/dashboard/ventas`), el nivel intermedio (Comercial/Administración) sale de un mapa en el
     componente que replica la agrupación de `DashboardNav` — **acoplamiento explícito**: al
     agregar una ruta al sidebar hay que agregarla ahí también.
  2. **Bug real corregido — los radios no eran un grupo**: los 4 radios del formato de subdominio
     (`AuthPage.tsx` y `CompletarRegistroForm.tsx`) **no tenían atributo `name`**. Como React
     forzaba el `checked`, visualmente parecía andar, pero para el navegador eran controles
     sueltos: las flechas del teclado no movían la selección y un lector no anunciaba "1 de 2".
     Ahora comparten `name`, van dentro de `<fieldset>` + `<legend class="sr-only">` y usan una
     clase `.radio` propia en vez del estilo nativo. Verificado: la flecha ↓ mueve la selección.
  3. **`DateRangePicker.tsx`** (sobre `react-day-picker`, dependencia nueva) en los filtros de
     citas, ventas, gastos, informes y descuentos. El puente fecha civil ↔ `Date` vive en
     `src/lib/date.ts` con tests (62 en total ahora, eran 38).
  4. **`ColorWell.tsx`** para el color de marca en Ajustes.
- **El fork del date picker murió a mitad de trabajo** (límite de gasto de la cuenta, no un error
  de código) y **dejó `descuentos/page.tsx` roto**: usaba `<DateRangePicker>` sin haber agregado
  el import — `tsc`/`lint` fallaban aunque `next build` reportara "Compiled successfully" (el
  chequeo de tipos corre en un paso aparte). Corregido, y verificado además el caso que ese fork
  no alcanzó a probar: el calendario dentro del `SlideOver` de descuentos **no se recorta**
  (el popover se posiciona con `position: fixed` y coordenadas calculadas), semana en lunes,
  indicador de "hoy" presente, 0 errores de consola.
- **Pendiente:** las fechas ÚNICAS de formulario siguen con el calendario nativo del sistema —
  `clientes` (fecha de nacimiento), `gastos` (fecha del gasto) y `cotizaciones` (vigencia hasta).
  El pedido original era justamente sacarle el look del sistema a las fechas, así que falta un
  `DatePicker` de fecha única (o un `modo="single"` en el existente) para cerrarlo.

### 2026-07-25 (8) — FAQ como acordeón nativo
- **Qué cambió:** la sección de Preguntas frecuentes **no era un acordeón**: mostraba las 4
  respuestas siempre abiertas, una debajo de otra. Se rehízo con `<details>`/`<summary>` nativos
  (clase `.accordion-item` nueva en `globals.css`), siguiendo la referencia de NameThatUI que
  pasó el usuario:
  - **Elemento nativo, no `div` + `useState`**: así vienen gratis el teclado (Enter/Espacio), el
    estado expuesto a lectores de pantalla y que el Ctrl+F del navegador encuentre texto dentro
    de un panel cerrado y lo abra. Reimplementarlo a mano solo servía para perder todo eso.
  - **Sin `aria-expanded`** a propósito (la referencia lo remarca): `<details>` ya comunica su
    estado, duplicarlo puede terminar contradiciendo al real.
  - **"Solo una abierta a la vez" con el atributo `name` compartido**, sin una línea de JS.
  - Triángulo por defecto oculto + chevron de lucide que rota 180° con `group-open:`.
  - **Animación de apertura** vía `::details-content` + `interpolate-size: allow-keywords` (es lo
    que permite transicionar hacia `auto`) y `content-visibility` con `allow-discrete` para que el
    contenido no desaparezca de golpe al cerrar. Es mejora progresiva: sin soporte, abre y cierra
    igual, solo que sin animación.
  - `summary` se sumó a la regla global de `cursor: pointer` (no es `<button>` ni `[role=button]`,
    así que no la tomaba).
  - Verificado con Playwright de forma programática, no solo por captura: arranca todo cerrado,
    abrir una segunda cierra la primera (queda 1 abierta), Enter abre desde el teclado, y la
    altura del panel se anima de verdad (57 → 69 → 81 → 88 → 92 → 93 px).
  - Los 4 modos de fallo del prompt de debug de la referencia, descartados uno por uno con
    mediciones: (1) la altura anima; (2) el `name` deja una sola abierta; (3) no queda marcador
    duplicado (`list-style-type: none` + `summary` en `display:flex`); (4) un `<a>` inyectado
    dentro de un panel cerrado NO puede recibir foco — el contenido se oculta con el
    `content-visibility: hidden` nativo, no con `opacity`.
- **Ajuste posterior (mismo pedido del usuario: "da un brinco al expandir")** — medido, la
  respuesta ocupaba los 538px de la fila completa contra los ~200px que mide el texto de la
  pregunta: al abrir aparecía un bloque casi 3× más ancho que su propio título. Dos correcciones
  en el `<p>` de la respuesta:
  - `max-w-[44ch]` (≈408px) para que la respuesta no barra todo el ancho de la fila. **Ojo con el
    valor**: `58ch` resolvía exactamente a 538px acá, o sea que no acotaba nada — con esta
    tipografía `1ch` ≈ 9.3px.
  - `min-h-[calc(2lh+1rem)]` para que TODOS los paneles abran con la misma altura (56px) y cambiar
    de pregunta no mueva nada de lo que está debajo. El `+1rem` no es opcional: con
    `box-sizing: border-box` el `min-height` incluye el `pb-4`, así que `2lh` a secas dejaba las
    respuestas de una línea en 40px y las de dos en 56px.
  - Verificado: los 4 paneles miden 56px y el desplazamiento del contenido de abajo al saltar de
    la respuesta más larga a la más corta es **0px** (antes 16px).
- **Por qué:** pedido explícito del usuario con la referencia de patrón adjunta.

### 2026-07-25 (7) — Oferta anual excluyente, datos de contacto reales, FAB de WhatsApp y crédito de autoría
- **Qué cambió:** el usuario pidió cerrar la contradicción de la oferta anual, cargar sus datos
  reales y sumar el crédito de autoría. Se explicó el plan ANTES de tocar código (a pedido
  explícito: "antes de iniciar dime lo que harás") y se confirmaron dos decisiones con él:
  1. **La oferta anual ahora es UNA sola, garantizado por el tipo** (`src/lib/precios.ts`):
     `OFERTA_ANUAL` pasó de dos constantes sueltas (`DESCUENTO_ANUAL` + `MESES_GRATIS_ANUAL`, que
     se comunicaban juntas y se contradecían — 30% ≈ 3.6 meses, no 2) a una **unión discriminada**:
     `{ tipo: "descuento", porcentaje }` | `{ tipo: "meses_gratis", meses }`. TypeScript hace
     imposible configurar ambas. El precio anual, el badge del toggle (`etiquetaOferta()`) y la
     frase explicativa (`descripcionOferta()`) se derivan del tipo elegido y **siempre hablan en
     la misma unidad**. Elegido por el usuario: `{ tipo: "meses_gratis", meses: 2 }` → vuelve a
     S/899 y S/1499 (mensual × 10), que era el precio original y es el estándar del rubro.
  2. **Datos reales** en `src/lib/contacto.ts`: WhatsApp `51931314659` (el `51` es el prefijo de
     Perú; wa.me exige formato internacional sin `+` ni espacios) y `jfhrdeveloper@gmail.com`.
  3. **`WhatsAppFab.tsx` (nuevo)**: botón flotante abajo a la derecha, solo en la landing (en el
     dashboard estorbaría sobre las tablas). Server Component — es un `<a>` con href fijo, el
     tooltip que se expande al hover es CSS puro. Verde oficial de WhatsApp a propósito, no la
     paleta de marca: el color ES la señal de qué hace el botón.
  4. **`CreditoJFHR.tsx` (nuevo)**: "Desarrollado por JFHR" → `jfhrdeveloper.com`, en el footer de
     la landing y al pie de las TRES pantallas de acceso (login y registro de negocios, login del
     panel del SaaS). Va del lado del formulario y no en el panel de marca porque ese panel está
     oculto en móvil (`hidden md:flex`) y el crédito desaparecería en el celular.
  - **Bug encontrado en la verificación**: en móvil el FAB de WhatsApp tapaba el link "Política de
     privacidad" de la última fila del footer, dejándolo sin poder clickear. Corregido con
     `pb-24 sm:pb-8` en el footer; verificado programáticamente comparando los `boundingBox` de
     ambos elementos, no solo mirando la captura.
  - `npm test` (38/38), `build`, `lint` y `tsc --noEmit` limpios. Verificado con Playwright: badge
    "2 meses gratis" con precios S/899/S/1499, frase de oferta en la misma unidad, href real de
    WhatsApp, crédito visible en las 3 pantallas de acceso, y el footer móvil sin solape.
- **Por qué:** pedido explícito del usuario, que además pidió confirmar el entendimiento y el plan
  antes de implementar.
- **Pendiente:** los textos legales de `/legal` los va a redactar el propio usuario (la estructura
  y el ruteo ya están listos, solo se reemplaza la prosa). Queda sin decidir el RUC/régimen
  tributario — ver el pendiente activo nuevo arriba, del que depende qué nombre ve el cliente en
  el cobro de Culqi.

### 2026-07-25 (6) — Radio único de botón, segmented control deslizante, oferta anual, legales y PRIMEROS TESTS
- **Qué cambió:** el usuario pidió implementar todo lo recomendado en el análisis del proyecto
  (salvo lo que depende de Supabase) más varios ajustes de UI concretos:
  1. **Un solo radio de botón en todo el sitio**: `.btn-primary`/`.btn-outline` pasaron de
     `rounded-lg` a `rounded-full` en `globals.css`. Antes los únicos `rounded-full` eran los dos
     botones del navbar, puestos a mano en el JSX — ahora es el default y esos overrides sueltos
     se borraron. Un solo punto de cambio, sin tocar botón por botón.
  2. **`SegmentedControl.tsx` (nuevo, reutilizable)**: un solo bloque (track) con una píldora que
     se DESLIZA entre opciones. Reemplaza las 7 píldoras sueltas de las pestañas de funciones y
     el toggle Mensual/Anual de precios (que ya era un segmented control pero sin animación).
     - El indicador se posiciona escribiendo `transform`/`width` sobre el nodo vía ref, **no con
       estado de React**: es una medida derivada del DOM ya pintado; pasarla por estado sumaría un
       render por cada cambio y chocaría con la regla `react-hooks/set-state-in-effect` del
       proyecto sin ganar nada. La transición se habilita recién tras el primer posicionamiento
       (si no, al montar animaría desde `translateX(0)` con ancho 0 — se ve como un glitch).
     - Re-mide en `resize`: los anchos cambian con el viewport y una medida única queda desfasada.
  3. **Estado activo con contraste real**: el nav marcaba el link activo con fondo azul claro +
     texto azul (todo el mismo tono, casi no se distinguía). Ahora es fondo primario sólido +
     texto blanco, igual que el indicador del segmented control — "lo seleccionado" se ve igual
     en toda la landing.
  4. **Oferta anual configurable** (`src/lib/precios.ts`, nuevo): `DESCUENTO_ANUAL = 0.30` y
     `MESES_GRATIS_ANUAL = 2` como constantes; el precio anual, el ahorro mostrado y el badge
     "-30%" del toggle se DERIVAN de ellas (antes los montos anuales estaban escritos a mano en
     el componente). El mensaje de "2 meses gratis" aparece solo al elegir Anual, justo encima de
     la franja de confianza. La lógica salió del componente a `lib/` para poder testearla.
  5. **Páginas legales reales** (`/legal?tab=terminos|privacidad`, patrón de ferdocs-web) +
     **`AvisoTransparencia.tsx`** (modal desde el footer, contraparte del "aviso de transparencia"
     de ferdocs — allá aclara que no son el Estado, acá cómo se tratan los datos de salud) +
     `src/lib/contacto.ts` con WhatsApp/email/razón social configurables. Los tres "(pendiente)"
     del footer se reemplazaron por links reales.
  6. **PRIMEROS TESTS del proyecto** (vitest, entorno `node`, `npm test`): 38 tests sobre la
     lógica pura que no depende de Supabase — `slug.ts` (es el subdominio del negocio y NO se
     puede cambiar tras el registro, así que un slug mal generado es un error permanente),
     `date.ts` (fija el bug de zona horaria de la sesión (12) para que nadie lo "simplifique" de
     vuelta a `new Date()`) y `precios.ts` (aritmética de dinero mostrada al cliente). Los tests
     de precios se escriben contra las CONSTANTES, no contra montos fijos: cambiar la oferta no
     los rompe sin motivo.
  - `npm test` (38/38), `npm run build`, `npm run lint` y `tsc --noEmit` limpios. Verificado con
    Playwright: deslizamiento del indicador en funciones y en precios, badge -30% con precios
    derivados (S/755.16 y S/1259.16), mensaje de meses gratis, modal de transparencia abriendo y
    cerrando con Escape, ambas pestañas de `/legal`, y el dashboard/login con el radio nuevo de
    botón (0 errores de consola en todas).
- **Por qué:** pedido explícito de implementar el plan del análisis salvo lo que depende de crear
  el proyecto Supabase real, más los ajustes de UI puntuales del mismo mensaje.
- **Pendiente / a revisar con el usuario:**
  - **Los textos legales NO están revisados por un abogado.** Son una base redactada según la Ley
    N° 29733 y su reglamento, pero el tratamiento de datos de salud (graduaciones/recetas, dato
    sensible) exige revisión profesional antes de operar con clientes reales. Está anotado también
    dentro del propio `src/app/legal/page.tsx`.
  - **`WHATSAPP_NUMERO` y `EMAIL_SOPORTE` son placeholders** (`51999999999`,
    `soporte@saasoptica.pe`) en `src/lib/contacto.ts` — reemplazar por los reales antes de lanzar.
  - **La oferta anual se contradice numéricamente:** 30% de descuento equivale a ~3.6 meses
    gratis, no a 2. Hoy se comunican las dos cosas juntas (badge "-30%" + "2 meses gratis"), que
    es contar el mismo beneficio dos veces y además subvalúa la oferta. Se implementó tal cual se
    pidió y ambos valores son constantes, así que ajustarlo es cambiar una línea — pero conviene
    decidir si el mensaje es el descuento O los meses, no ambos.
  - Los tests cubren lógica pura; **la RLS (el aislamiento entre ópticas, que es el riesgo real
    del producto) sigue sin cobertura** porque necesita un Supabase de verdad contra el cual
    correr. Es el siguiente test a escribir apenas exista el proyecto.

### 2026-07-25 (5) — Navbar "píldora flotante" + footer de 4 columnas (patrón ferdocs-web)
- **Qué cambió:** el usuario pidió que el navbar de la landing fuera como el de su proyecto
  hermano `ferdocs-web` (`../ferdocs-web/src/components/layout/Navbar.tsx`) y una recomendación
  de footer. Se analizaron ambos componentes de ese proyecto y se portaron los patrones,
  adaptados a la paleta de este (azul primario, no el gris "rosewood" de ferdocs):
  1. **`LandingHeader.tsx` reescrito como píldora flotante**: `fixed` en vez de `sticky` (con
     `sticky` la barra ocupa espacio en el flujo al inicio y empuja el hero, rompiendo el efecto
     flotante — por eso el hero pasó de `py-20` a `pb-20 pt-32`). Transparente arriba →
     `rounded-full` + `bg-white/80` + `backdrop-blur-xl` + sombra + borde al bajar, con
     `pt-6`→`pt-4`. Divisores verticales que aparecen con el fondo. 2 CTAs (`Iniciar sesión`
     outline + `Prueba gratis` sólido), ambos `rounded-full`.
  2. **Estado activo por scroll-spy** (`IntersectionObserver` con `rootMargin` recortando a una
     franja central): el link de la sección visible gana su propia píldora `bg-primary-light` +
     `ring`. Es la adaptación del estado activo de ferdocs, que allá se deriva de `pathname`
     porque tiene rutas reales; acá la landing es una sola página con anclas.
     - **Caso borde encontrado y corregido**: la ÚLTIMA sección (`#contacto`, el footer) nunca
       llega a la franja central del observer — se queda pegada al borde inferior del viewport,
       así que "Contacto" no se marcaba activo NUNCA. Se agregó una comprobación de
       "scroll al fondo" en el handler de scroll que fuerza la última sección.
  3. **Menú móvil que antes no existía**: los links de sección eran `hidden sm:flex` sin
     alternativa alguna — desde el celular no había forma de llegar a Funciones/Precios/Contacto.
     Se agregó hamburguesa + panel lateral deslizante desde la derecha con overlay, bloqueo del
     scroll de fondo y los 2 CTAs fijos abajo (mismo patrón que el panel móvil de ferdocs).
  4. **Footer rehecho con la estructura de 4 columnas de ferdocs** (`Footer.tsx` de ese proyecto):
     marca + descripción / Producto / Cuenta / Por qué nosotros (los 3 badges de confianza que
     antes estaban sueltos en una línea), `<hr>` y barra inferior con copyright + legales. Antes
     era una sola línea centrada de texto plano que se veía sin terminar.
     - Se enlaza SOLO a rutas que existen (`#funciones`, `#precios`, `/login`, `/registro`);
       términos/privacidad/WhatsApp siguen como texto marcado "(pendiente)" en vez de links
       rotos, porque esas páginas no están construidas (ver Pendientes activos).
  5. **`.nav-link-underline` renombrada a `.link-underline` y movida al footer**: el underline
     izquierda→derecha que el usuario pidió en la sesión (4) era para el nav superior, pero el
     patrón de ferdocs usa píldora de fondo en hover — las dos cosas juntas se ven cargadas. El
     efecto se conservó aplicándolo a los links de columna del footer, donde no compite con nada.
  - `npm run build`/`lint`/`tsc --noEmit` limpios. Verificado con Playwright: píldora transparente
    → sólida en scroll, "Precios" marcándose activo al llegar a esa sección, "Contacto" activo al
    fondo (aserción programática, no solo captura), panel móvil abriendo con overlay, footer de 4
    columnas.
- **Por qué:** pedido explícito del usuario de unificar el navbar con el de su otro proyecto, más
  una recomendación de footer que se implementó directamente (mismo precedente de "IMPLEMENTA LO
  QUE DICES" de la sesión (2)).
- **Pendiente:** el navbar de ferdocs tiene 2 cosas más que NO se portaron por no aplicar todavía
  acá — un buscador global con atajo `Ctrl+K`/`⌘K` (esta landing no tiene qué buscar; tendría
  sentido dentro del dashboard, no en la landing) y un dropdown de sección con submenú (ferdocs
  tiene 8 entidades; acá los 3 links caben planos). Revisar si el dashboard se beneficia del
  buscador cuando haya datos reales.

### 2026-07-25 (4) — Login admin: ancho + labels + Google real, underline nav, quitar "Ver funciones"
- **Qué cambió:** feedback directo del usuario tras revisar el rediseño del login admin de la
  sesión anterior — seguía sin verse igual al de negocios:
  1. **Formulario "estirado" corregido**: el form del login admin ocupaba TODO el ancho de su
     mitad de pantalla; `LoginForm` en `AuthPage.tsx` en cambio va en `mx-auto w-full max-w-sm`.
     Se aplicó el mismo wrapper + labels arriba de cada input (antes solo placeholder, sin label).
  2. **Botón "Continuar con Google" real, no decorativo** — `GoogleIcon`/`DivisorO` (antes
     locales a `AuthPage.tsx`) se extrajeron a `src/components/auth/GoogleAuthUi.tsx`,
     compartidos entre ambos logins. El botón funciona de verdad, no es solo visual:
     - `src/app/auth/callback/route.ts` ahora chequea `super_admins` ANTES que `empleados` —
       antes, un super_admin autenticándose con Google cascaba siempre a `/registro/completar`
       (`empleados.negocio_id` es NULL para un super_admin, nunca tiene negocio).
     - `src/proxy.ts`: el bloque del subdominio `admin` ahora deja pasar `/auth/callback` sin
       exigir sesión (mismo criterio que `/auth/confirm` en el dominio raíz) — sin este bypass,
       el exchange de código de Supabase (que crea la sesión) nunca llegaba a ejecutarse, porque
       el gate "sin sesión → /login" del subdominio admin lo interceptaba antes.
  3. **Underline de izquierda a derecha en el nav de la landing** (`Funciones`/`Precios`/
     `Contacto`) — clase nueva `.nav-link-underline` en `globals.css` (`scaleX` + `transform-origin:
     left`, no anima `width` a propósito, corre en el compositor).
  4. **Botón "Ver funciones" del hero eliminado** (a un costado de "Prueba gratis 30 días") — a
     pedido explícito, aclarando que la sección `#funciones` en sí y su link en el nav quedan
     intactos, solo se quitó ese botón puntual del hero.
  - `npm run build`/`lint`/`tsc --noEmit` limpios. Verificado con Playwright: ancho del form
    (comparado visualmente con el login de negocios), botón de Google presente, login por email
    sigue funcionando de punta a punta en modo mock, underline visible en hover, hero sin el
    botón.
- **Por qué:** el usuario señaló que el login admin seguía sin sentirse "igual" al de negocios
  pese al rediseño de la sesión anterior — el gap real era el ancho del form + labels + Google,
  no el layout general (panel de marca + form), que ya estaba bien.
- **Pendiente:**
  - Quedó una duda sin resolver del mismo mensaje del usuario ("al hacer hover en estos botones
    se oscurece, es medio raro") — no se identificó con certeza a qué botones se refería
    exactamente (candidato más probable: `.btn-primary` oscurece de `#2563EB` a `#1E40AF` en
    hover, un patrón usado en TODO el sitio). Se dejó sin tocar a propósito para no cambiar un
    patrón global sin confirmar qué se ve mal — pendiente de que el usuario aclare o mande una
    captura.
  - El usuario dejó material de diseño nuevo en `diseno-referencia/` (`MedTrackr Dashboard`,
    `Optica Recsad Patterns`, `Oripio Calendar`, `Sidebar Nav`, `Zendenta Stocks`, + imágenes/
    videos) — un fork quedó analizándolo en paralelo, resultado pendiente de revisar con el
    usuario cuando termine.
  - El flujo de Google para super_admins nunca se probó contra credenciales reales (Supabase real
    + Google OAuth siguen sin configurar, ver "Pendientes activos" — mismo bloqueo que el resto
    del proyecto). El bootstrapping de un super_admin vía Google (primero inicia sesión para
    generar el `auth.users`, luego se inserta a mano en `super_admins` con ese UUID) no está
    documentado todavía en el POST-INSTALACIÓN del schema — solo el flujo de email/password.

### 2026-07-25 (3) — Cursor pointer global, navbar transparente, ancla tapada, login admin split-screen
- **Qué cambió:** 4 correcciones puntuales pedidas por el usuario tras usar el sitio:
  1. **Cursor pointer en botones, sitio completo** (`globals.css`, `@layer base`): el Preflight
     de Tailwind v4 (y el UA stylesheet nativo) dejan `<button>` en `cursor: default` — solo
     `<a>` trae `pointer` de fábrica. Confirmado con Playwright (`getComputedStyle`) que TODOS
     los `<button>` del sitio (login, registro, slide-overs, toggles) tenían `cursor: default`;
     "¿Olvidaste tu contraseña?", "Prueba gratis"/"Inicia sesión" (toggle login↔registro),
     "Ingresar", "Continuar con Google", etc. Regla nueva `button:not(:disabled), [role="button"]
     { cursor: pointer }` — corrige los mencionados y cualquier otro botón del proyecto de una
     sola vez, sin parchear componente por componente.
  2. **Navbar de la landing transparente** — nuevo `LandingHeader.tsx` (client component,
     reemplaza el `<header>` inline de `page.tsx`). Primer intento (`bg-transparent` fijo) rompía
     visualmente: verificado con Playwright que al hacer scroll el texto de las secciones de
     abajo pasaba por detrás del nav y se superponía con los links ("lugar." del H1 solapado con
     "Contacto"). Corregido con el patrón estándar: transparente solo en el tope (`scrollY <= 8`),
     gana `bg-white/90 backdrop-blur` (mismo estilo que antes) recién al bajar — listener de
     scroll con `useState`+`useEffect`.
  3. **"Ver funciones" quedaba tapado por el navbar sticky** — la sección `#funciones` no tenía
     `scroll-mt-*`, así que el ancla saltaba justo debajo del header (parcialmente oculta). Se
     agregó `scroll-mt-20` a la sección. Verificado con Playwright: clic en "Ver funciones" ahora
     deja "TODO LO QUE NECESITAS" completamente visible bajo el nav.
  4. **Login del admin-panel sin el mismo lenguaje visual que el login de negocios** — antes era
     una card centrada simple; `AuthPage.tsx` (login/registro de negocios) usa un patrón
     split-screen con panel de marca en gradiente + círculos decorativos (sesión previa, "panel
     split-screen animado"). Reescrito `admin-panel/login/page.tsx` con el mismo lenguaje visual
     (gradiente `from-primary-dark via-primary to-primary-light`, círculos, heading + bullets con
     `Check`, footer de copyright, cabecera compacta en mobile) — sin el toggle animado
     login↔registro de `AuthPage.tsx`: el admin-panel no tiene alta self-service, un solo
     formulario no necesitaba esa complejidad.
  - `npm run build`/`lint`/`tsc --noEmit` limpios. Verificado con Playwright: cursor pointer
    (`getComputedStyle`), navbar transparente→sólido en scroll (capturas antes/después), ancla de
    funciones sin solape, login admin en desktop y mobile, y el flujo de login completo
    (mock → redirige a `/admin-panel`) tras el rediseño.
- **Por qué:** feedback directo del usuario tras probar la landing y ambos logins ("IMPLEMENTA LO
  QUE DICES" en el mensaje anterior ya había sentado el precedente de aplicar sin pedir
  confirmación intermedia).
- **Pendiente:** nada nuevo.

### 2026-07-25 (2) — Research de diseño de Finegym + 3 ajustes de landing
- **Qué cambió:** un fork analizó el DISEÑO VISUAL (paleta/tipografía/componentes reales vía
  `getComputedStyle()`, no solo el HTML) del material de Finegym en `diseno-referencia/`,
  comparado contra `docs/style-guide.md`. Halló que el azul primario de Finegym coincide
  exactamente con `--color-primary` (sin gap), que su tipografía no vale la pena copiar (usa el
  stack default del navegador, no una fuente custom real pese al `<link>`), y que su tabla de
  precios distingue el plan destacado SOLO con un `ring-2` de color, sin invertir el fondo de la
  card. A pedido explícito del usuario ("IMPLEMENTA LO QUE DICES") se aplicaron 2 de las 3
  recomendaciones (la 3ª ya estaba implementada):
  1. **Eyebrow en el hero** (`src/app/page.tsx`): línea "SOFTWARE PARA ÓPTICAS PERUANAS" en
     `text-primary` sobre el H1, mismo patrón de clase que ya usaba la sección de Funciones.
  2. **Tarjeta de plan destacado sin relleno** (`PreciosSection.tsx`): el plan Premium pasó de
     `bg-primary` sólido + texto blanco a `card` normal + `ring-2 ring-primary`, con el botón
     "Empezar gratis" como `btn-primary` (antes botón blanco sobre fondo azul). Se ve más
     consistente con el resto de cards del sitio y menos "grito visual".
  3. **CTA final full-bleed en azul oscuro** — el fork lo marcó como recomendación, pero
     revisando el código ya existía (`bg-primary-dark` a pantalla completa antes del footer,
     construido en una sesión anterior). No se tocó, solo se confirmó.
  - Además se corrigió una desactualización real que encontró el fork: `docs/style-guide.md`
    decía "modo oscuro desactivado a propósito" cuando en realidad está implementado de verdad
    desde la sesión 2026-07-24 (9) (toggle, persistencia, `dark:` en todas las clases
    reutilizables) — el doc nunca se había actualizado después de esa sesión.
  - `npm run build`/`lint`/`tsc --noEmit` limpios. Verificado con Playwright (hero, precios, CTA
    final) que los 2 cambios visuales renderizan como se esperaba.
- **Por qué:** el usuario pidió analizar el diseño de Finegym en un fork (separado del análisis
  de contenido/precios de la sesión anterior) y luego implementar directamente las
  recomendaciones resultantes, sin paso intermedio de confirmación.
- **Pendiente:** nada nuevo — mismos pendientes que el resto del proyecto (ver "Pendientes
  activos" arriba, todo sigue en modo mock sin Supabase/Culqi real).

### 2026-07-25 (1) — Admin panel completo: sidebar, negocios, detalle + suspender, pagos + MRR
- **Qué cambió:** el usuario preguntó cómo visualizar el panel admin (Fase 5) sin credenciales
  reales, y luego pidió explícitamente ampliarlo ("dime que mas se puede añadir" → eligió "todo"
  en una pregunta de priorización). Dos partes:
  1. **Modo mock extendido al admin-panel** (antes solo cubría el dashboard de negocio): cookie
     separada `mock_admin_session` (credenciales `admin@saas.pe`/`admin1234`), gate por cookie en
     `admin-panel/(protegido)/layout.tsx` igual que `dashboard/layout.tsx`, datos falsos nuevos en
     `mock-data.ts` (`MOCK_ADMIN_NEGOCIOS/SUSCRIPCIONES/EMPLEADOS/PAGOS`, 5 negocios con estados
     variados incluido uno a 3 días de vencer el trial).
  2. **Admin panel real, no solo el resumen de una página que ya existía:**
     - `AdminShell`/`AdminNav` (nuevos, `src/components/`): sidebar fijo propio del namespace
       admin-panel (Resumen/Negocios/Pagos), sin depender de `DataProvider`/`SessionProvider`
       (esos son del namespace de negocio). `admin-panel/layout.tsx` perdió su wrapper
       `max-w-4xl` (ahora cada sub-área trae el suyo: `AdminShell` o el login centrado).
     - Login del admin (`admin-panel/login/page.tsx`) rediseñado: card centrada, ícono de marca,
       tipografía `font-display`, consistente con el resto del sitio (antes era un form suelto
       sin ningún tratamiento visual).
     - `/admin-panel/negocios` (nuevo): tabla completa vía `NegociosTable.tsx` — búsqueda,
       filtro por estado incluido **"por vencer"** (trial a ≤7 días, `badge-warning "Vence en Nd"`).
     - `/admin-panel/negocios/[id]` (nuevo): detalle cross-tenant — datos de contacto, lista de
       empleados, suscripción, historial de pagos, y `SuspenderNegocioButton` (reversible,
       `negocios.activo`, mismo criterio que la "Zona de peligro" del dashboard de negocio).
     - `/api/admin/negocios/toggle-activo` (nuevo): la acción de suspender/reactivar, autorizada
       por membresía en `super_admins` (server-side, `admin.ts`).
     - `pagos_saas` (tabla nueva en `supabase-schema.sql`): registro individual de cada cobro de
       Culqi (monto/método/`culqi_cargo_id` único) — `suscripciones` solo tenía el estado
       agregado, no alcanzaba para "quién pagó, cuánto y cómo". La insertan tanto
       `/api/pagos/culqi/cargo` (vía primaria) como `/api/webhooks/culqi` (respaldo async);
       `culqi_cargo_id` UNIQUE evita duplicar si ambos caminos confirman el mismo cargo. RLS
       deny-all para anon/authenticated (solo `service_role` la toca).
     - `/admin-panel/pagos` (nuevo): tabla cross-tenant de pagos + `MrrBarChart.tsx` (gráfico de
       barras de una sola serie, sin librería nueva — solo 4-6 puntos no lo justificaba; se
       consultó la skill `dataviz` para los criterios de mark spec/color/tooltip).
     - `/admin-panel` (resumen, reescrito): quitó la tabla cruda de negocios (ahora vive en su
       propia página con mejor UI) y sumó tarjeta "Por vencer" + lista de trials próximos a
       vencer + MRR estimado recalculado por precio real de cada plan (antes usaba
       `CULQI_MONTO_PLAN_PRO_CENTIMOS`, una constante de un solo plan que quedó obsoleta desde
       que hay 2 planes pagos — ver bitácora 2026-07-24 (12)).
  - **2 bugs propios encontrados y corregidos en el camino:**
    a) El primer intento de "suspender/reactivar" en modo mock mutaba el array
       `MOCK_ADMIN_NEGOCIOS` directamente en memoria — funcionaba en teoría pero **no en la
       práctica**: verificado con `curl` que el route handler y el Server Component que renderiza
       la página no comparten de forma confiable la misma instancia de módulo bajo Turbopack en
       dev, así que la mutación se perdía. Corregido con una cookie de "overrides"
       (`mock_negocios_override`, `mock-admin-overrides.ts`) — estado real compartido entre
       requests en vez de depender de un singleton de módulo. Re-verificado con `curl`
       (cookie jar) de punta a punta: suspender → aparece "Inactivo" en la lista y el detalle →
       reactivar → desaparece.
    b) El gráfico de MRR no pintaba ninguna barra (verificado con Playwright, no se notaba solo
       con `build`/`lint`): la altura estaba en `%` sobre una columna flex hija de un contenedor
       con `items-end`, que se encoge a su contenido — sin alto "definido" en el sentido del spec
       de CSS, el `%` colapsaba a 0. Corregido calculando la altura en píxeles fijos en el
       servidor (no hay ambigüedad de layout con un valor absoluto).
  - `npm run build`/`npm run lint`/`tsc --noEmit` limpios. Verificado con Playwright (headless,
    claro y oscuro) contra las 5 rutas nuevas/reescritas en modo mock: login → resumen → negocios
    → detalle → pagos, más el flujo completo de suspender/reactivar vía `curl` con cookie jar.
- **Por qué:** el usuario quería ver el panel admin sin depender de Supabase real, y al mostrarle
  el gap (solo tenía una página resumen) pidió ampliarlo con todo lo que hiciera falta para que
  se sintiera completo — priorizó explícitamente "todo de una vez" sobre ir por partes.
- **Pendiente:** nada de esto se ha probado contra Supabase/Culqi reales (sigue en modo mock) —
  en particular, el shape exacto de la respuesta de Culqi que alimenta `metodo_pago`/
  `culqi_cargo_id` en `pagos_saas` (`cargo?.source?.type`) es la mejor lectura disponible sin
  credenciales reales, igual que el resto de la integración Culqi (ver "Pendientes activos").
  Gestión de `super_admins` sigue sin UI a propósito (ver pendiente nuevo arriba).

### 2026-07-24 (12) — Rediseño de tablas del dashboard, toasts/paginación/switch/focus-ring, formato de fecha PE y precios reales
- **Qué cambió:** a pedido explícito del usuario ("la lista se ve horrible" en clientes/stock/
  descuentos), se rediseñaron las 10 páginas de listado del dashboard y se sumaron 4 mejoras de
  UX detectadas contra referencias reales (namethatui.com), más un fix de formato de fecha y la
  tabla de precios real de la landing:
  1. **Patrón único de tabla/lista**: clases nuevas en `globals.css` (`.table-card`,
     `.table-filter-bar`, `.table-head-cell`, `.table-row`, `.table-cell`, `.row-avatar`,
     `.row-icon-btn`, `.table-empty`) aplicadas a Clientes, Productos, Descuentos, Citas
     (vista Lista), Ventas, Gastos, Proveedores, Cotizaciones, Empleados e Informes — tabla
     dentro de `.card`, fila con ícono/avatar + nombre en negrita + subtexto, cabecera con
     fondo sutil, acciones con íconos en vez de texto plano.
  2. **Toast/snackbar** (`ToastProvider.tsx`, nuevo, envuelve `Providers.tsx`): confirmación
     tras crear/guardar/eliminar en las 10 páginas, auto-descarta a los 3.5s, `role="status"`.
  3. **Paginación** (`Pagination.tsx` + hook `usePaginado`, 10 filas por página): aplicada a
     las 10 listas, se oculta sola si hay una sola página.
  4. **Switch real**: nueva clase `.switch` reemplaza el patrón "click al badge de estado"
     (poco descubrible) en Productos (Activo/Borrador), Proveedores y Descuentos
     (Activo/Inactivo).
  5. **Focus-visible**: `.row-icon-btn` y `.badge` ganaron `focus-visible:ring` — antes solo
     `.input`/`.select` lo tenían, los botones de ícono nuevos no tenían ningún indicador de
     foco por teclado.
  6. **Formato de fecha peruano (DD-MM-AAAA)**: `src/lib/date.ts` (`formatearFechaPE`) — varias
     tablas mostraban la fecha ISO cruda tal cual venía de la DB (`2026-07-24`, lectura
     año-mes-día). Corregido en Gastos, Cotizaciones (fecha + vigencia), Descuentos (vigencia)
     e Informes. A propósito NO pasa por `new Date(iso)`: ese constructor interpreta un string
     "solo fecha" como medianoche UTC, y en America/Lima (UTC-5) eso corre la fecha un día para
     atrás al formatear en local — se manipula el string directamente (split por `-`), sin
     conversión de zona horaria de por medio.
  7. **Precios reales en la landing** (`PreciosSection.tsx`, nuevo, reemplaza el botón "Preguntar
     precio por WhatsApp"): 3 columnas — Prueba gratuita (30 días), Básico S/89.90/mes
     (S/899.00/año), Premium S/149.90/mes (S/1,499.00/año, = facturación SUNAT) — con toggle
     Mensual/Anual (segmented control, anual = mensual × 10, "2 meses gratis") y una franja de
     confianza ("sin cuota de instalación · sin límite de clientes ni productos · sin
     permanencia"), patrón tomado del research de Finegym. `WHATSAPP_NUMERO`/`WHATSAPP_MENSAJE`
     retirados de `src/app/page.tsx` (ya no se usaban en ningún otro lado). El resto de la
     landing (hero, problema→solución, `FuncionesShowcase` con pestañas —ya existía de la
     sesión (3)—, cómo funciona, FAQ, CTA final, footer) se dejó intacto a pedido explícito.
  - `npm run build`/`npm run lint` limpios. Verificado con Playwright: switch, toast, focus
    ring (anillo azul visible en `row-icon-btn` al navegar con Tab) y el toggle mensual/anual
    de precios, en modo mock.
- **Por qué:** pedido explícito del usuario sobre el diseño de las listas + 4 gaps de UX
  identificados al comparar contra namethatui.com (macOS/web) que el usuario pidió implementar
  todos ("podemos implementar todo lo que falta"); el formato de fecha, porque Perú usa
  DD-MM-AAAA y varias tablas mostraban el ISO crudo (año primero); los precios, porque el
  usuario decidió los montos exactos y pidió cerrar el pendiente de "precio por WhatsApp".
- **Pendiente:** el modelo de negocio sigue siendo trial 30 días → plan pago (no freemium para
  siempre) — los 2 planes pagos (Básico/Premium) no están conectados a Culqi todavía (sigue
  pendiente activar Culqi real, ver arriba); el checkout real deberá mapear el plan elegido en
  la landing al plan correcto en `suscripciones`. No se probó el flujo completo de selección de
  plan → checkout, solo la landing visual.

### 2026-07-24 (11) — Registro: espaciado del stepper + login/registro con Google
- **Qué cambió:** dos pedidos puntuales del usuario sobre el wizard de registro:
  1. **Espaciado del stepper**: en `RegistroForm` (`AuthPage.tsx`), el indicador de
     paso 1/2 quedaba pegado al subtítulo del formulario — a diferencia de los otros usos de
     `Stepper` (dentro de un `SlideOver`, que ya trae su propio padding de header), acá no había
     nada dando aire entre el `<p>` de subtítulo y el stepper. Se agregó un wrapper `mt-6`
     alrededor del `<Stepper>`, sin tocar el componente compartido (no afecta a
     clientes/productos).
  2. **"Continuar/Registrarse con Google"**: faltaba por completo la opción de entrar o crear
     cuenta con Google — todo el flujo de auth dependía exclusivamente de email+contraseña.
     Implementado de punta a punta:
     - Botón con logo de Google (SVG inline, no hay ícono de marca en `lucide-react`) +
       divisor "o continúa/regístrate con tu email" en `LoginForm` y en el paso 1 de
       `RegistroForm` (`AuthPage.tsx`), llamando a `supabase.auth.signInWithOAuth({ provider:
       "google" })`. En modo mock, en vez de intentar el redirect real (no hay Supabase real
       detrás), muestra un mensaje — mismo criterio que el reset de contraseña en mock.
     - `/auth/callback/route.ts` (nuevo): completa el intercambio PKCE (`exchangeCodeForSession`)
       — contraparte de `/auth/confirm`, que es para el flujo `token_hash` (invitación/reset),
       no sirve para OAuth porque ese `code_verifier` solo lo tiene el navegador que inició el
       flujo. Decide el destino: si la cuenta de Google ya tiene `empleados.negocio_id`, al
       `next` pedido (típicamente `/login`, que el `proxy.ts` ya resuelve al subdominio); si no
       (cuenta de Google nueva — `handle_new_user()` en el schema ya le creó una fila `empleados`
       mínima con `negocio_id NULL`), a `/registro/completar`.
     - `/registro/completar` (página nueva) + `CompletarRegistroForm.tsx` + `/api/registro/completar`
       (endpoint nuevo): contraparte de `/api/registro` para cuentas de Google — el `auth.user`
       YA existe (lo creó Supabase al autenticar), así que este endpoint NUNCA crea un usuario de
       Auth ni pide contraseña, solo crea negocio+suscripción y completa la fila `empleados` ya
       existente (mismo criterio de atomicidad con rollback manual que `/api/registro`, usando
       `service_role`). El nombre se toma del perfil de Google (`user_metadata.full_name`) con
       fallback si no viene.
     - `proxy.ts`: el bloque que ya redirigía "sesión + /login → subdominio" ahora también cubre
       el caso "sesión sin negocio todavía" (típicamente Google recién autenticado) → redirige a
       `/registro/completar` en vez de dejar ver el form de login de nuevo con una sesión activa
       sin destino.
  - `npm run build`/`lint`/`tsc --noEmit` limpios. Verificado con `curl` (sin navegador real
    disponible) que ambos botones y el nuevo espaciado renderizan en el HTML servido de
    `/login` y `/registro`.
- **Por qué:** pedido explícito del usuario ("falta la opción de iniciar sesión o registrarse
  con google" + "los pasos 1 y 2 están muy pegados arriba").
- **Pendiente:** el proveedor Google no está habilitado en el proyecto Supabase (no existe
  proyecto real todavía, ver "Pendientes activos" arriba) — hace falta el paso manual en el
  Dashboard de Supabase (Client ID/Secret de Google Cloud Console) antes de que el botón
  funcione contra credenciales reales; ya está documentado como pendiente activo. No se probó
  visualmente con un navegador real esta sesión (sin Playwright/Chromium en este entorno),
  solo `curl` + inspección de HTML — recomendable una pasada visual real antes de dar el
  flujo por cerrado, sobre todo el cross-fade entre los dos formularios con los botones nuevos.

### 2026-07-24 (10) — Proveedores, Cotizaciones e Informes (research de un 2º competidor: sistema de facturación SUNAT)
- **Qué cambió:** el usuario mostró el sidebar de un sistema de facturación electrónica peruano
  (Dashboard de ventas, Documentos → Cotizaciones/Ventas-recibos-facturas/Notas crédito/
  Documentos soporte, Ingresos y Egresos, Inventario → Productos y servicios/Categorías/Salidas
  y reservas/Ordenes de compra/Compras, Proveedores, Clientes, Configuración de facturación) y
  pidió extraer lo valioso e implementarlo todo. De ese research se priorizaron 3 gaps reales
  (el resto se descartó o se difirió — ver abajo) y se implementaron de punta a punta:
  1. **Proveedores** (`/dashboard/proveedores`): CRUD completo (nombre/RUC/contacto/teléfono/
     email/dirección/notas/activo). Tabla `proveedores` nueva en el schema, con la misma RLS
     compartida (`current_tenant()` / `puede_gestionar()`) que clientes/productos/ventas.
     Selector de proveedor agregado en los formularios de **Productos** y **Gastos**
     (`proveedor_id` nuevo en ambas tablas, `on delete set null` — borrar un proveedor no
     rompe productos/gastos ya vinculados).
  2. **Cotizaciones** (`/dashboard/cotizaciones`): mismo constructor de ítems que Ventas
     (selector de producto + cantidad), pero **sin tocar stock ni caja** — es un documento
     previo. Tablas `cotizaciones`+`cotizacion_items` nuevas, con `estado`
     (pendiente/aceptada/rechazada/vencida) y `vigencia_hasta`. Botón "Convertir a venta"
     (`convertirCotizacionAVenta` en `DataProvider.tsx`) crea la Venta real recién en ese
     momento (ahí sí descuenta stock vía `addVenta`) y enlaza `cotizaciones.venta_id` +
     `estado='aceptada'` — la cotización queda trazable a la venta que generó.
  3. **Informes / Ingresos y Egresos** (`/dashboard/informes`): tarjetas resumen (ingresos,
     egresos, balance) + filtro de rango de fechas + libro combinado de Ventas+Gastos
     ordenado por fecha con saldo corriente (columna `saldo` acumulada). No es contabilidad
     formal, es una vista rápida para el dueño. Gateado por el mismo permiso granular
     `'gastos'` que la página de Gastos (expone datos financieros).
  - **Descartado/diferido a propósito** (no se implementó, con criterio explícito):
    - *Notas crédito* / *Documentos soporte* → quedan para la fase de integración SUNAT real
      (brief §9, ya en el roadmap), no tiene sentido modelarlos sin un OSE detrás.
    - *Categorías* (de inventario) y *Salidas y reservas* → baja prioridad, `productos.categoria`
      ya cubre una clasificación simple y "salidas" ya existe como tipo de movimiento en
      `movimientos_stock`.
  - **Cambios de infraestructura compartida:** `addVenta` en `DataProvider.tsx` cambió su
    return type de `Promise<void>` a `Promise<string | null>` (devuelve el id de la venta
    creada) — cambio compatible hacia atrás, los llamadores existentes (página de Ventas)
    ignoran el valor de retorno; `convertirCotizacionAVenta` es el único que lo necesita.
    `TABLAS_DOMINIO` y el `Promise.all` de carga inicial en `DataProvider.tsx` ganaron las 3
    tablas nuevas (con su suscripción Realtime automática, mismo patrón que el resto).
  - `npm run build`/`npm run lint`/`tsc --noEmit` limpios. Verificado en modo mock vía `curl`
    con la cookie `mock_session=1` (sin Playwright disponible en este entorno esta sesión): las
    3 rutas devuelven 200, los datos mock (`MOCK_PROVEEDORES`/`MOCK_COTIZACIONES`/
    `MOCK_COTIZACION_ITEMS` en `mock-data.ts`) se renderizan, sin marcadores de error/hydration
    en el HTML servido.
- **Por qué:** el usuario pidió explícitamente "implementa todo" tras confirmar que valía la
  pena extraer Proveedores/Cotizaciones/Informes del research del segundo competidor.
- **Pendiente:** ídem que el resto del proyecto — nada de esto se ha probado contra Supabase
  real todavía (sigue en modo mock). No se verificó visualmente con un navegador real esta
  sesión (solo `curl` + inspección del HTML) porque no había Playwright/Chromium instalado en
  este entorno — recomendable una pasada visual real (clic en "Convertir a venta", editar un
  proveedor, filtrar Informes por rango de fechas) antes de dar el trabajo por cerrado.

### 2026-07-24 (9) — Sidebar de vuelta + modo oscuro real + tipografía Poppins
- **Qué cambió:** a pedido del usuario, se revirtió parcialmente la sesión (8) y se sumó una
  feature nueva:
  1. **Sidebar de vuelta**: `TopNav` (nav superior con dropdowns, ítem 11 de la sesión (8)) se
     retiró y se restauró `DashboardNav` (sidebar fijo), ahora con los ítems nuevos que TopNav
     había ganado (Ajustes/Descuentos/Marketing, con el mismo filtro por rol/permiso granular)
     y el toggle de tema en su cabecera. `dashboard/layout.tsx` volvió al layout `ml-60`.
  2. **Modo oscuro real** (no solo `prefers-color-scheme`, togglable a mano): `@custom-variant
     dark` (Tailwind v4) + toggle manual vía clase `.dark` en `<html>`, persistido en
     `localStorage` (clave `tema`) con fallback a la preferencia del SO. Script inline en
     `layout.tsx` `<head>` aplica la clase ANTES del primer paint (evita flash). Nuevo
     `ThemeToggle.tsx` (ícono sol/luna). Tokens de marca (`--background`, `--foreground`,
     `--color-primary-light`, `--color-accent-light`) redefinidos bajo `.dark` en
     `globals.css` — como `body` y los badges ya leían esas variables, gran parte de la
     superficie se adaptó sola. Las clases reutilizables (`.card`, `.input`, `.select`,
     `.btn-outline`, `.badge-*`) ganaron su propia variante `dark:`. El resto (encabezados,
     texto muted, bordes, hover de filas, "Zona de peligro" en rojo, `FeatureGateBanner` en
     ámbar) se hizo con una pasada sistemática por todas las páginas del dashboard + landing +
     login/registro + admin-panel.
  3. **Tipografía de títulos**: se agregó Poppins (600/700/800) vía `next/font/google` como
     `--font-heading`, aplicada centralizadamente a `h1`/`h2`/`h3` (+ clase `.font-display` para
     el nombre de marca en el sidebar/landing, que no son un heading real) en `globals.css` — un
     solo punto de aplicación, no hubo que tocar cada página.
  - **Bug propio encontrado en el camino:** el primer intento de pasada automática (script
    de reemplazo con regex) duplicaba `dark:text-slate-400 dark:text-slate-500` en 22 lugares
    porque el lookbehind negativo solo excluía el prefijo `hover:`, no `dark:` — la regla
    `text-slate-400` volvía a matchear dentro del `dark:text-slate-400` que la regla anterior
    (`text-slate-500`) acababa de insertar. Corregido con una segunda pasada que colapsa el
    duplicado exacto; verificado que no quedó ninguna instancia.
  - `npm run build`/`npm run lint` limpios. Verificado con Playwright: sidebar restaurado,
    toggle claro↔oscuro, persistencia tras recargar (`localStorage` + script anti-flash),
    landing en oscuro (visitantes con el SO en oscuro la ven así por defecto, sin haber tocado
    el toggle nunca), 0 errores de consola/red en la pasada final.
- **Por qué:** el usuario pidió explícitamente revertir el nav superior por el sidebar, sumar
  un modo oscuro real (no solo decorativo) y una tipografía de títulos más pesada.
- **Pendiente:** el modo oscuro no se probó en dispositivos táctiles/móviles reales, solo en el
  viewport de escritorio de Playwright. La paleta oscura es una primera pasada razonable, no un
  research de contraste exhaustivo (WCAG) — revisar si el usuario pide afinar algún color puntual.

### 2026-07-24 (8) — Implementación de las 13 ideas de UX + pulido de diseño
- **Qué cambió:** a pedido explícito del usuario ("implementa todo lo que has dicho"), se
  implementaron las 13 ideas de UX del research de OkVet/Finegym (sesiones (6)-(7)) — ver el
  detalle marcado ✅ ítem por ítem en la sección "Ideas de UX" arriba — más una pasada de pulido
  de diseño. Resumen de lo construido:
  1. **Schema** (`docs/supabase-schema.sql`): `negocios.color_primario`, `empleados.permisos`
     (jsonb, aditivo sobre el rol fijo — nunca reemplaza `administrador`), tablas nuevas
     `descuentos` y `campanias_email` con su RLS (mismo patrón `negocio_id = current_tenant()`),
     helper `tiene_permiso(clave)`, `gastos_admin_all` ahora acepta también el permiso granular.
  2. **DataProvider/mappers/mock-data**: tipos y CRUD para `Descuento`/`CampaniaEmail`, campos
     nuevos en `Negocio`/`Empleado`.
  3. **Componentes compartidos nuevos**: `SlideOver` (panel lateral), `Stepper` (alta en 2
     pasos), `OnboardingChecklist`, `CoachTooltip`, `FeatureGateBanner` ("candado visible"),
     `ChangelogBanner`, `TopNav` (nav superior con dropdowns — **reemplaza y borra
     `DashboardNav`**, el sidebar fijo anterior).
  4. **`proxy.ts`**: gatea `/dashboard/{gastos,descuentos,marketing}` por permiso granular
     además de rol; `/dashboard/{empleados,ajustes}` siguen siendo admin-estricto, nunca
     delegables.
  5. **Páginas rehechas**: clientes (slide-over 2 pasos + badge/filtro "en riesgo", sin cita
     hace &gt;180 días), citas (slide-over + filtros estado/fecha), productos (slide-over 2
     pasos + badge Activo/Borrador clickeable + filtros), ventas/gastos (filtros método-o-
     categoría + rango de fechas), empleados (slide-over + editor de permisos granulares por
     fila expandible).
  6. **Páginas nuevas**: `/dashboard/ajustes` (datos del negocio, logo + color de marca vía
     CSS var en `HydrationGate.tsx`, Zona de Peligro = desactivar negocio con
     `negocios.activo=false`, reversible — nunca un DELETE real), `/dashboard/descuentos`
     (CRUD de cupones), `/dashboard/marketing` (campañas de email — **scaffold sin envío real**,
     falta conectar un proveedor).
  7. **Landing**: precio del plan Pro reemplazado por botón de WhatsApp (`WHATSAPP_NUMERO`
     placeholder). **Facturación**: módulo SUNAT visible en modo lectura + `FeatureGateBanner`.
  8. **Pulido de diseño**: transición de entrada por página (`.page-enter` en
     `dashboard/layout.tsx`), `.card` con `transition-shadow`, hover consistente en filas de
     tabla y badges clickeables.
  - **2 bugs reales encontrados y corregidos durante la verificación con Playwright** (no per-
    ceptibles solo con `npm run build`/`lint`, hacía falta levantar el dashboard de verdad):
    a) `ChangelogBanner`/`CoachTooltip` leían `window.localStorage` en el initializer de
       `useState` para evitar el lint `set-state-in-effect` — pero en modo mock
       `DataProvider`/`SessionProvider` arrancan con `ready=true` de forma síncrona, así que
       estos componentes SÍ se renderizan durante el SSR, donde `window` no existe
       (`ReferenceError: window is not defined`, tumbaba `/dashboard` con 500 real). Solucionado
       volviendo al patrón efecto+setState con un `eslint-disable-next-line` puntual y
       justificado — es la excepción legítima que la regla del proyecto no puede detectar
       (sincronizar con un API del navegador ausente en el servidor).
    b) `toLocaleString("es-PE")` sin `timeZone` explícito en citas/ventas (código YA existente,
       no introducido en esta sesión) causaba un hydration mismatch real por diferencias de
       Unicode whitespace entre el ICU de Node (SSR) y el del navegador. Se agregó
       `timeZone: "America/Lima"` + `suppressHydrationWarning` en el nodo puntual (el texto
       visible es idéntico, es un falso positivo conocido de React con `Intl`).
  - `npm run build` y `npm run lint` limpios. Verificado de punta a punta con Playwright
    (`headless`) contra el dashboard en modo mock: login, las 12 rutas del dashboard, 0 errores
    de consola/hydration/red en la pasada final.
- **Por qué:** el usuario pidió explícitamente implementar TODAS las ideas del research
  (incluidos los ítems 9 y 11, que se habían marcado como "no recomendados" en la sesión (7)) y
  además mejorar el diseño general, no solo un subconjunto priorizado.
- **Pendiente:** `WHATSAPP_NUMERO` sigue siendo placeholder; campañas de email son scaffold sin
  proveedor conectado; nada de esto se ha probado contra Supabase real todavía (sigue en modo
  mock) — ver "Pendientes activos" arriba. El cambio de sidebar a `TopNav` (ítem 11) no se ha
  probado en un dispositivo móvil real, solo en el viewport de escritorio de Playwright.

### 2026-07-24 (7) — Deep dive en el dashboard de OkVet (login manual + recorrido automático)
- **Qué cambió:** se completó el research de OkVet que había quedado a medias (Fase (6)): el
  login real de OkVet exige captcha, así que se resolvió con un patrón híbrido — Chromium en
  modo visible (`headless: false`), formulario prellenado por script, el usuario resuelve el
  captcha y cierra manualmente un modal bloqueante de SweetAlert2 ("¿Desea recibir las
  notificaciones...?") que interceptaba todos los clicks posteriores, y el script detecta ambos
  eventos (cambio de URL, modal desaparecido) para continuar solo. Con eso se recorrieron 8 de
  9 tabs del header (Dashboard, Administración, Agenda, Consultorio, Ventas, Hosp./Amb.,
  Solicitudes, Marketing — Informes quedó bloqueado por un tooltip de onboarding). Hallazgos
  nuevos añadidos a la sección "Ideas de UX" arriba (ítems 10-13): feature-gating freemium con
  "candado visible" (banner + módulo en modo lectura en vez de ocultarlo), nav superior con
  dropdowns por hover, onboarding vía tooltip apuntando a una sola acción + stepper numérico en
  el header, módulo de campañas de email marketing. Confirmado también: cada tab del header de
  OkVet es un dropdown con sub-secciones (Consultorio → Consultorio/Sala de espera; Solicitudes
  → historias clínicas/agendamiento/órdenes; Administración → Usuarios/Planes y suscripción).
  Nada de esto se implementó — sigue siendo research, no código.
- **Por qué:** cerrar el research de competencia que había quedado incompleto por el bloqueo
  técnico del captcha + modal, para tener el cuadro completo antes de decidir qué implementar.
- **Pendiente:** decidir con el usuario cuál de los 13 ítems de la sección "Ideas de UX" se
  implementa primero (la de mayor valor sigue siendo el checklist/tooltip de onboarding,
  ítems 1 y 12 combinados).

### 2026-07-24 (6) — Playwright real + research profundo de competencia (OkVet/Finegym)
- **Qué cambió:** `chromium-cli` (referenciado por la skill `run`) no existe como paquete
  público — se instaló la alternativa real: `playwright` global (`npm install -g playwright`,
  fuera del `package.json` del proyecto a propósito) + binario de Chromium
  (`npx playwright install chromium`). Script reutilizable en el scratchpad de la sesión
  (`screenshot.js`: navega + captura, acepta cookies). Nota operativa: como `playwright` se
  instaló global (no local al proyecto), hay que exportar
  `NODE_PATH=/c/Users/usuario/AppData/Roaming/npm/node_modules` al invocar `node` o el
  `require("playwright")` falla con `MODULE_NOT_FOUND`.
- Con esa herramienta se hizo research profundo de dos competidores reales (rubro
  clínicas/gestión de negocio de servicios): se navegó la landing de Finegym, se completó su
  wizard de registro (paso 1 llegó a funcionar; el correo de prueba dado por el usuario ya
  estaba registrado, así que no se pudo completar el alta con ese email exacto), se inició
  sesión de verdad en su dashboard con esa cuenta ya existente, y se exploraron a fondo las 12
  secciones del sidebar (Miembros, Planes, Personal, Calendario, Citas, Clases, Registros,
  Productos, Descuentos, Pagos, Informes, Ajustes) — listados, filtros, y los modales/paneles
  de alta que se pudieron abrir sin datos reales. Resultado completo: ver la sección "Ideas de
  UX de research de competencia" arriba — queda **todo sin implementar todavía**, a la espera
  de que el usuario priorice qué adoptar.
- **Por qué:** el usuario quería robar patrones de UX de un competidor maduro del mismo tipo de
  negocio (gestión de un local de servicios con miembros/citas/pagos) para mejorar el dashboard
  de la óptica, y confirmar que Playwright realmente podía automatizar un login/exploración real
  (no solo lectura de texto vía `WebFetch`).
- **Pendiente:** nada de la sección de ideas de UX se implementó — decidir con el usuario cuál
  atacar primero (la de mayor valor identificada: el checklist de onboarding).

### 2026-07-24 (5) — Diseño real: paleta, sidebar y modo mock de verificación
- **Qué cambió:**
  1. **Modo mock temporal** (`src/lib/mock/`): correo/contraseña fijos (`demo@optica.pe` /
     `demo1234`) que activan el dashboard con datos falsos sin tocar Supabase — para que el
     usuario pudiera verificar visualmente el sistema antes de crear el proyecto real (que
     decidió posponer). Gateado por `NEXT_PUBLIC_MOCK_MODE=true` en `.env.local` (nunca en
     `.env.example` como `true`). Ramas `if (mock)` agregadas en `SessionProvider`,
     `DataProvider` (estado inicial + todas las mutaciones operan en memoria) y
     `dashboard/layout.tsx` (gate por cookie en vez de header). Bug encontrado de paso:
     `createBrowserClient` explota en el constructor si la URL/key vienen vacías —
     `src/lib/supabase/client.ts` ahora usa placeholders no vacíos como fallback.
  2. **Diseño real**: el usuario puso 44 imágenes de referencia en `diseno-referencia/`
     (mockups genéricos de UI-kits + anuncios reales de competidores del rubro: HCMedic,
     Dentalink, OkVet, CitaPro). Un fork las analizó todas y devolvió un brief condensado:
     azul primario (`#2563EB`) + verde de acento (`#16A34A`), tipografía Geist (ya instalada,
     no hubo que cambiarla), sidebar blanco con secciones agrupadas, cards `rounded-xl` con
     sombra suave, badges tipo píldora por estado.
  3. Aplicado a todo el proyecto: `globals.css` con tokens de tema (`@theme inline`) + clases
     reutilizables (`.btn-primary`, `.btn-outline`, `.card`, `.input`, `.badge-*`) siguiendo
     la regla anti-duplicación de `docs/style-guide.md`. `DashboardNav` reescrito como sidebar
     fijo con `lucide-react` (secciones Atención/Comercial/Administración). Landing (`src/app/
     page.tsx`) rediseñada con la nueva paleta. Todas las páginas de `/dashboard/*` y
     `admin-panel` migradas de `bg-black`/`rounded border` sueltos a las clases nuevas.
     `docs/style-guide.md` actualizado con los valores reales (ya no placeholders).
  - `npm run build` y `npm run lint` limpios. Verificado con `curl` (sin `chromium-cli`
    disponible en este entorno) que las clases de marca se renderizan en el HTML real.
- **Por qué:** el usuario quería verificar el login/dashboard sin comprometerse todavía a
  crear infraestructura Supabase real, y luego aplicar un diseño real en vez de Tailwind
  genérico sin marca.
- **Pendiente:** el modo mock es temporal — se debe quitar (`src/lib/mock/` + las ramas
  `isMockMode()`) en cuanto haya un proyecto Supabase real. Falta reemplazar los placeholders
  `[ mockup/captura ]` de la landing por capturas reales, y definir nombre de marca/logo.

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
