import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import { PageTransitionProvider } from "@/components/landing/PageTransition";
import "./globals.css";

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
  title: "SaaS Óptica — Gestión para ópticas",
  description: "Sistema de gestión para ópticas: clientes, citas, recetas, ventas e inventario en un solo lugar.",
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
      </body>
    </html>
  );
}
