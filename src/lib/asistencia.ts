import type { EstadoAsistencia } from "@/components/providers/DataProvider";

/* Sugiere el estado al marcar entrada — comparando `horaEntrada` contra el
   horario esperado del empleado + su tolerancia. Es solo una SUGERENCIA que
   la UI usa como default; el campo `estado` de cada fila de asistencia
   siempre queda editable a mano después ("todo debe ser modificable",
   pedido explícito del usuario — ver comentario largo en la tabla
   `asistencias` de supabase-schema.sql). Sin horario configurado para ese
   empleado, no hay base para juzgar tardanza: siempre "presente". */
export function sugerirEstadoAsistencia(
  horaEntrada: string,
  horaEntradaEsperada?: string,
  toleranciaMin: number = 10,
): EstadoAsistencia {
  if (!horaEntradaEsperada) return "presente";

  const minutos = (hhmm: string): number => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };

  const real = minutos(horaEntrada);
  const esperado = minutos(horaEntradaEsperada);
  return real > esperado + toleranciaMin ? "tarde" : "presente";
}
