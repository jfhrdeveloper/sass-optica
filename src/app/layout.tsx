import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { PageTransitionProvider } from "@/components/landing/PageTransition";
import { AnalyticsProvider } from "@/components/providers/AnalyticsProvider";
import { RAZON_SOCIAL } from "@/lib/contacto";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const TITULO = `${RAZON_SOCIAL} — Software de gestión para ópticas en Perú`;
const DESCRIPCION =
  "Sistema de gestión para ópticas peruanas: clientes, citas, recetas, ventas, inventario y facturación electrónica SUNAT en un solo lugar. Prueba gratis, sin tarjeta.";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/* Fuente de títulos — más pesada/geométrica que Geist a propósito, para que
   h1/h2/h3 y el nombre de marca destaquen del cuerpo de texto (ver
   .font-display y la regla `h1,h2,h3` en globals.css). */
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITULO, template: `%s · ${RAZON_SOCIAL}` },
  description: DESCRIPCION,
  keywords: [
    "software para ópticas", "sistema de gestión para ópticas", "software óptica Perú",
    "sistema para ópticas Perú", "gestión de óptica", "facturación electrónica óptica",
    "programa para óptica", "ERP óptica",
  ],
  authors: [{ name: RAZON_SOCIAL }],
  /* index/follow explícito en la raíz — dashboard/layout.tsx y
     admin-panel/layout.tsx lo pisan con `false` (defensa en profundidad,
     ver robots.ts). */
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "es_PE",
    siteName: RAZON_SOCIAL,
    title: TITULO,
    description: DESCRIPCION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRIPCION,
  },
};

/* Hardening móvil (ver docs/style-guide.md): sin auto-zoom al tocar inputs. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Aplica el tema ANTES del primer paint — evita el flash de tema
            incorrecto (FOUC) que tendríamos si esto se hiciera en un efecto
            de React. Es el único lugar del proyecto donde se justifica un
            script inline: no hay forma de leer localStorage en el server. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('tema');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <PageTransitionProvider>{children}</PageTransitionProvider>
        {/* Sin cookies, sin PII, datos anónimos descartados a las 24h — no
            requiere el consentimiento de AnalyticsProvider (ver bitácora). */}
        <Analytics />
        <AnalyticsProvider />
      </body>
    </html>
  );
}
