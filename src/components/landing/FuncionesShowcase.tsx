"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

/* Sección de funciones con pestañas + vista previa del panel — patrón
   tomado de la landing de Finegym (competidor real del rubro, research de
   docs/pending-task.md): en vez de una grilla estática de tarjetas, cada
   módulo tiene su propio título/descripción/checklist y una vista previa a
   la derecha. La vista previa NO es una captura real (no hay todavía, ver
   los placeholders `[ captura: ... ]` del resto de la landing) — es una
   mini tabla de mentira armada con los mismos tokens de marca que el panel
   real, para no depender de screenshots que se desactualizan solos. */

interface Modulo {
  clave: string;
  tab: string;
  titulo: string;
  desc: string;
  bullets: string[];
  columnas: string[];
  filas: string[][];
}

const MODULOS: Modulo[] = [
  {
    clave: "clientes",
    tab: "Clientes",
    titulo: "Conoce a cada paciente por su nombre.",
    desc: "Perfil completo, historial de citas y recetas, recordatorio de control. Todo para que vuelvan.",
    bullets: [
      "Perfil con historial de citas, recetas y compras.",
      "Recordatorio automático para el próximo control.",
      "Búsqueda rápida por nombre o documento.",
    ],
    columnas: ["Nombre", "Documento", "Teléfono"],
    filas: [
      ["Rosa Quispe", "45678912", "987 654 321"],
      ["Jorge Salazar", "41234567", "912 345 678"],
      ["Luz Mendoza", "48765432", "998 111 222"],
    ],
  },
  {
    clave: "citas",
    tab: "Citas",
    titulo: "Tu agenda, sin cuaderno ni WhatsApp.",
    desc: "Turnos por optometrista, con la receta del paciente a un clic de distancia.",
    bullets: [
      "Calendario simple por optometrista.",
      "Receta del paciente a la mano en cada cita.",
      "Estados: programada, atendida, cancelada.",
    ],
    columnas: ["Paciente", "Fecha", "Estado"],
    filas: [
      ["Rosa Quispe", "24 jul, 10:00 am", "Programada"],
      ["Jorge Salazar", "24 jul, 11:30 am", "Atendida"],
      ["Luz Mendoza", "25 jul, 4:00 pm", "Programada"],
    ],
  },
  {
    clave: "recetas",
    tab: "Recetas",
    titulo: "La graduación de cada paciente, siempre a mano.",
    desc: "Esfera, cilindro, eje y distancia interpupilar de cada ojo, ligados a la cita en que se tomaron.",
    bullets: [
      "OD y OI: esfera, cilindro, eje y adición.",
      "Distancia interpupilar en milímetros.",
      "Historial completo por paciente.",
    ],
    columnas: ["Paciente", "Tipo", "Fecha"],
    filas: [
      ["Rosa Quispe", "Lejos", "10 jul 2026"],
      ["Jorge Salazar", "Progresivo", "02 jul 2026"],
      ["Luz Mendoza", "Lentes de contacto", "28 jun 2026"],
    ],
  },
  {
    clave: "stock",
    tab: "Stock",
    titulo: "Sabe qué te queda antes de que se acabe.",
    desc: "Armazones, lunas y lentes de contacto, con alerta automática de stock mínimo.",
    bullets: [
      "Alerta cuando un producto llega a su mínimo.",
      "Categorías: armazón, luna, lente de contacto, líquido.",
      "Estado Activo o Borrador antes de publicarlo.",
    ],
    columnas: ["Producto", "Categoría", "Stock"],
    filas: [
      ["Ray-Ban RB2140", "Montura", "5"],
      ["Luna antireflejo 1.56", "Luna", "1"],
      ["Lente de contacto mensual", "Lente de contacto", "12"],
    ],
  },
  {
    clave: "ventas",
    tab: "Ventas",
    titulo: "Cada venta, con el IGV calculado solo.",
    desc: "Registra la venta, descuenta el stock y calcula el IGV sin que tengas que hacer cuentas.",
    bullets: [
      "IGV automático (18%).",
      "Efectivo, tarjeta, Yape, Plin o transferencia.",
      "El stock baja solo, sin ajustarlo a mano.",
    ],
    columnas: ["Fecha", "Cliente", "Total"],
    filas: [
      ["24 jul", "Rosa Quispe", "S/ 350.00"],
      ["23 jul", "Jorge Salazar", "S/ 120.00"],
      ["22 jul", "Luz Mendoza", "S/ 480.00"],
    ],
  },
  {
    clave: "gastos",
    tab: "Gastos",
    titulo: "Tu caja, sin sorpresas a fin de mes.",
    desc: "Alquiler, sueldos, insumos. Todo el gasto del mes en un solo lugar.",
    bullets: [
      "Categorías: alquiler, sueldos, insumos, proveedor.",
      "Total del mes siempre a la vista.",
      "Solo lo ve quien tú decidas.",
    ],
    columnas: ["Categoría", "Descripción", "Monto"],
    filas: [
      ["Alquiler", "Local principal", "S/ 1,200.00"],
      ["Insumos", "Líquido de limpieza", "S/ 85.00"],
      ["Sueldos", "Quincena julio", "S/ 2,400.00"],
    ],
  },
  {
    clave: "empleados",
    tab: "Equipo",
    titulo: "Cada quien ve lo que le corresponde.",
    desc: "Administrador, encargado y trabajador, con permisos puntuales que puedes delegar sin cambiarle el rol a nadie.",
    bullets: [
      "Tres roles fijos: administrador, encargado, trabajador.",
      "Permisos puntuales delegables por módulo.",
      "Invita a tu equipo por correo.",
    ],
    columnas: ["Nombre", "Email", "Rol"],
    filas: [
      ["Ana Torres", "ana@optica.pe", "Administrador"],
      ["Luis Ramos", "luis@optica.pe", "Encargado"],
      ["Mía Flores", "mia@optica.pe", "Trabajador"],
    ],
  },
];

function VistaPrevia({ modulo }: { modulo: Modulo }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
        <span className="ml-3 text-xs text-slate-500 dark:text-slate-500">app.tuoptica.pe/dashboard/{modulo.clave}</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-500">
            {modulo.columnas.map((c) => (
              <th key={c} className="px-4 py-2 font-medium">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {modulo.filas.map((fila, i) => (
            <tr key={i} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
              {fila.map((celda, j) => (
                <td key={j} className="px-4 py-3 text-slate-700 dark:text-slate-300">{celda}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FuncionesShowcase() {
  const [activa, setActiva] = useState(MODULOS[0].clave);
  const modulo = MODULOS.find((m) => m.clave === activa) ?? MODULOS[0];

  return (
    <div>
      {/* Un solo bloque con indicador deslizante (antes: 7 píldoras sueltas
          que se prendían y apagaban) — ver SegmentedControl.tsx. */}
      <SegmentedControl
        aria-label="Módulos del sistema"
        opciones={MODULOS.map((m) => ({ valor: m.clave, label: m.tab }))}
        valor={activa}
        onChange={setActiva}
      />

      <div className="mx-auto mt-10 grid max-w-4xl items-center gap-10 sm:grid-cols-2">
        <div>
          <h3 className="text-2xl text-slate-900 dark:text-slate-100">{modulo.titulo}</h3>
          <p className="mt-3 text-slate-600 dark:text-slate-300">{modulo.desc}</p>
          <ul className="mt-5 space-y-2.5">
            {modulo.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <Check size={16} className="mt-0.5 shrink-0 text-accent" />
                {b}
              </li>
            ))}
          </ul>
          <Link href="/registro" className="mt-5 inline-block text-sm font-medium link">
            Empezar gratis →
          </Link>
        </div>
        <VistaPrevia modulo={modulo} />
      </div>
    </div>
  );
}
