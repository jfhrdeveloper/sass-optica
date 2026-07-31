# Guía de estilo

> Fuente única de verdad para estilo visual y convenciones de código. No duplicar en CLAUDE.md.
> Versión formal/machine-readable de los tokens de color, tipografía y breakpoints de abajo:
> `docs/design-tokens.json` (formato W3C Design Tokens, para handoff a Figma/Style Dictionary).

## Tipografía
- Familia(s): **Geist** (sans) / **Geist Mono** — ya instaladas vía `next/font/google` en `src/app/layout.tsx`. Coincide con el estilo sans-serif geométrico moderno de todas las referencias de competidores analizadas (ver `diseno-referencia/`), no hizo falta cambiarla.
- Escala / tamaños: escala por defecto de Tailwind (`text-sm`/`base`/`xl`/`2xl`/`4xl`...); headline de landing en `text-4xl`/`text-5xl`.
- Pesos y usos: `font-semibold` para títulos y montos, `font-medium` para labels/botones, texto de cuerpo sin peso extra.

## Paleta
Derivada del análisis de 44 imágenes de referencia (mockups genéricos + anuncios reales de
competidores del rubro: HCMedic, Dentalink, OkVet, CitaPro) — ver `diseno-referencia/` y la
entrada de bitácora correspondiente en `pending-task.md`. Tokens definidos en
`src/app/globals.css` (`@theme inline`), consumibles como utilidades Tailwind
(`bg-primary`, `text-primary`, `bg-primary-light`, `bg-accent-light`, etc.).

- **Primario:** azul `#2563EB` (`--color-primary`) — estándar del rubro salud/clínicas en LatAm, genera confianza. Hover/sidebar activo: `#1E40AF` (`--color-primary-dark`). Fondo suave: `#EFF6FF` (`--color-primary-light`).
- **Acento:** verde `#16A34A` (`--color-accent`) — estados positivos (ventas, stock ok, indicadores +%). Fondo suave: `#F0FDF4` (`--color-accent-light`).
- **Neutrales:** escala `slate-*` de Tailwind tal cual (texto `slate-900`/`slate-500`/`slate-400`, bordes `slate-200`/`slate-100`).
- **Estados (badges):** éxito → `.badge-success` (verde), aviso → `.badge-warning` (ámbar), error → `.badge-danger` (rojo), neutral → `.badge-neutral` (slate). Clases ya definidas en `globals.css`.
- **Modo oscuro:** implementado de verdad (no solo `prefers-color-scheme`) — `@custom-variant dark` (Tailwind v4) + toggle manual (`ThemeToggle.tsx`) vía clase `.dark` en `<html>`, persistido en `localStorage` (clave `tema`) con fallback a la preferencia del SO, aplicado antes del primer paint por un script inline en `layout.tsx` (evita flash). Todas las clases reutilizables (`.btn-primary`, `.card`, `.input`, `.badge-*`) y las páginas del dashboard/landing/admin-panel tienen su variante `dark:`. Ver bitácora 2026-07-24 (9) para el detalle de la implementación.
- **Regla:** nunca redefinir estos colores ad-hoc en componentes; usar las clases reutilizables (`.btn-primary`, `.btn-outline`, `.card`, `.input`, `.badge-*`) definidas en `globals.css`, o las utilidades Tailwind del theme (`bg-primary`, etc.) — nunca `bg-black`/`bg-blue-600` sueltos.

## Espaciado y breakpoints
- Escala de espaciado: la de Tailwind por defecto.
- Grid / contenedores: `max-w-*` + `mx-auto`, nunca anchos fijos en `px`.

### Breakpoints (mobile-first)
Diseña primero para móvil y escala hacia arriba.

| Nivel    | Breakpoint | Dispositivo objetivo   | Regla base de layout                                          |
| :------- | :--------- | :--------------------- | :----------------------------------------------------------- |
| **base** | `< 640px`  | Móvil (360–430px)      | 1 columna, bottom-nav / menú hamburguesa, touch targets ≥ 44px |
| **sm**   | `≥ 640px`  | Móvil grande / paisaje | 1 columna con márgenes holgados                              |
| **md**   | `≥ 768px`  | Tablet (768–1024px)    | Grid de 2 columnas; sidebar en overlay/colapsable           |
| **lg**   | `≥ 1024px` | Laptop 13–14"          | Sidebar fijo (dashboard); grid de 2–3 columnas               |
| **xl**   | `≥ 1280px` | Laptop 15–16"          | Grid de ≥ 3 columnas sin scroll horizontal                  |
| **2xl**  | `≥ 1536px` | Monitor 17"+           | Contenido centrado con tope de ancho; no estirar al 100%    |

### Reglas de responsive
- **Anchos:** nunca px fijos en contenedores; usar `w-full` + `max-w-*`. El contenido junto a un sidebar fijo usa `flex-1 min-w-0`.
- **Imágenes:** siempre `w-full h-auto` u `object-cover`.
- **Tipografía:** responsiva (escala por breakpoint o `clamp()`), nunca tamaños fijos.

## Componentes UI
- Botones: `.btn-primary` (sólido, acción principal) / `.btn-outline` (secundaria) — definidas en `globals.css`.
  **Radio: `rounded-full` en TODO el sitio** (píldora), unificado en la sesión 2026-07-25 (6).
  No agregar un `rounded-*` suelto en el JSX para cambiarlo caso por caso: si hace falta otro
  radio, se discute como cambio del sistema, no como excepción local.
- **Selector de opciones excluyentes (tabs/toggle): `SegmentedControl.tsx`** — un solo bloque
  con indicador deslizante, no botones sueltos que se prenden y apagan. Ya lo usan las pestañas
  de funciones y el toggle Mensual/Anual de precios.
  - **Prop `variante`**: `"tabs"` (default, `role="tablist"`/`"tab"` — cambiar de opción revela
    un panel distinto, ej. las pestañas de funciones) vs. `"opciones"` (`role="radiogroup"`/
    `"radio"` — elegir uno entre varios sin revelar ningún panel, ej. Mensual/Anual). Elegir mal
    la variante hace que un lector de pantalla describa el control como algo que no es.
- **Fecha única: `DatePicker.tsx`** / **rango de fechas: `DateRangePicker.tsx`** (ambos sobre
  `react-day-picker`) — nunca `<input type="date">` nativo, cada navegador dibuja su propio
  calendario del sistema. Son dos componentes separados a propósito (no un `modo` compartido):
  react-day-picker tipa `selected`/`onSelect` distinto según `mode="single"` vs `"range"`.
  - Las fechas se tratan como fechas civiles (`"YYYY-MM-DD"`), nunca `new Date(iso)` — ver
    `src/lib/date.ts` (`aFechaLocal`/`aCadenaISO`, con tests).
  - El popover va en un portal con `position: fixed`, posición Y ANCHO calculados desde el rect
    del trigger y clampeados al viewport — un ancho fijo sin clamp se recorta en pantallas
    angostas (bug real encontrado y corregido, ver bitácora 2026-07-25 (10)).
- **Rango de fechas: `DateRangePicker.tsx`** (envuelve `react-day-picker`). Reemplaza los pares de
  `<input type="date">` sueltos de los filtros — cada navegador dibujaba su propio calendario del
  sistema y no se veía la relación entre los dos extremos. En uso en citas, ventas, gastos,
  informes y descuentos.
  - **Las fechas se tratan como fechas civiles (`"YYYY-MM-DD"`), nunca `new Date(iso)`**: ese
    constructor las interpreta como medianoche UTC y en America/Lima (UTC-5) corren un día para
    atrás. El puente vive en `src/lib/date.ts` (`aFechaLocal`/`aCadenaISO`) y está cubierto por
    tests, junto con el clásico "los meses de `Date` son 0-based".
  - El popover se posiciona con coordenadas calculadas (`position: fixed`), no como hijo del
    campo: dentro de un `SlideOver` u otro contenedor con `overflow` quedaría recortado.
  - Para una fecha ÚNICA en un formulario (fecha de nacimiento, fecha del gasto, vigencia) hoy se
    sigue usando `<input type="date">` nativo — ver pendiente en `pending-task.md`.
- **Selector de color: `ColorWell.tsx`** — swatch + paleta rápida, patrón del color well de macOS
  (`NSColorWell` en estilo `.expanded`). En uso en Ajustes para el color de marca del negocio.
- **Acordeón / secciones desplegables: `<details>` + `<summary>` con la clase `.accordion-item`**
  (ver `globals.css` y la FAQ de la landing). Nunca reimplementarlo con un `div` + `useState`:
  el elemento nativo ya trae teclado (Enter/Espacio), el estado expuesto a lectores de pantalla
  y que el Ctrl+F del navegador encuentre y abra texto dentro de un panel cerrado.
  - **No agregar `aria-expanded`**: `<details>` ya comunica su estado; duplicarlo puede terminar
    contradiciendo al real. Solo haría falta en un disclosure 100% custom.
  - "Solo uno abierto a la vez" se logra con el atributo `name` compartido entre los `<details>`
    del grupo — sin JavaScript.
  - El triángulo por defecto se oculta (`list-style: none` + `::-webkit-details-marker`) y se
    dibuja un chevron de lucide que rota con `group-open:rotate-180`.
- **Switch vs. checkbox vs. radio — la elección NO es estética, es semántica:**

  | Control | Clase | Cuándo |
  |---|---|---|
  | Switch | `.switch` | Ajuste binario que se aplica **al instante**, sin Guardar (Activo/Borrador de un producto, permisos de un empleado) |
  | Checkbox | `.checkbox` | Valor **independiente** de un formulario, que puede esperar al Submit ("Recuérdame") |
  | Radio | `.radio` | **Exactamente una** de N opciones excluyentes (formato del subdominio) |

  - El switch es un `<input type="checkbox" role="switch">`: sin ese `role` un lector de
    pantalla lo anuncia como "casilla de verificación" y se pierde la promesa de "esto ya
    quedó aplicado".
  - **Los radios de un grupo DEBEN compartir el mismo `name`.** Sin él el navegador los trata
    como controles sueltos: se pierde la navegación con flechas ↑↓ y no se anuncia "1 de 2".
    Aunque React fuerce el `checked`, el grupo sigue roto para teclado y lector de pantalla.
  - Un grupo de radios va en `<fieldset>` con `<legend>` (puede ser `sr-only`): es lo que le
    da nombre accesible al grupo, si no solo se oye la etiqueta de cada opción sin contexto.
  - Todo control va **envuelto en su `<label>`** — la asociación implícita evita el bug clásico
    de `for`/`id` desalineados, y hace clickeable el texto.
  - `indeterminate` (el checkbox "algunos seleccionados" de una cabecera de tabla) **solo se
    puede activar desde JS** (`ref.current.indeterminate = true`), no existe como atributo.
    Hoy el proyecto no lo usa; haría falta si se agregan acciones en lote a las tablas.
- **"Seleccionado" se ve igual en todo el sitio:** fondo primario sólido + texto blanco
  (nav activo, indicador del segmented control). Nunca fondo tintado + texto del mismo tono:
  no contrasta y el estado activo se pierde.
- Inputs de texto/número/fecha: clase `.input`.
- **Dropdowns (`<select>`): SIEMPRE clase `.select`, nunca `.input`.** Un `<select>` nativo
  dibuja su propia flecha pegada al borde del recuadro si no se le da espacio propio — `.select`
  apaga el `appearance` nativo del navegador y dibuja una flecha (chevron) propia con
  `padding-right` suficiente para que no quede pegada. Ver `globals.css`.
- **Inputs numéricos sin flechas arriba/abajo:** ya aplicado globalmente en `globals.css`
  (`input[type="number"]` sin spinners) — no hace falta nada por componente.
- **Imágenes subidas por el usuario: siempre por `src/lib/imagen.ts` (`prepararImagen`)**, nunca
  un `FileReader.readAsDataURL` crudo. Valida tipo/tamaño (rechaza >8MB) y redimensiona a máx.
  512px vía canvas antes de codificar — sin esto, una foto de celular sin comprimir se guarda tal
  cual en una columna `text` de Postgres que se relee en cada carga de página. En uso en el logo
  de Ajustes.
- Modales / overlays: _(pendiente)_
- Tablas / listas: _(pendiente)_
- **Clases globales reutilizables:** centralizar tipografía y botones recurrentes
  (`.h1-hero`, `.btn-primary`, etc.) en `globals.css`; no redeclarar las mismas
  utilidades en cada componente.

## Animación
- Librería: _(pendiente — evaluar si hace falta Framer Motion o basta con transiciones CSS)_
- **Duraciones y easings estándar:** definir UNA transición base (p. ej. 300 ms) y
  reutilizarla; no esparcir duraciones ad-hoc dispares por los componentes.
- **`prefers-reduced-motion`:** evitar animaciones grandes/parallax para quien lo
  solicita; preferir transiciones sutiles o ninguna.

## Accesibilidad
- **Contraste mínimo:** WCAG AA (4.5:1 texto normal, 3:1 texto grande).
- **Foco visible / navegación por teclado:** no eliminar el `outline` de foco sin reemplazarlo por un indicador claro; todo lo interactivo debe alcanzarse con teclado.
- **Etiquetas ARIA y roles:** usar elementos nativos (`button`, `a`, `label`) antes que `div` con rol.
- **Touch targets:** ≥ 44px en móvil (relevante: el dashboard se usará también desde celular en el mostrador).
- **Zoom del usuario:** nunca impedir que amplíe a propósito.

## Convenciones de código

### Estándar visual de comentarios
- **Nivel 1 (Bloques principales):** `/* ================= BLOQUE PRINCIPAL ================= */`
- **Nivel 2 (Secciones lógicas):** `/* ====== Sección secundaria ====== */`
- **Nivel 3 (Subsecciones):** `/* ==== Subsección ==== */`
- **Nivel 4 (Notas de una línea):** `// Nota específica` o `/* Elemento adicional */`

> **⚠️ Regla crítica (React/JSX):** dentro del JSX (en el `return`) usa **ÚNICA Y
> ESTRICTAMENTE** `{/* ... */}`. Un `//` dentro del JSX rompe la aplicación.

### Tono de los comentarios
El comentario describe **qué hace / por qué existe** el código, en presente
atemporal. **No** narra quién lo escribió ni cuándo: eso vive en el git log / la bitácora.

> Distingue por tipo de texto: **comentarios de código** → presente atemporal;
> **bitácora/changelog** (`pending-task.md`) → pasado impersonal; **docs de
> arquitectura** → presente descriptivo del sistema.

### Otras convenciones
- **Imports:** alias `@/*` → `./src/*` (ya configurado en `tsconfig.json`).
- **Nombres de tablas/columnas en Supabase:** español, `snake_case` (`negocio_id`, `subdominio`), consistente con el brief.
- **Server vs. cliente:** cualquier operación con `service_role` de Supabase vive SOLO en Route Handlers/Server Actions, nunca en un componente `"use client"`.

## Reglas generales (hardening web/móvil)
- **Sin zoom automático al tocar inputs (iOS).** Doble candado:
  1. Viewport con `initial-scale=1, maximum-scale=1` (en Next.js: `export const viewport`).
  2. `input, textarea, select { font-size: max(16px, 1em); }`.
- **Sin scroll horizontal accidental.** `html, body { overflow-x: hidden; }` +
  `body { max-width: 100vw; }`; envolver tablas anchas en `overflow-x: auto`.
- **`box-sizing: border-box`** global en `*, *::before, *::after`.
- **Inputs numéricos sin spinners** cuando el ingreso es manual.
- **Tope de ancho en pantallas grandes** (p. ej. `max-width: 1440px; margin-inline: auto`).
- **Anti-flash de tema:** si se soporta modo oscuro, aplicar el tema antes del primer paint con script inline en `<head>`.
- **NUNCA deshabilitar el zoom del usuario** por accesibilidad salvo justificación puntual.

## Anti-patrones
- **No** redefinir colores ad-hoc en componentes; importar siempre de la paleta canónica.
- **No** usar anchos fijos en px para contenedores; usar `w-full` + `max-w-*`.
- **No** usar tamaños de tipografía fijos; usar escala responsiva o clases globales con `clamp()`.
- **No** usar `//` dentro del JSX (en el `return`); solo `{/* ... */}`.
- **No** importar el cliente `service_role` de Supabase (`admin.ts`) fuera de código server-side.
- **No** duplicar lógica de resolución de tenant fuera de `src/proxy.ts` (una sola fuente de verdad — Next.js 16 renombró `middleware.ts` a `proxy.ts`, mismo contrato).
