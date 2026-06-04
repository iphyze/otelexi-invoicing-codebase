// components/pdf/PDFDownloadButton.jsx
// Reusable PDF download button for invoices, quotations, proformas and receipts.
// Generates the PDF on explicit click and starts the browser download reliably.

import React, { useEffect, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import useSettingsStore from '../../stores/useSettingsStore';
import useToastStore from '../../stores/useToastStore';
import InvoicePDF from './InvoicePDF';
import QuotationPDF from './QuotationPDF';
import ProformaPDF from './ProformaPDF';
import ReceiptPDF from './ReceiptPDF';
import CreditNotePDF from './CreditNotePDF';
import DeliveryNotePDF from './DeliveryNotePDF';
import './PDFDownloadButton.css';

const safeFileValue = (value, fallback) =>
  String(value || fallback).replace(/[^A-Za-z0-9_-]+/g, '_');

// Map type → PDF document component + file name.
const makeDoc = (type, doc, settings) => {
  switch (type) {
    case 'invoice':
      return {
        component: <InvoicePDF invoice={doc} settings={settings} />,
        filename: `Otelex_Invoice_${safeFileValue(doc?.invoice_number, 'INV')}.pdf`,
      };
    case 'quotation':
      return {
        component: <QuotationPDF quotation={doc} settings={settings} docType="quotation" />,
        filename: `Otelex_Quotation_${safeFileValue(doc?.quotation_number, 'QUO')}.pdf`,
      };
    case 'proforma':
      return {
        component: <ProformaPDF quotation={doc} settings={settings} docType="proforma" />,
        filename: `Otelex_Proforma_${safeFileValue(doc?.proforma_number, 'PRO')}.pdf`,
      };
    case 'receipt':
      return {
        component: <ReceiptPDF receipt={doc} settings={settings} />,
        filename: `Otelex_Receipt_${safeFileValue(doc?.receipt_number, 'RCT')}.pdf`,
      };
    case 'credit_note':
      return {
        component: <CreditNotePDF creditNote={doc} settings={settings} />,
        filename: `Otelex_Credit_Note_${safeFileValue(doc?.credit_note_number, 'CRN')}.pdf`,
      };
    case 'delivery_note':
      return {
        component: <DeliveryNotePDF deliveryNote={doc} settings={settings} />,
        filename: `Otelex_Delivery_Note_${safeFileValue(doc?.delivery_note_number, 'DN')}.pdf`,
      };
    default:
      return null;
  }
};

const downloadBlob = (blob, filename) => {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
};

const PDFDownloadButton = ({ type, doc, className = '', label = 'Download PDF' }) => {
  const { settings, fetchSettings } = useSettingsStore();
  const { showToast } = useToastStore();

  const [ready, setReady] = useState(Boolean(settings));
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let active = true;

    if (settings) {
      setReady(true);
      return () => {
        active = false;
      };
    }

    Promise.resolve(fetchSettings())
      .catch(() => null)
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [settings, fetchSettings]);

  const handleDownload = async () => {
    if (!doc || !ready || generating) return;

    const pdfDocument = makeDoc(type, doc, settings);

    if (!pdfDocument) {
      showToast('This PDF type is unavailable.', 'error');
      return;
    }

    setGenerating(true);

    try {
      const blob = await pdf(pdfDocument.component).toBlob();

      if (!blob || blob.size === 0) {
        throw new Error('Generated PDF was empty.');
      }

      downloadBlob(blob, pdfDocument.filename);
    } catch (error) {
      console.error(`Failed to generate ${type || 'document'} PDF:`, error);
      showToast(
        type === 'receipt'
          ? 'Receipt PDF could not be generated. Please try again.'
          : type === 'credit_note'
            ? 'Credit Note PDF could not be generated. Please try again.'
            : type === 'delivery_note'
              ? 'Delivery Note PDF could not be generated. Please try again.'
              : 'PDF could not be generated. Please try again.',
        'error'
      );
    } finally {
      setGenerating(false);
    }
  };

  const unavailable = !doc || !ready;

  return (
    <button
      className={`pdf-dl-btn ${(unavailable || generating) ? 'pdf-dl-loading' : ''} ${className}`}
      type="button"
      disabled={unavailable || generating}
      onClick={handleDownload}
    >
      {unavailable || generating ? (
        <>
          <span className="pdf-dl-spinner" />
          {generating ? 'Generating PDF...' : label}
        </>
      ) : (
        <>
          <i className="fas fa-file-pdf" /> {label}
        </>
      )}
    </button>
  );
};

export default PDFDownloadButton;
