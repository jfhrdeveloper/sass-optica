import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/* Solo páginas públicas e indexables — el dashboard/admin-panel quedan
   fuera (ver robots.ts). Las 3 pestañas de /legal se listan por separado
   porque tienen contenido realmente distinto (términos, privacidad,
   protección de datos), no son la misma página con un parámetro cosmético. */
export default function sitemap(): MetadataRoute.Sitemap {
  const ahora = new Date();
  return [
    { url: SITE_URL, lastModified: ahora, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/registro`, lastModified: ahora, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/login`, lastModified: ahora, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/legal?tab=terminos`, lastModified: ahora, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/legal?tab=privacidad`, lastModified: ahora, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/legal?tab=proteccion`, lastModified: ahora, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/libro-reclamaciones`, lastModified: ahora, changeFrequency: "yearly", priority: 0.2 },
  ];
}
