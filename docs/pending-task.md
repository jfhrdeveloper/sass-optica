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

## Pendientes activos (no bloquean, pero quedan abiertos)
- [x] Decidir permisos exactos de `gastos` para el rol `encargado` — resuelto de forma más
      general de lo pedido: permisos granulares delegables por empleado (`empleados.permisos`),
      ver bitácora 2026-07-24 (8). `gastos` sigue siendo admin-only por defecto, pero el
      administrador ahora puede delegarlo puntualmente sin cambiar el rol fijo.
- [ ] Definir nombre de marca, dominio final y precio del plan Pro en soles (ver brief §12) —
      el precio ahora se resuelve por WhatsApp en la landing (ver bitácora (8)), pero el
      **número de WhatsApp sigue siendo un placeholder** (`WHATSAPP_NUMERO` en `src/app/page.tsx`)
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
