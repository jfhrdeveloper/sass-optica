/* Horario por defecto del tema (ver docs/style-guide.md): claro de 7:00 a.m.
   a 6:00 p.m., oscuro el resto — usa la hora LOCAL del dispositivo del
   usuario, no la del servidor (layout.tsx y ThemeScheduler.tsx corren esta
   misma lógica en el cliente para no desincronizarse). Solo aplica cuando el
   usuario no eligió manualmente con ThemeToggle.tsx (esa elección se guarda
   en localStorage['tema'] y siempre gana sobre el horario). */
const HORA_INICIO_CLARO = 7;
const HORA_INICIO_OSCURO = 18;

export function oscuroPorHorario(fecha: Date = new Date()): boolean {
  const hora = fecha.getHours();
  return hora >= HORA_INICIO_OSCURO || hora < HORA_INICIO_CLARO;
}

/* Milisegundos hasta el próximo cambio de franja (7:00 o 18:00) — se usa
   para programar un solo `setTimeout` exacto en vez de sondear con
   `setInterval`, así el cambio de tema se ve al instante sin refrescar. */
export function msHastaProximoCambio(fecha: Date = new Date()): number {
  const proximo = new Date(fecha);
  const hora = fecha.getHours();
  if (hora < HORA_INICIO_CLARO) {
    proximo.setHours(HORA_INICIO_CLARO, 0, 0, 0);
  } else if (hora < HORA_INICIO_OSCURO) {
    proximo.setHours(HORA_INICIO_OSCURO, 0, 0, 0);
  } else {
    proximo.setDate(proximo.getDate() + 1);
    proximo.setHours(HORA_INICIO_CLARO, 0, 0, 0);
  }
  return proximo.getTime() - fecha.getTime();
}
