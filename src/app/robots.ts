import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/* Bloquea el rastreo de las áreas privadas (dashboard de negocio, panel
   admin, API) — son rutas que solo tienen sentido logueado, no aportan nada
   indexado y filtrarían estructura interna sin necesidad. La landing,
   /legal y las pantallas de acceso quedan abiertas: son las que de verdad
   busca en Google el dueño de una óptica. Ver también el `robots: {index:
   false}` en dashboard/layout.tsx y admin-panel/layout.tsx — defensa en
   profundidad, por si algún día alguien enlaza una URL privada desde afuera
   (disallow acá solo evita el RASTREO, no garantiza que Google nunca la
   indexe si ya la conoce por otro lado). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/admin-panel", "/api", "/registro/completar"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
