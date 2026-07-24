# Brief del Proyecto: SaaS Multi-tenant para Pymes de Servicios

## 1. Visión general

SaaS de gestión para pequeños negocios de servicios en Perú (ópticas, clínicas dentales, veterinarias, y potencialmente barberías/ginecología/obstetricia). Modelo: mismo motor de software, marcas separadas por rubro de cara al cliente. Modo freemium: prueba gratis 30 días → suscripción mensual paga.

Mercado objetivo: pequeños negocios/autónomos con 3-10 trabajadores.

---

## 2. Arquitectura técnica

### Modelo de datos
- **Multi-tenant con base de datos compartida** (no una BD por cliente)
- Cada tabla incluye `tenant_id` (o `optica_id`, `dental_id`, etc. según el negocio)
- **Row Level Security (RLS) de Supabase activado desde el día 1** — crítico para que un tenant nunca vea datos de otro
- Toda consulta filtra automáticamente por tenant del usuario logueado
- Middleware de seguridad centralizado en el backend — nunca confiar en que el frontend filtre correctamente

### Stack técnico
- **Frontend:** Next.js + Tailwind
- **Backend/DB:** Supabase (Postgres + Auth + Storage)
- **Pagos:** Culqi (Stripe NO está disponible en Perú para negocios locales)
- **Deploy:** Vercel
- **Facturación electrónica:** proveedor OSE tipo Nubefact (fase posterior al MVP)

### Acceso por subdominio
- Patrón tipo Instagram: el usuario escribe el nombre de su negocio → se genera un slug en tiempo real → se valida disponibilidad al instante (✅/❌)
- Formato de subdominio seleccionable: junto (`opticalopez`) o con guiones (`optica-lopez`) — default: con guiones
- Requiere DNS wildcard (`*.miweb.com`) + certificado SSL wildcard (Vercel/Cloudflare lo resuelven automático)
- **Cambio de subdominio post-registro: descartado, no se implementa** (ni en plan gratis ni pago, no aporta valor suficiente para el esfuerzo)
- Lista de subdominios reservados (blacklist): www, api, admin, app, dashboard, mail, ftp, blog, help, soporte, support, login, auth, billing, pagos, test, staging, dev, null, undefined

### Función de generación de slug (slugify)
```javascript
function generarSlug(nombreNegocio, formato = 'guiones') {
  let base = nombreNegocio
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '') // quita símbolos
    .trim();

  if (formato === 'junto') {
    return base.replace(/\s+/g, '');
  }

  return base
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```
Verificación de unicidad: consulta a Supabase antes de crear la cuenta. Si existe, sugerir alternativas (`optica-lopez-2`, etc.) o permitir que el usuario elija otro.

---

## 3. Landing page vs. Dashboard (separados)

**Landing (pública, en `miweb.com`)**
- Página de marketing/venta, la misma para todos los visitantes
- Sin datos de ningún negocio
- CTA principal: "Prueba gratis" (repetido 3 veces: header, hero, final)
- Botón secundario: "Iniciar sesión"

**Dashboard (privado, dentro de cada subdominio)**
- `[negocio].miweb.com/dashboard`
- Solo accesible tras login
- No debe indexarse en buscadores (a diferencia de la landing)

**Flujo de login:** login genérico en `miweb.com/login` → sistema identifica el tenant por el email registrado → redirección automática al subdominio correcto ya logueado (mismo patrón que Slack/Notion).

### Estructura de secciones de la landing
1. Header: logo, links (Funciones/Precios/Contacto), botón "Iniciar sesión", botón "Prueba gratis" (destacado)
2. Hero: título con dolor+solución, subtítulo, CTA grande, "Sin tarjeta de crédito · Cancela cuando quieras", mockup del dashboard
3. Prueba social / confianza
4. Problema → Solución (2-3 bloques alternados texto-imagen)
5. Funciones específicas del rubro (grid 4-6 features)
6. Cómo funciona (3 pasos)
7. Precios (Trial gratis / Plan Pro con facturación SUNAT)
8. FAQ
9. CTA final
10. Footer (legales, contacto, redes)

---

## 4. Registro self-service (100% automático)

Flujo sin intervención manual del dueño del SaaS:
1. Cliente entra a `miweb.com` → "Prueba gratis"
2. Formulario: nombre del negocio (genera subdominio en vivo), rubro, nombre, email, contraseña
3. Validación: formato correcto + no reservado + no duplicado (frontend Y backend)
4. Al confirmar, automáticamente:
   - Se crea el registro del negocio (`tenant_id` nuevo)
   - Se crea el usuario como **administrador** de ese tenant
   - Se activa `trial_inicio = hoy`, `trial_fin = hoy + 30 días`
   - Email de bienvenida
5. Redirección directa a `[subdominio].miweb.com/dashboard`, ya logueado

Proceso automático diario revisa `trial_fin`: si venció sin pago, bloquea acceso o pasa a modo solo lectura.

---

## 5. Roles y permisos (iguales en todos los rubros)

| Rol | Permisos |
|---|---|
| **Administrador** (dueño) | Todo: reportes financieros, gestión de usuarios, configuración |
| **Encargado** | Stock, ventas, clientes, turnos — sin reportes financieros completos |
| **Trabajador** | Solo ventas/atención y consulta de stock |

Validación de permisos SIEMPRE en backend, nunca solo ocultando botones en frontend.

---

## 6. Esquema de base de datos — Tablas core (compartidas entre rubros)

```sql
-- Negocios (tenants)
tabla: negocios
- id
- nombre
- subdominio (unique)
- rubro (optica / dental / veterinaria / barberia / etc.)
- ruc
- fecha_registro

-- Usuarios (empleados de cada negocio)
tabla: usuarios
- id
- negocio_id (FK)
- nombre
- email
- rol (administrador / encargado / trabajador)
- activo (boolean)

-- Suscripciones
tabla: suscripciones
- id
- negocio_id (FK)
- plan (trial / basico / premium)
- estado (activa / vencida / cancelada)
- trial_inicio
- trial_fin
- fecha_pago_ultimo
- proximo_cobro
- culqi_customer_id
- culqi_subscription_id

-- Productos/inventario (aplica a óptica y veterinaria; dental usa insumos)
tabla: productos
- id
- negocio_id (FK)
- tipo
- marca
- modelo
- material
- color
- precio_costo
- precio_venta
- stock_actual
- stock_minimo

-- Movimientos de stock (trazabilidad)
tabla: movimientos_stock
- id
- negocio_id (FK)
- producto_id (FK)
- tipo (entrada / salida / ajuste / devolución)
- cantidad
- motivo
- usuario_id (FK) -- quién hizo el movimiento
- fecha

-- Gastos
tabla: gastos
- id
- negocio_id (FK)
- categoria (alquiler, sueldos, insumos, servicios, proveedor)
- descripcion
- monto
- fecha
- usuario_id (FK)
- comprobante_url

-- Comprobantes de venta (facturación SUNAT)
tabla: comprobantes
- id
- negocio_id (FK)
- venta_id (FK)
- tipo (factura / boleta)
- serie_numero
- estado (emitido / anulado / rechazado)
- xml_url
- cdr_url
- proveedor_facturacion (ej: nubefact)

-- Turnos/citas (aplica a los 3 rubros)
tabla: turnos
- id
- negocio_id (FK)
- cliente_id (FK) -- o paciente_id / mascota_id según rubro
- fecha
- hora
- estado (agendado / confirmado / atendido / cancelado)
- usuario_id (FK) -- quién atiende
```

---

## 7. Tablas específicas por rubro

### 🔵 Óptica
```sql
tabla: pacientes_optica
- id
- negocio_id (FK)
- nombre
- telefono
- email
- fecha_nacimiento

tabla: receta_optica
- id
- paciente_id (FK)
- ojo (OD / OI)
- esfera
- cilindro
- eje
- adicion
- distancia_interpupilar
- tipo_lente (monofocal / bifocal / progresivo)
- fecha_examen
- usuario_id (FK) -- optometrista/óptico
```
Nota: catálogo de productos usa la tabla `productos` genérica (armazones, lunas, lentes de contacto) con campo `tipo`.

### 🦷 Dental
```sql
tabla: pacientes_dental
- id
- negocio_id (FK)
- nombre
- telefono
- email
- fecha_nacimiento

tabla: odontograma
- id
- paciente_id (FK)
- diente_numero (numeración FDI: 11-18, 21-28, 31-38, 41-48)
- estado (sano / caries / obturado / ausente / corona / endodoncia / extraccion_indicada)
- superficie (vestibular / lingual / oclusal / mesial / distal) -- opcional
- fecha_registro
- usuario_id (FK) -- odontólogo
- notas

tabla: insumos_dental
- id
- negocio_id (FK)
- nombre
- stock_actual
- stock_minimo
- unidad_medida
```
Visualización: diagrama SVG con los dientes coloreados según estado (blanco=sano, rojo=caries, gris=ausente, azul=obturado).

### 🐾 Veterinaria (pendiente de profundizar — propuesta inicial)
```sql
tabla: duenos
- id
- negocio_id (FK)
- nombre
- telefono
- email

tabla: mascotas
- id
- dueno_id (FK)
- nombre
- especie
- raza
- fecha_nacimiento
- peso

tabla: historial_clinico
- id
- mascota_id (FK)
- fecha
- motivo_consulta
- diagnostico
- tratamiento
- usuario_id (FK) -- veterinario

tabla: vacunas_desparasitacion
- id
- mascota_id (FK)
- tipo (vacuna / desparasitación)
- nombre_producto
- fecha_aplicacion
- proxima_fecha
- usuario_id (FK)
```
Catálogo de productos (alimentos, medicamentos, accesorios) usa la tabla `productos` genérica.

---

## 8. Pagos: Culqi

- **Stripe descartado** — no disponible directamente para negocios peruanos
- **Culqi** elegido: comisión 3.99% + S/1 por transacción aprobada, sin mensualidad. Comisión mínima S/3.50 para montos menores a S/87.72
- Checkout embebido (Culqi Checkout) — sin redirección externa, personalizable con logo/colores de marca
- **Soporta Yape** (nativo en Culqi Checkout, límite S/2,000 por transacción, solo soles)
- Requisitos de activación: RUC activo (tuyo, como dueño del SaaS — no de cada negocio cliente), DNI representante legal, cuenta bancaria empresarial
- Activación: 24-48 horas (proceso 100% digital)
- Dos ambientes: test (desarrollo) y producción (live), cada uno con sus propias llaves API
- Confirmación de pagos vía **webhooks** → dispara activación automática de suscripción

### Flujo de cobro completo
```
Trial vence sin pago → sistema bloquea/restringe acceso
         ↓
Negocio paga vía Culqi Checkout (tarjeta o Yape)
         ↓
Culqi confirma pago → webhook a tu backend
         ↓
Backend reactiva suscripción (estado: activa)
         ↓
[Fase 2] Backend dispara generación automática de comprobante
         vía API del proveedor OSE (Nubefact)
         ↓
Comprobante se registra en SUNAT (Registro de Ventas/SIRE)
```

---

## 9. Aspectos legales/tributarios (Perú) — a cargo del fundador, no del sistema

- **RUC recomendado para empezar:** RUC 10 (persona natural con negocio) — gratis, rápido, responsabilidad ilimitada pero suficiente para validar el negocio
- **Migrar a RUC 20** (persona jurídica) cuando haya ingresos estables o se sumen socios — responsabilidad limitada, requiere constitución notarial
- **Régimen tributario recomendado:** MYPE Tributario (RMT) — permite emitir factura (necesario porque los clientes son negocios que necesitan sustento de gasto), NO usar Nuevo RUS (no permite facturas)
- **Declaración mensual obligatoria** (Formulario Virtual 621), incluso en cero ("declaración sin movimiento") — SUNAT pre-llena datos según comprobantes electrónicos ya emitidos
- **Facturación electrónica de las suscripciones que cobras:** obligatoria por cada cobro. MVP: manual vía portal SUNAT o Nubefact básico. Fase 2: integración automática por API
- Cada negocio cliente (óptica/dental/veterinaria) emite sus propios comprobantes con SU PROPIO RUC — tu sistema es intermediario técnico, no factura por ellos
- Recomendado: acompañamiento de un contador en los primeros meses

---

## 10. Checklist de prioridades antes de lanzar

### Crítico (no negociable)
- [ ] RLS de Supabase probado a fondo — ningún tenant puede ver datos de otro
- [ ] Manejo de pagos fallidos (reintento + días de gracia antes de bloquear)
- [ ] Backups automáticos confirmados y con proceso de restauración probado
- [ ] Términos de servicio y política de privacidad (Ley N° 29733 de Protección de Datos Personales — importante por datos de salud en dental/veterinaria)

### Importante (semanas siguientes)
- [ ] Notificaciones automáticas (trial por vencer, pago exitoso, stock bajo)
- [ ] Panel de administrador propio (trials activos, MRR, churn)
- [ ] Onboarding dentro del producto (checklist para primeros pasos)
- [ ] Botón de soporte visible (WhatsApp/email)

### No construir todavía
- App móvil nativa
- Múltiples idiomas
- Integraciones con WhatsApp Business API
- Reportes con IA/analítica predictiva
- White-label completo
- Modelos 3D / prueba virtual de lentes / odontograma 3D con cámara (evaluado y descartado para MVP — demasiado costoso en desarrollo, poco valor real para el dolor principal del negocio)

---

## 11. Plan de validación sugerido

Antes de seguir sumando funciones: validar con 3-5 negocios reales (barberías, ópticas, dentales identificados en zona Puente Piedra / Los Olivos, Lima) usando una versión mínima del sistema por 2-3 semanas, para descubrir qué funciones importan realmente antes de sobre-construir.

---

## 12. Pendientes de definición

- Nombre final de marca por rubro (Barberly, Dentaly, Materna descartados por conflicto de marca; Ginecia sin conflictos aparentes pero con connotación a verificar)
- Verificación real de dominios en registrador (Namecheap/Nic.pe)
- Wireframe visual/mockup de alta fidelidad de la landing
- Profundizar módulo veterinaria (estructura propuesta arriba es punto de partida, no definitiva)
- Definir plan de precios exacto en soles (básico/premium)
- Definir qué funciones van en plan gratuito/trial vs. plan premium (ya definido: facturación SUNAT = premium)
