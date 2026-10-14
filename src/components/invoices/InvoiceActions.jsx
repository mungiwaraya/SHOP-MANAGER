import React, { useState } from 'react';
import { Download, Printer, Share2, MessageCircle, FileText, Eye } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import { useShop } from '../../contexts/ShopContext';
import {
  downloadInvoicePdf,
  printInvoicePdf,
  getInvoicePdfBlob,
  getInvoicePdfUrl,
} from '../../utils/pdf';
import { buildInvoiceMessage, openWhatsApp, sharePdfNative, canNativeShareFiles } from '../../utils/whatsapp';
import InvoicePreview from './InvoicePreview';

/**
 * Honest PDF + WhatsApp flow:
 *   1. Generate the real PDF (download / native share / print / preview)
 *   2. Open the customer's WhatsApp chat with the prepared message
 * The browser cannot attach PDFs to WhatsApp deep-links, so we never fake it —
 * where the device supports it we use the native share sheet to send the PDF.
 */
export default function InvoiceActions({ invoice, compact = false, showPreview = true }) {
  const { settings, shopName, currency } = useShop();
  const { toast } = useToast();
  const [busy, setBusy] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const items = invoice?.items || [];
  const message = buildInvoiceMessage({
    customerName: invoice?.customer_name,
    shopName: settings?.shop_name || shopName,
    invoiceNumber: invoice?.invoice_number,
    totalAmount: invoice?.total_amount,
    currencySymbol: currency,
  });

  const run = async (key, fn) => {
    setBusy(key);
    try {
      await fn();
    } catch {
      toast.error('Could not complete the action. Please try again.');
    } finally {
      setBusy('');
    }
  };

  const handleDownload = () =>
    run('download', async () => {
      await downloadInvoicePdf(invoice, items, settings);
      toast.success('Invoice PDF downloaded');
    });

  const handlePrint = () =>
    run('print', async () => {
      await printInvoicePdf(invoice, items, settings);
    });

  const handlePreview = () =>
    run('preview', async () => {
      const url = await getInvoicePdfUrl(invoice, items, settings);
      setPreviewUrl(url);
      setPreviewOpen(true);
    });

  const handleWhatsApp = () =>
    run('whatsapp', async () => {
      // Best case: native share can deliver the PDF through WhatsApp
      if (canNativeShareFiles()) {
        const blob = await getInvoicePdfBlob(invoice, items, settings);
        const shared = await sharePdfNative(
          blob,
          `${invoice.invoice_number}.pdf`,
          message
        );
        if (shared) return;
      }
      // Reliable fallback: open the chat with the prepared message
      if (!invoice?.customer_mobile) {
        toast.warn('No mobile number saved for this customer');
        return;
      }
      openWhatsApp(invoice.customer_mobile, message);
      toast.info('WhatsApp opened — attach the downloaded PDF to send the bill');
    });

  const handleShare = () =>
    run('share', async () => {
      const blob = await getInvoicePdfBlob(invoice, items, settings);
      const file = new File([blob], `${invoice.invoice_number}.pdf`, { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: message, title: `Invoice ${invoice.invoice_number}` });
      } else if (navigator.share) {
        await navigator.share({ text: message, title: `Invoice ${invoice.invoice_number}` });
      } else {
        await downloadInvoicePdf(invoice, items, settings);
        toast.info('Sharing is not supported here — PDF downloaded instead');
      }
    });

  const size = compact ? 'sm' : 'md';

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {showPreview && (
          <Button variant="secondary" size={size} onClick={handlePreview} loading={busy === 'preview'}>
            <Eye size={15} /> Preview
          </Button>
        )}
        <Button variant="primary" size={size} onClick={handleDownload} loading={busy === 'download'}>
          <Download size={15} /> PDF
        </Button>
        <Button variant="secondary" size={size} onClick={handlePrint} loading={busy === 'print'}>
          <Printer size={15} /> Print
        </Button>
        <Button variant="success" size={size} onClick={handleWhatsApp} loading={busy === 'whatsapp'}>
          <MessageCircle size={15} /> WhatsApp
        </Button>
        {canNativeShareFiles() && (
          <Button variant="secondary" size={size} onClick={handleShare} loading={busy === 'share'}>
            <Share2 size={15} /> Share
          </Button>
        )}
      </div>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={`Invoice ${invoice?.invoice_number || ''}`}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => window.open(previewUrl, '_blank')}>
              <FileText size={15} /> Open in new tab
            </Button>
            <Button variant="primary" onClick={handleDownload} loading={busy === 'download'}>
              <Download size={15} /> Download PDF
            </Button>
          </>
        }
      >
        <InvoicePreview invoice={invoice} items={items} />
      </Modal>
    </>
  );
}
