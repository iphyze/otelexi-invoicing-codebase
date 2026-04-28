// components/pdf/PDFDownloadButton.jsx
// A single reusable button that wraps @react-pdf/renderer's PDFDownloadLink.
// Handles async settings loading and shows a loading spinner while PDF is generating.
//
// Usage:
//   <PDFDownloadButton type="invoice"   doc={invoice}   />
//   <PDFDownloadButton type="quotation" doc={quotation} />
//   <PDFDownloadButton type="proforma"  doc={proforma}  />

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import useSettingsStore from '../../stores/useSettingsStore';
import InvoicePDF from './InvoicePDF';
import QuotationPDF from './QuotationPDF';
import './PDFDownloadButton.css';

// Map type → PDF document component + file name generator
const makeDoc = (type, doc, settings) => {
  switch (type) {
    case 'invoice':
      return {
        component: <InvoicePDF invoice={doc} settings={settings} />,
        filename: `Otelex_Invoice_${doc?.invoice_number || 'INV'}.pdf`,
      };
    case 'quotation':
      return {
        component: <QuotationPDF quotation={doc} settings={settings} docType="quotation" />,
        filename: `Otelex_Quotation_${doc?.quotation_number || 'QUO'}.pdf`,
      };
    case 'proforma':
      return {
        component: <QuotationPDF quotation={doc} settings={settings} docType="proforma" />,
        filename: `Otelex_Proforma_${doc?.proforma_number || 'PRO'}.pdf`,
      };
    default:
      return null;
  }
};

const PDFDownloadButton = ({ type, doc, className = '', label = 'Download PDF' }) => {
  const { settings, fetchSettings } = useSettingsStore();
  const [ready, setReady] = useState(false);

  // Load settings once so logo + bank details are available
  useEffect(() => {
    if (settings) { setReady(true); return; }
    fetchSettings().then(() => setReady(true)).catch(() => setReady(true));
  }, [settings]);

  if (!doc || !ready) {
    return (
      <button className={`pdf-dl-btn pdf-dl-loading ${className}`} disabled type="button">
        <span className="pdf-dl-spinner" />
        {label}
      </button>
    );
  }

  const { component, filename } = makeDoc(type, doc, settings) || {};

  if (!component) return null;

  return (
    <PDFDownloadLink document={component} fileName={filename}>
      {({ loading }) => (
        <button
          className={`pdf-dl-btn ${loading ? 'pdf-dl-loading' : ''} ${className}`}
          type="button"
          disabled={loading}
        >
          {loading
            ? <><span className="pdf-dl-spinner" /> Generating PDF...</>
            : <><i className="fas fa-file-pdf" /> {label}</>
          }
        </button>
      )}
    </PDFDownloadLink>
  );
};

export default PDFDownloadButton;
