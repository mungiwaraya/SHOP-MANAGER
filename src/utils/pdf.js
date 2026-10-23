import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDateTime } from './formatters';

/**
 * Professional A4 Invoice PDF — redesigned layout.
 * Features:
 *  - Clean header: logo + shop info left, invoice meta right
 *  - Styled "Bill To" box with full customer info
 *  - Professional items table with alternating rows
 *  - Totals panel (right-aligned styled box) — override price clearly shown
 *  - Transaction ID / Reference in payment section
 *  - "PAID" diagonal watermark for completed invoices
 *  - Footer: shop contact + return policy
 *
 * Font note: jsPDF built-in Helvetica covers Latin (English). Devanagari
 * characters are NOT rendered in PDF fonts — they appear fine in the in-app
 * preview (browser renders Unicode). A custom TTF font can be embedded later
 * via doc.addFileToVFS() if Hindi PDF output is required.
 */

const M = 14;           // page margin
const PAGE_W = 210;     // A4 width mm
const CONTENT_W = PAGE_W - M * 2;

// ── Color palette ─────────────────────────────────────────────
const C = {
  black:      [15, 15, 22],
  dark:       [40, 40, 55],
  muted:      [100, 100, 118],
  faint:      [155, 155, 172],
  border:     [220, 220, 230],
  headerBg:   [248, 248, 251],
  altRow:     [251, 251, 253],
  success:    [22, 163, 74],
  warning:    [180, 100, 0],
  accent:     [60, 100, 240],
  white:      [255, 255, 255],
  totalBox:   [245, 245, 250],
};

// ── Helper: set font shorthand ────────────────────────────────
function font(doc, style = 'normal', size = 9, color = C.dark) {
  doc.setFont('helvetica', style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
}

// ── Logo drawer ───────────────────────────────────────────────
function drawLogo(doc, logo, x, y, size = 16) {
  try {
    if (logo?.dataUrl && logo.type) {
      doc.addImage(logo.dataUrl, logo.type.toUpperCase(), x, y, size, size, undefined, 'FAST');
      return size;
    }
  } catch { /* fallthrough */ }
  // Placeholder square
  doc.setFillColor(...C.black);
  doc.roundedRect(x, y, size, size, 3, 3, 'F');
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size * 0.52);
  const letter = (logo?.name || 'S').trim().charAt(0).toUpperCase();
  doc.text(letter, x + size / 2, y + size / 2 + size * 0.18, { align: 'center' });
  return size;
}

/** Fetch remote logo and convert to dataURL for embedding. */
export async function loadLogoDataUrl(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const type = blob.type.split('/')[1]?.split('+')[0] || 'png';
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return { dataUrl, type: type === 'svg' ? 'png' : type };
  } catch {
    return null;
  }
}

// ── 1. HEADER ─────────────────────────────────────────────────
function drawHeader(doc, settings, logo, invoice) {
  const logoSize = 16;

  // ── Left: logo + shop info
  drawLogo(doc, logo, M, M, logoSize);

  const shopNameX = M + logoSize + 4;
  font(doc, 'bold', 14, C.black);
  doc.text(settings.shop_name || 'My Shop', shopNameX, M + 5);

  font(doc, 'normal', 7.5, C.muted);
  let infoY = M + 10;
  const infoLines = [
    settings.tagline,
    settings.address,
    [settings.phone && `Ph: ${settings.phone}`, settings.email && `Email: ${settings.email}`].filter(Boolean).join('   '),
    [settings.website, settings.gstin && `GSTIN: ${settings.gstin}`].filter(Boolean).join('   '),
  ].filter(Boolean);
  for (const line of infoLines) {
    const wrapped = doc.splitTextToSize(line, CONTENT_W * 0.52);
    doc.text(wrapped, shopNameX, infoY);
    infoY += wrapped.length * 3.6;
  }

  // ── Right: INVOICE title + meta
  const rightX = PAGE_W - M;
  font(doc, 'bold', 22, C.black);
  doc.text('INVOICE', rightX, M + 7, { align: 'right' });

  // Meta box (right side)
  const metaY = M + 11;
  const metaLines = [
    { label: 'Invoice #', value: invoice.invoice_number },
    { label: 'Date', value: formatDateTime(invoice.created_at) },
    { label: 'Payment', value: String(invoice.payment_method || '').replace(/_/g, ' ').toUpperCase() },
    { label: 'Status', value: String(invoice.status || '').toUpperCase() },
  ];

  let mY = metaY;
  for (const { label, value } of metaLines) {
    font(doc, 'normal', 7.5, C.faint);
    doc.text(label, rightX - 38, mY, { align: 'right' });
    font(doc, 'bold', 7.5, C.dark);
    doc.text(value, rightX, mY, { align: 'right' });
    mY += 4.2;
  }

  // ── Divider line
  const divY = Math.max(infoY, mY) + 4;
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.5);
  doc.line(M, divY, PAGE_W - M, divY);

  return divY + 6;
}

// ── 2. BILL TO + PAYMENT BOX ──────────────────────────────────
function drawBillTo(doc, invoice, startY) {
  // Left column: Bill To
  const boxH = 34;
  doc.setFillColor(...C.headerBg);
  doc.roundedRect(M, startY, CONTENT_W * 0.52, boxH, 2.5, 2.5, 'F');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.25);
  doc.roundedRect(M, startY, CONTENT_W * 0.52, boxH, 2.5, 2.5, 'S');

  font(doc, 'bold', 6.5, C.faint);
  doc.text('BILL TO', M + 5, startY + 6);

  font(doc, 'bold', 10, C.black);
  doc.text(invoice.customer_name || 'Walk-in Customer', M + 5, startY + 13);

  font(doc, 'normal', 7.5, C.muted);
  let cY = startY + 18.5;
  const cLines = [
    invoice.customer_mobile && `Mobile: ${invoice.customer_mobile}`,
    invoice.customer_email && `Email: ${invoice.customer_email}`,
    invoice.customer_address,
  ].filter(Boolean);
  for (const line of cLines) {
    if (cY > startY + boxH - 3) break;
    doc.text(doc.splitTextToSize(line, CONTENT_W * 0.48), M + 5, cY);
    cY += 4;
  }

  // Right column: Payment info box
  const rightBoxX = M + CONTENT_W * 0.55;
  const rightBoxW = CONTENT_W * 0.45;
  doc.setFillColor(...C.headerBg);
  doc.roundedRect(rightBoxX, startY, rightBoxW, boxH, 2.5, 2.5, 'F');
  doc.setDrawColor(...C.border);
  doc.roundedRect(rightBoxX, startY, rightBoxW, boxH, 2.5, 2.5, 'S');

  font(doc, 'bold', 6.5, C.faint);
  doc.text('PAYMENT DETAILS', rightBoxX + 5, startY + 6);

  const payRows = [
    ['Method', String(invoice.payment_method || '').replace(/_/g, ' ').toUpperCase()],
    ['Status', String(invoice.payment_status || '').toUpperCase()],
    invoice.transaction_reference && ['Ref / TXN ID', invoice.transaction_reference],
  ].filter(Boolean);

  let pY = startY + 12.5;
  for (const [label, value] of payRows) {
    font(doc, 'normal', 7, C.muted);
    doc.text(label, rightBoxX + 5, pY);
    font(doc, 'bold', 7.5, C.dark);
    doc.text(
      doc.splitTextToSize(String(value), rightBoxW - 32),
      rightBoxX + rightBoxW - 5,
      pY,
      { align: 'right' }
    );
    pY += 4.5;
  }

  return startY + boxH + 8;
}

// ── 3. ITEMS TABLE ────────────────────────────────────────────
function drawItems(doc, items, settings, startY) {
  const symbol = settings.currency_symbol || '₹';

  const body = items.map((it, i) => [
    String(i + 1),
    [
      it.product_name,
      (it.size || it.color)
        ? [it.size && `Size: ${it.size}`, it.color && `Color: ${it.color}`].filter(Boolean).join(' • ')
        : '',
      it.sku ? `SKU: ${it.sku}` : '',
    ].filter(Boolean).join('\n'),
    String(it.quantity),
    formatCurrency(it.unit_price, symbol),
    it.discount_amount > 0 ? `- ${formatCurrency(it.discount_amount, symbol)}` : '—',
    formatCurrency(it.total_amount, symbol),
  ]);

  autoTable(doc, {
    startY,
    head: [['#', 'PRODUCT / DESCRIPTION', 'QTY', 'UNIT PRICE', 'DISCOUNT', 'AMOUNT']],
    body,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      lineColor: C.border,
      lineWidth: 0.2,
      textColor: C.dark,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: C.black,
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: 6.8,
      letterSpacing: 0.5,
      cellPadding: { top: 4.5, bottom: 4.5, left: 4, right: 4 },
      lineWidth: 0,
    },
    alternateRowStyles: { fillColor: C.altRow },
    columnStyles: {
      0: { cellWidth: 9,  halign: 'center', fontStyle: 'bold', textColor: C.muted },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right', textColor: C.success },
      5: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: C.black },
    },
    margin: { left: M, right: M },
    didParseCell(data) {
      // Sub-lines (size/color, SKU) in muted color
      if (data.column.index === 1 && data.section === 'body') {
        const lines = (data.cell.raw || '').split('\n');
        if (lines.length > 1) {
          data.cell.styles.fontSize = 8;
        }
      }
    },
  });

  return doc.lastAutoTable.finalY + 6;
}

// ── 4. TOTALS PANEL ───────────────────────────────────────────
function drawTotals(doc, invoice, settings, startY) {
  const symbol = settings.currency_symbol || '₹';
  const boxW = 82;
  const boxX = PAGE_W - M - boxW;
  const isOverride = invoice.final_amount_override != null
    && invoice.final_amount_override !== invoice.total_amount;

  const rows = [
    { label: 'Subtotal', value: formatCurrency(invoice.subtotal, symbol) },
    { label: 'Discount', value: `- ${formatCurrency(invoice.discount_amount, symbol)}`, color: C.success },
    ...(settings?.tax_enabled || invoice.tax_amount > 0
      ? [{ label: `${settings?.tax_label || 'Tax'}`, value: formatCurrency(invoice.tax_amount, symbol) }]
      : []),
    ...(isOverride
      ? [{ label: 'Calculated Total', value: formatCurrency(invoice.calculated_amount || invoice.subtotal, symbol), strike: true }]
      : []),
  ];

  const rowH = 7;
  const padding = 5;
  const totalRowH = 11;
  const boxH = rows.length * rowH + totalRowH + padding * 2 + 2;

  // Box background
  doc.setFillColor(...C.totalBox);
  doc.roundedRect(boxX, startY, boxW, boxH, 3, 3, 'F');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, startY, boxW, boxH, 3, 3, 'S');

  let y = startY + padding + 4;

  for (const row of rows) {
    font(doc, 'normal', 8, row.color || C.muted);
    doc.text(row.label, boxX + padding, y);
    font(doc, 'bold', 8, row.color || C.dark);
    if (row.strike) {
      // Draw strikethrough for calculated amount
      const valStr = row.value;
      const valX = boxX + boxW - padding;
      doc.text(valStr, valX, y, { align: 'right' });
      const textW = doc.getTextWidth(valStr);
      doc.setDrawColor(...C.muted);
      doc.setLineWidth(0.4);
      doc.line(valX - textW, y - 1, valX, y - 1);
    } else {
      doc.text(row.value, boxX + boxW - padding, y, { align: 'right' });
    }
    y += rowH;
  }

  // Divider
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.line(boxX + 3, y, boxX + boxW - 3, y);
  y += 4;

  // Grand Total row
  const grandLabel = isOverride ? 'Negotiated Total' : 'Grand Total';
  const grandColor = isOverride ? C.accent : C.black;
  font(doc, 'bold', 10, grandColor);
  doc.text(grandLabel, boxX + padding, y);
  doc.text(formatCurrency(invoice.total_amount, symbol), boxX + boxW - padding, y, { align: 'right' });

  if (isOverride) {
    y += 4.5;
    font(doc, 'italic', 6.5, C.accent);
    const saving = (invoice.calculated_amount || 0) - invoice.total_amount;
    if (saving > 0) {
      doc.text(`Customer saved ${formatCurrency(saving, symbol)}`, boxX + padding, y);
    }
  }

  return startY + boxH + 6;
}

// ── 5. WATERMARK ──────────────────────────────────────────────
function drawWatermark(doc, text = 'PAID') {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.saveGraphicsState?.();
  // Semi-transparent diagonal stamp
  doc.setGState(new doc.GState({ opacity: 0.05 }));
  doc.setTextColor(...C.success);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(72);
  doc.text(text, pageW / 2, pageH / 2, {
    align: 'center',
    angle: 45,
    baseline: 'middle',
  });
  doc.restoreGraphicsState?.();
  // Reset text color
  doc.setTextColor(...C.dark);
}

// ── 6. NOTES ──────────────────────────────────────────────────
function drawNotes(doc, invoice, startY) {
  if (!invoice.notes) return startY;
  doc.setFillColor(255, 252, 235);
  doc.setDrawColor(240, 200, 100);
  doc.setLineWidth(0.25);
  const noteW = CONTENT_W * 0.55;
  const lines = doc.splitTextToSize(`Note: ${invoice.notes}`, noteW - 10);
  const noteH = lines.length * 4.5 + 8;
  doc.roundedRect(M, startY, noteW, noteH, 2.5, 2.5, 'FD');
  font(doc, 'italic', 7.8, [120, 90, 10]);
  doc.text(lines, M + 5, startY + 6);
  return startY + noteH + 6;
}

// ── 7. FOOTER ─────────────────────────────────────────────────
function drawFooter(doc, settings, startY) {
  const pageH = doc.internal.pageSize.getHeight();
  const footerY = Math.max(startY + 6, pageH - 38);

  // Divider
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.5);
  doc.line(M, footerY, PAGE_W - M, footerY);

  // Thank you message
  font(doc, 'bold', 9, C.black);
  doc.text(settings.invoice_footer || 'Thank you for your business!', PAGE_W / 2, footerY + 7, { align: 'center' });

  // Return policy
  if (settings.return_policy) {
    font(doc, 'normal', 6.8, C.muted);
    const policyLines = doc.splitTextToSize(`Return Policy: ${settings.return_policy}`, CONTENT_W);
    doc.text(policyLines, M, footerY + 13);
  }

  // Bottom strip
  doc.setFillColor(...C.headerBg);
  doc.rect(M, pageH - 12, CONTENT_W, 0.4, 'F');

  const contact = [
    settings.shop_name,
    settings.phone && `📞 ${settings.phone}`,
    settings.email && `✉ ${settings.email}`,
    settings.website,
  ].filter(Boolean).join('   •   ');

  font(doc, 'normal', 6.5, C.faint);
  doc.text(contact, PAGE_W / 2, pageH - 7, { align: 'center' });
  doc.text('Generated by Shop Manager', PAGE_W - M, pageH - 7, { align: 'right' });
}

// ── Main builder ──────────────────────────────────────────────
/**
 * Build the invoice PDF document.
 * @returns {Promise<jsPDF>}
 */
export async function buildInvoicePdf(invoice, items, settings, logo = null) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.__shopName = settings?.shop_name || '';

  let logoData = logo;
  if (!logoData && settings?.logo_url) {
    logoData = await loadLogoDataUrl(settings.logo_url);
  }

  // Watermark first (behind everything)
  if (invoice.status === 'completed' || invoice.payment_status === 'paid') {
    drawWatermark(doc, 'PAID');
  } else if (invoice.status === 'cancelled') {
    drawWatermark(doc, 'VOID');
  } else if (invoice.status === 'returned') {
    drawWatermark(doc, 'RETURNED');
  }

  let y = drawHeader(doc, settings || {}, logoData, invoice);
  y = drawBillTo(doc, invoice, y);
  y = drawItems(doc, items, settings || {}, y);
  y = drawTotals(doc, invoice, settings || {}, y);
  y = drawNotes(doc, invoice, y);
  drawFooter(doc, settings || {}, y);

  return doc;
}

function fileNameFor(invoice, settings) {
  const safeName = (settings?.shop_name || 'shop').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return `${safeName}-${invoice.invoice_number}.pdf`;
}

/** Download the PDF to the user's device */
export async function downloadInvoicePdf(invoice, items, settings, logo = null) {
  const doc = await buildInvoicePdf(invoice, items, settings, logo);
  doc.save(fileNameFor(invoice, settings));
}

/** Open a print-ready preview in a new tab */
export async function printInvoicePdf(invoice, items, settings, logo = null) {
  const doc = await buildInvoicePdf(invoice, items, settings, logo);
  const blobUrl = doc.output('bloburl');
  const win = window.open(blobUrl, '_blank');
  if (win) {
    win.addEventListener('load', () => {
      try { win.focus(); win.print(); } catch { /* user can print manually */ }
    });
  }
  return blobUrl;
}

/** Get a Blob of the PDF (for native share / preview) */
export async function getInvoicePdfBlob(invoice, items, settings, logo = null) {
  const doc = await buildInvoicePdf(invoice, items, settings, logo);
  return doc.output('blob');
}

/** Get a data-URL/iframe-friendly URL for in-app preview */
export async function getInvoicePdfUrl(invoice, items, settings, logo = null) {
  const doc = await buildInvoicePdf(invoice, items, settings, logo);
  return doc.output('datauristring');
}
