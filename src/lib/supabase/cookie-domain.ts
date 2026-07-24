/* ================= DOMINIO DE LA COOKIE DE SESIÓN =================
   El login vive en el dominio raíz pero el dashboard vive en un subdominio
   por negocio ([negocio].dominio) — para que la sesión creada en el raíz sea
   válida también en los subdominios, la cookie debe emitirse con
   Domain=.dominio (nivel padre), no Domain=dominio. En NEXT_PUBLIC_ROOT_DOMAIN
   = "localhost" (dev) se omite: los navegadores no comparten cookies con
   Domain=.localhost de forma consistente entre sub.localhost:3000. */
export function sharedCookieDomain(): string | undefined {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  if (!root || root === "localhost") return undefined;
  return `.${root}`;
}
