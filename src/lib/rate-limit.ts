/* ================= RATE LIMITING — BEST-EFFORT, NO ES LA DEFENSA REAL =================
   La defensa real es una regla de Vercel Firewall (`vercel firewall rules add ... --action
   rate_limit`), que solo se puede configurar con el proyecto desplegado y enlazado
   (`vercel link`) — ver docs/pending-task.md, es un pendiente explícito post-despliegue.

   Mientras tanto, esto frena el caso obvio (un mismo cliente golpeando /api/registro o
   /api/pagos/culqi/cargo en loop) usando un Map en memoria del proceso. Limitación real:
   en serverless cada instancia tiene su propio Map, así que con N instancias corriendo en
   paralelo el límite efectivo puede llegar a N× el configurado — igual vale la pena porque
   ataja al atacante no sofisticado sin depender de infraestructura externa (Redis/Upstash)
   que este proyecto no tiene todavía. */

interface Contador { conteo: number; venceEn: number }

const intentos = new Map<string, Contador>();

/** Limpieza probabilística (1 de cada ~50 llamadas) — evita que el Map crezca sin límite
 *  en una instancia de Fluid Compute de larga vida, sin necesitar un `setInterval` de fondo
 *  (mala práctica en serverless: no hay garantía de que la instancia siga viva para dispararlo). */
function limpiarExpirados(ahora: number) {
  if (Math.random() > 0.02) return;
  for (const [clave, c] of intentos) {
    if (c.venceEn < ahora) intentos.delete(clave);
  }
}

/** `true` si `clave` superó `maxIntentos` dentro de `ventanaMs`. Cada llamada cuenta como
 *  un intento — llamar una sola vez por request, antes de hacer el trabajo real. */
export function limiteExcedido(clave: string, maxIntentos: number, ventanaMs: number): boolean {
  const ahora = Date.now();
  limpiarExpirados(ahora);

  const actual = intentos.get(clave);
  if (!actual || actual.venceEn < ahora) {
    intentos.set(clave, { conteo: 1, venceEn: ahora + ventanaMs });
    return false;
  }
  actual.conteo += 1;
  return actual.conteo > maxIntentos;
}

/** IP del cliente a partir de los headers que reenvía el edge de Vercel (o cualquier proxy
 *  compatible) — `x-forwarded-for` puede traer una cadena de proxies, el primero es el
 *  cliente real. */
export function ipDelRequest(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "desconocido";
}
