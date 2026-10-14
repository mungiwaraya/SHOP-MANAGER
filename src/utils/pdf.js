import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDateTime } from './formatters';

/**
 * PDF invoice generation (A4, print-friendly, logo support).
 *
 * Language note: jsPDF's built-in fonts (Helvetica) cover Latin scripts
 * (English). Devanagari/Hindi glyphs are NOT embedded in the core fonts,
 * so Hindi product/customer text is transliterated-safe only if stored in
 * English; the in-app invoice preview fully supports Hindi via browser fonts.
 * (Embedding a Unicode TTF is possible later via `doc.addFileToVFS`.)
 */

const MARGIN = 16;

function drawLogo(doc, logo, x, y, size = 18) {
  try {
    if (logo?.dataUrl && logo.type) {
      doc.addImage(logo.dataUrl, logo.type.toUpperCase(), x, y, size, size, undefined, 'FAST');
      return size;
    }
  } catch {
    /* fall through to placeholder */
  }
  doc.setFillColor(17, 17, 20);
  doc.roundedRect(x, y, size, size, 3.5, 3.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size * 0.55);
  const initial = (logo?.name || 'S').trim().charAt(0).toUpperCase();
  doc.text(initial, x + size / 2, y + size / 2 + size * 0.19, { align: 'center' });
  return size;
}

/** Fetch remote logo and convert to dataURL for embedding (CORS-safe on Supabase public buckets). */
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

function drawHeader(doc, settings, logo, invoice) {
  const pageWidth = doc.internal.pageSize.getWidth();
  drawLogo(doc, logo, MARGIN, 14, 18);

  doc.setTextColor(22, 22, 29);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(settings.shop_name || 'My Shop', MARGIN + 23, 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 120);
  let y = 27.5;
  const lines = [
    settings.address,
    [settings.phone && `Phone: ${settings.phone}`, settings.email && `Email: ${settings.email}`].filter(Boolean).join('  •  '),
    [settings.website, settings.gstin && `GSTIN: ${settings.gstin}`].filter(Boolean).join('  •  '),
  ].filter(Boolean);
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line, pageWidth * 0.5);
    doc.text(wrapped, MARGIN + 23, y);
    y += wrapped.length * 4;
  }

  // Invoice title + meta (right aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(22, 22, 29);
  doc.text('INVOICE', pageWidth - MARGIN, 22, { align: 'right' });

  doc.setFontSize(8.7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 120);
  doc.text(`Invoice #: ${invoice.invoice_number}`, pageWidth - MARGIN, 29, { align: 'right' });
  doc.text(`Date: ${formatDateTime(invoice.created_at)}`, pageWidth - MARGIN, 33.5, { align: 'right' });
  doc.text(`Payment: ${String(invoice.payment_method || '').replace('_', ' ').toUpperCase()}`, pageWidth - MARGIN, 38, {
    align: 'right',
  });
  doc.text(`Status: ${String(invoice.status || '').toUpperCase()}`, pageWidth - MARGIN, 42.5, {
    align: 'right',
  });

  // Divider
  doc.setDrawColor(230, 230, 238);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, 50, pageWidth - MARGIN, 50);
  return 57;
}

function drawBillTo(doc, invoice, startY) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 170);
  doc.text('BILL TO', MARGIN, startY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(22, 22, 29);
  doc.text(invoice.customer_name || 'Walk-in Customer', MARGIN, startY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.7);
  doc.setTextColor(100, 100, 120);
  let y = startY + 11;
  const rows = [
    invoice.customer_mobile && `Mobile: ${invoice.customer_mobile}`,
    invoice.customer_email && `Email: ${invoice.customer_email}`,
    invoice.customer_address,
  ].filter(Boolean);
  for (const line of rows) {
    doc.text(line, MARGIN, y);
    y += 4.5;
  }

  // Shop side note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 170);
  const note = `Thank you for shopping with ${doc.__shopName || 'us'}.`;
  doc.text(doc.splitTextToSize(note, 70), pageWidth - MARGIN, startY + 6, { align: 'right' });

  return y + 4;
}

function drawItems(doc, invoice, items, settings, startY) {
  const symbol = settings.currency_symbol || '₹';
  const body = items.map((it, i) => [
    String(i + 1),
    `${it.product_name}${it.size || it.color ? `\n${[it.size && `Size: ${it.size}`, it.color && `Color: ${it.color}`].filter(Boolean).join(' • ')}` : ''}`,
    it.sku || '—',
    String(it.quantity),
    formatCurrency(it.unit_price, symbol),
    it.discount_amount > 0 ? formatCurrency(it.discount_amount, symbol) : '—',
    formatCurrency(it.total_amount, symbol),
  ]);

  autoTable(doc, {
    startY,
    head: [['#', 'Product', 'SKU', 'Qty', 'Price', 'Discount', 'Total']],
    body,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 2.8,
      lineColor: [234, 234, 240],
      lineWidth: 0.2,
      textColor: [55, 55, 75],
    },
    headStyles: {
      fillColor: [244, 244, 247],
      textColor: [85, 85, 106],
      fontStyle: 'bold',
      fontSize: 7.6,
      lineWidth: 0,
    },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  return doc.lastAutoTable.finalY + 8;
}

function drawTotals(doc, invoice, settings, startY) {
  const symbol = settings.currency_symbol || '₹';
  const pageWidth = doc.internal.pageSize.getWidth();
  const labelX = pageWidth - MARGIN - 70;
  const valueX = pageWidth - MARGIN;

  const rows = [
    ['Subtotal', formatCurrency(invoice.subtotal, symbol)],
    ['Discount', `- ${formatCurrency(invoice.discount_amount, symbol)}`],
    [settings.tax_label || 'Tax', formatCurrency(invoice.tax_amount, symbol)],
  ];

  doc.setFontSize(9);
  let y = startY;
  for (const [label, value] of rows) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 120);
    doc.text(label, labelX, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 55, 75);
    doc.text(value, valueX, y, { align: 'right' });
    y += 5.6;
  }

  // Grand total
  doc.setDrawColor(220, 220, 230);
  doc.line(labelX, y - 1.5, valueX, y - 1.5);
  y += 3.2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(22, 22, 29);
  doc.text('Grand Total', labelX, y);
  doc.text(formatCurrency(invoice.total_amount, symbol), valueX, y, { align: 'right' });

  return y + 8;
}

function drawFooter(doc, settings, startY) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const y = Math.max(startY + 4, pageHeight - 42);

  doc.setDrawColor(230, 230, 238);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(22, 22, 29);
  doc.text(settings.invoice_footer || 'Thank you for shopping with us!', MARGIN, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(120, 120, 140);
  const policy = settings.return_policy || '';
  const contact = `${settings.shop_name || 'Shop'}  •  ${settings.phone || ''}  •  ${settings.email || ''}`.replace('  •  ', '  •  ').trim();
  if (policy) {
    const lines = doc.splitTextToSize(`Return Policy: ${policy}`, pageWidth - MARGIN * 2);
    doc.text(lines, MARGIN, y + 12.5);
  }
  doc.text(contact, MARGIN, pageHeight - 10);
  doc.text('Generated by Shop Manager', pageWidth - MARGIN, pageHeight - 10, { align: 'right' });
}

/**
 * Build the invoice PDF document.
 * @returns {Promise<jsPDF>}
 */
export async function buildInvoicePdf(invoice, items, settings, logo = null) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.__shopName = settings.shop_name || '';

  let logoData = logo;
  if (!logoData && settings.logo_url) {
    logoData = await loadLogoDataUrl(settings.logo_url);
  }

  let y = drawHeader(doc, settings, logoData, invoice);
  y = drawBillTo(doc, invoice, y);
  y = drawItems(doc, invoice, items, settings, y);
  y = drawTotals(doc, invoice, settings, y);
  drawFooter(doc, settings, y);

  if (invoice.notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 150);
    doc.text(`Note: ${invoice.notes}`, MARGIN, y + 2);
  }

  return doc;
}

function fileNameFor(invoice, settings) {
  const safeName = (settings.shop_name || 'shop').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
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
      try {
        win.focus();
        win.print();
      } catch {
        /* user can print manually */
      }
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
