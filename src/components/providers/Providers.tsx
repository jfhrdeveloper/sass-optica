"use client";

import { DataProvider } from "@/components/providers/DataProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";

/* Orden importa: SessionProvider busca el empleado activo DENTRO del store
   de DataProvider, así que DataProvider debe envolver por fuera. ToastProvider
   no depende de ninguno de los dos, va más afuera para que el viewport de
   toasts sobreviva aunque cambie el negocio/sesión. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <DataProvider>
        <SessionProvider>{children}</SessionProvider>
      </DataProvider>
    </ToastProvider>
  );
}
