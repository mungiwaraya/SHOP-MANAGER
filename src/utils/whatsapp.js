import { formatCurrency } from './formatters';

/**
 * WhatsApp integration — browser / deep-link based (no fake PDF attachment).
 *
 * Honest flow (what the app does):
 *   1. Generate + download/share the PDF (real file via Download / Web Share API).
 *   2. Open the customer's WhatsApp chat with a prepared invoice message.
 *
 * WhatsApp deep-links cannot attach files from the browser, so we never
 * pretend to. When `navigator.share` with files is supported (most modern
 * mobile browsers), we offer a native share sheet that can send the PDF
 * through WhatsApp directly.
 */

/** 10-digit Indian mobile → wa.me compatible (91XXXXXXXXXX). */
export function normalizeWhatsAppNumber(mobile) {
  let clean = String(mobile || '').replace(/\D/g, '');
  if (clean.length === 12 && clean.startsWith('91')) return clean;
  if (clean.length === 11 && clean.startsWith('0')) clean = clean.slice(1);
  if (clean.length === 10) return `91${clean}`;
  return clean;
}

export function buildInvoiceMessage({ customerName, shopName, invoiceNumber, totalAmount, currencySymbol = '₹' }) {
  const name = customerName || 'Customer';
  const total = formatCurrency(totalAmount, currencySymbol);
  return (
    `Hello ${name},\n\n` +
    `Thank you for shopping with ${shopName || 'us'}.\n\n` +
    `Your invoice ${invoiceNumber} has been generated.\n\n` +
    `Total Amount: ${total}\n\n` +
    `Thank you!\n${shopName || 'Shop Manager'}`
  );
}

/** Open WhatsApp chat (web on desktop, app on mobile) with a pre-filled message. */
export function openWhatsApp(mobile, message) {
  const number = normalizeWhatsAppNumber(mobile);
  if (!number) return false;
  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

/** Can the browser share files natively? (Android Chrome / iOS Safari 15+) */
export function canNativeShareFiles() {
  return typeof navigator !== 'undefined' && !!navigator.canShare && !!navigator.share;
}

/**
 * Native share of the PDF file (e.g. straight into a WhatsApp chat).
 * Falls back gracefully — caller should then run openWhatsApp().
 */
export async function sharePdfNative(blob, fileName, text) {
  if (!canNativeShareFiles()) return false;
  try {
    const file = new File([blob], fileName, { type: 'application/pdf' });
    if (!navigator.canShare({ files: [file] })) return false;
    await navigator.share({ files: [file], text, title: fileName });
    return true;
  } catch (err) {
    if (err?.name === 'AbortError') return true; // user closed the sheet
    return false;
  }
}
