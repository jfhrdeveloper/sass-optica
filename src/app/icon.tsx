import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/* Favicon generado (no hay logo real todavía, ver docs/pending-task.md —
   "sigue faltando: logo real"): dos círculos + puente, silueta simple de
   anteojos sobre el azul de marca (`--color-primary`). Se reemplaza el día
   que exista un logo real subiendo un icon.png/svg junto a este archivo —
   Next usa el primero que encuentre por convención de nombre. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex",
          alignItems: "center", justifyContent: "center",
          background: "#2563eb", borderRadius: 7,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <div style={{ width: 11, height: 11, borderRadius: "50%", border: "2px solid white" }} />
          <div style={{ width: 4, height: 2, background: "white" }} />
          <div style={{ width: 11, height: 11, borderRadius: "50%", border: "2px solid white" }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
