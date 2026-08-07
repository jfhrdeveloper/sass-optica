import type { Venta, VentaItem } from "@/components/providers/DataProvider";

/* Recibo de venta imprimible — separado en una función pura (testable, sin
   `window`/`document`) que arma el HTML; quien la llama (ventas/page.tsx) es
   responsable de abrirlo en una ventana nueva e imprimir. No es un
   comprobante SUNAT (eso es la fase de facturación electrónica, ver
   docs/pending-task.md) — es un recibo interno para el cliente y para el
   cierre de caja del día. */
export interface DatosRecibo {
  negocioNombre: string;
  negocioRuc?: string;
  clienteNombre: string;
  venta: Venta;
  items: VentaItem[];
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function construirHtmlRecibo({ negocioNombre, negocioRuc, clienteNombre, venta, items }: DatosRecibo): string {
  const fecha = new Date(venta.fecha).toLocaleString("es-PE", { timeZone: "America/Lima" });
  const filas = items.map((it) => `
    <tr>
      <td>${escapeHtml(it.descripcion)}</td>
      <td class="num">${it.cantidad}</td>
      <td class="num">S/ ${it.precioUnitario.toFixed(2)}</td>
      <td class="num">S/ ${it.subtotal.toFixed(2)}</td>
    </tr>`).join("");

  /* Descuento y recargo por tarjeta no tienen columna propia en `ventas`
     (ver DataProvider.Venta) — ventas/page.tsx los arma como texto en
     `venta.notas`, separados por " · ", y acá se despliegan como líneas
     propias en vez de un párrafo suelto. Antes esta info se calculaba pero
     nunca llegaba a mostrarse en la boleta impresa. */
  const lineasNotas = (venta.notas ?? "")
    .split(" · ")
    .filter(Boolean)
    .map((linea) => `<div><span>${escapeHtml(linea)}</span></div>`)
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Recibo de venta</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; max-width: 340px; margin: 0 auto; padding: 16px; color: #1e293b; }
  h1 { font-size: 16px; margin: 0 0 2px; }
  .sub { font-size: 12px; color: #64748b; margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; border-bottom: 1px solid #cbd5e1; padding: 4px 2px; font-weight: 600; }
  td { padding: 4px 2px; border-bottom: 1px dashed #e2e8f0; }
  .num { text-align: right; }
  .totales { margin-top: 10px; font-size: 13px; }
  .totales div { display: flex; justify-content: space-between; padding: 2px 0; }
  .total-final { font-weight: 700; font-size: 15px; border-top: 1px solid #1e293b; margin-top: 4px; padding-top: 6px !important; }
  footer { margin-top: 16px; text-align: center; font-size: 11px; color: #94a3b8; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>${escapeHtml(negocioNombre)}</h1>
  <p class="sub">${negocioRuc ? `RUC ${escapeHtml(negocioRuc)} · ` : ""}${fecha}</p>
  <p class="sub">Cliente: ${escapeHtml(clienteNombre)}</p>
  <table>
    <thead><tr><th>Descripción</th><th class="num">Cant.</th><th class="num">P. Unit.</th><th class="num">Subtotal</th></tr></thead>
    <tbody>${filas}</tbody>
  </table>
  <div class="totales">
    <div><span>Subtotal</span><span>S/ ${venta.subtotal.toFixed(2)}</span></div>
    <div><span>IGV</span><span>S/ ${venta.igv.toFixed(2)}</span></div>
    ${lineasNotas}
    <div class="total-final"><span>Total</span><span>S/ ${venta.total.toFixed(2)}</span></div>
    <div><span>Método de pago</span><span style="text-transform:capitalize">${escapeHtml(venta.metodoPago)}</span></div>
  </div>
  <footer>Recibo interno — no es comprobante de pago electrónico.</footer>
</body>
</html>`;
}
