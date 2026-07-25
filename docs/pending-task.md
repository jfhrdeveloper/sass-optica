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
- [ ] **Definir el RUC y el régimen tributario** (consultado en la sesión (7), sin decidir): RUC 10
      (persona natural) es inmediato pero se responde con patrimonio personal; RUC 20 (EIRL/SAC)
      separa el patrimonio, que pesa más de lo normal acá porque se custodian datos de salud de
      pacientes de terceros. En ambos casos se puede operar con un **nombre comercial** distinto de
      la razón social. Confirmar con un contador; de esta decisión depende también qué nombre ve el
      cliente en el cobro de Culqi (el descriptor del comercio se registra en el onboarding de Culqi).
- [ ] Tests de RLS (aislamiento entre ópticas) — el riesgo real del producto sigue sin cobertura;
      necesita el proyecto Supabase creado para poder correrlos

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
