# Guía de estilo

> Fuente única de verdad para estilo visual y convenciones de código. No duplicar en CLAUDE.md.

## Tipografía
- Familia(s): _(pendiente — marca/branding aún sin definir; usar `next/font` cuando se elija)_
- Escala / tamaños: _(pendiente)_
- Pesos y usos: _(pendiente)_

## Paleta
- Primario / secundario / acento: _(pendiente — definir junto con la skill `ui-ux-pro-max` al diseñar la landing)_
- Estados (éxito / aviso / error / info): _(pendiente)_
- Modo oscuro: _(pendiente — decidir si el dashboard lo soporta desde el MVP)_
- **Regla:** nunca redefinir colores ad-hoc en componentes; importar de la fuente canónica (tokens en `globals.css` / `tailwind` theme).

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
- Botones (variantes y estados): _(pendiente — a definir al construir la landing/dashboard)_
- Formularios e inputs: _(pendiente)_
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
- **No** duplicar lógica de resolución de tenant fuera del `middleware.ts` (una sola fuente de verdad).
