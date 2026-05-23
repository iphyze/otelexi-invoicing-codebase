import React from 'react';
import './PreviewInvoicePDF.css';
import { amountInWords, formatCurrencyDecimals, formatWithDecimals, STATUS_META } from '../../utils/helper';
import LogoDark from '../../assets/images/otelexi/logo-dark.png';
import LogoLight from '../../assets/images/otelexi/logo-light.png';
import useThemeStore from '../../stores/useThemeStore';
import useSettingsStore from '../../stores/useSettingsStore';

const PreviewQuotationPDF = ({ doc }) => {
  const { theme } = useThemeStore();
  const { settings } = useSettingsStore();

  const { id, 
    invoice_number, 
    quotation_number, 
    proforma_number,
    // Nested Client Object
    client: { id: clientId, company_name, address, city, state, country, email, phone, tax_id, currency: clientCurrency, payment_terms: clientPaymentTerms },
    // Dates (Handle both Due Date and Expiry Date)
    issue_date, 
    due_date, 
    expiry_date, 
    // Status & Flags
    is_overdue, 
    is_expired,
    days_overdue, 
    currency, 
    exchange_rate, 
    subtotal, 
    discount_type, 
    discount_value,
    discount_amount, 
    taxable_amount, 
    tax_amount, 
    total_amount, 
    amount_paid, 
    balance_due, 
    payment_terms, 
    footer_text, 
    notes,
    status, 
    stock_deducted, 
    reminder_count, 
    last_reminder_at, 
    next_reminder_at,
    // Arrays
    items, 
    payments,
    // Timestamps
    created_at, 
    updated_at,
  } = doc;

  const created_by_name = doc.created_by?.name;
  const approved_by_name = doc.approved_by?.name;

  const logo = theme === 'dark' ? LogoDark : LogoLight;
  const currentStatus = STATUS_META[status] || STATUS_META.draft;

  // ── DYNAMIC LOGIC: Determine Document Type ─────────────────────
  // Priority: Quotation > Proforma > Invoice
  const isQuotation = !!quotation_number;
  const isProforma = !!proforma_number;
  const isInvoice = !!invoice_number;

  // Set Header Title
  const docTitle = isQuotation ? 'SALES QUOTATION #' : (isProforma ? 'PROFORMA INVOICE #' : 'SALES INVOICE #');

  // Set Document Number
  const docNumber = quotation_number || proforma_number || invoice_number;

  // Set Date Label & Value
  const dateLabel = isQuotation ? 'Expiry Date:' : 'Due Date:';
  const dateValue = isQuotation ? expiry_date : due_date;
  
  // Show Date Status (Overdue/Expired) badge class handling
  // Note: You might want specific classes for 'expired' in your CSS, but we reuse status logic for now.
  
  // ── CALCULATIONS ────────────────────────────────────────────────
  const totalLineDiscount = items.reduce((sum, item) => {
    return sum + Number(item.discount_value || 0);
  }, 0);

  const totalDiscount = totalLineDiscount + Number(discount_amount || 0);

  const company = {
    name:    settings?.company_name || 'OTELEX LTD',
    address: settings?.address      || '',
    city:    settings?.city         || '',
    state:   settings?.state        || '',
    phone:   settings?.phone        || '+234 7079790615 | +234 7036336464',
    email:   settings?.email        || 'info@otelexng.com | sales@otelexng.com',
    website: settings?.website      || 'www.otelexng.com',
    logo:    settings?.logo_path    || null,
  };

  const contactLine = `${company.address}, ${company.city}, ${company.state}. ${company.phone} | ${company.email} | ${company.website}`;

  return (
    <div className='pdf-preview-container'>

      {/* Top Section */}
      <div className='pdf-top-flex-box'>
        <img src={logo} alt="Company Logo" className='company-logo' />

        <div className='pdf-top-right-box'>
          {/* Dynamic Header Title */}
          <p className='pdf-tr-header'>{docTitle}</p>
          <p className='pdf-inv-number'>{docNumber}</p>

          <div className='pdf-flex-wrap'>
            <p className='pdf-flex-title'>Date:</p>
            <p className='pdf-flex-text'>{issue_date}</p>
          </div>

          {/* Dynamic Date Label (Due Date vs Expiry Date) */}
          <div className='pdf-flex-wrap mg-bottom'>
            <p className='pdf-flex-title'>{dateLabel}</p>
            <p className='pdf-flex-text'>{dateValue}</p>
          </div>

          <div className={`pdf-status-badge ${currentStatus.cls}`}>
            {currentStatus.label}
          </div>
        </div>
      </div>

      {/* Client Info */}
      <div className='pdf-data-flexbox'>

        <div className='pdf-data-col'>
          <div className='pdf-flex-wrap-two'>
            <p className='pdf-flex-title'>Billed to</p>
          </div>
          <div className='pdf-flex-wrap-two'>
            <p className='pdf-flex-title-two'>Name:</p>
            <p className='pdf-flex-text-two'>{company_name}</p>
          </div>
          <div className='pdf-flex-wrap-two'>
            <p className='pdf-flex-title-two'>Address:</p>
            <p className='pdf-flex-text-two'>
              {address}, {city}, {state}
            </p>
          </div>
          <div className='pdf-flex-wrap-two'>
            <p className='pdf-flex-title-two'>Phone:</p>
            <p className='pdf-flex-text-two'>{phone}</p>
          </div>
          <div className='pdf-flex-wrap-two'>
            <p className='pdf-flex-title-two'>Country:</p>
            <p className='pdf-flex-text-two'>{country}</p>
          </div>
          <div className='pdf-flex-wrap-two'>
            <p className='pdf-flex-title-two'>Email:</p>
            <p className='pdf-flex-text-two'>{email}</p>
          </div>
        </div>

        <div className='pdf-data-col'>
          <div className='pdf-flex-wrap-two'>
            <p className='pdf-flex-title'>Quote Details</p>
          </div>
          <div className='pdf-flex-wrap-two'>
            <p className='pdf-flex-title-two'>VAT #:</p>
            <p className='pdf-flex-text-two'>{tax_id || '—'}</p>
          </div>
          <div className='pdf-flex-wrap-two'>
            <p className='pdf-flex-title-two'>TIN:</p>
            <p className='pdf-flex-text-two'>{doc.client?.tin || '—'}</p>
          </div>
          <div className='pdf-flex-wrap-two'>
            <p className='pdf-flex-title-two'>Reference:</p>
            <p className='pdf-flex-text-two'>{quotation_number}</p>
          </div>
          <div className='pdf-flex-wrap-two'>
            <p className='pdf-flex-title-two'>Expiry Date:</p>
            <p className='pdf-flex-text-two'>{expiry_date}</p>
          </div>
        </div>

      </div>

      {/* Table */}
      <div className='pdf-table'>
        <div className='pdf-table-inner'>
        <div className='pdf-flex-table pdf-flex-table-header'>
          <div className='pdf-tab-data pdf-tab-data-sn'>S/N</div>
          <div className='pdf-tab-data pdf-tab-data-desc'>Description</div>
          <div className='pdf-tab-data pdf-tab-data-amt'>Unit Price</div>
          <div className='pdf-tab-data pdf-tab-data-val'>Qty</div>
          <div className='pdf-tab-data pdf-tab-data-val'>Disc (%)</div>
          <div className='pdf-tab-data pdf-tab-data-amt'>Disc (Amt)</div>
          <div className='pdf-tab-data pdf-tab-data-amt'>Total {currency}</div>
        </div>

        {items.map((item, i) => {
          const discPct =
            item.discount_type === 'fixed' && item.unit_price > 0
              ? ((item.discount_value / (item.quantity * item.unit_price)) * 100).toFixed(1)
              : '0.0';

          return (
            <div key={i} className='pdf-flex-table pdf-flex-table-body'>
              <div className='pdf-tab-data pdf-tab-data-sn'>{i + 1}</div>
              <div className='pdf-tab-data pdf-tab-data-desc'>{item.description}</div>
              <div className='pdf-tab-data pdf-tab-data-amt'>
                {formatWithDecimals(item.unit_price, item.currency)}
              </div>
              <div className='pdf-tab-data pdf-tab-data-val'>{item.quantity}</div>
              <div className='pdf-tab-data pdf-tab-data-val'>{discPct}</div>
              <div className='pdf-tab-data pdf-tab-data-amt'>
                {item.discount_amount > 0
                  ? formatWithDecimals(item.discount_amount, item.currency)
                  : '0.00'}
              </div>
              <div className='pdf-tab-data pdf-tab-data-amt'>
                {formatWithDecimals(item.line_total, item.currency)}
              </div>
            </div>
          );
        })}

        {/* Empty Rows */}
        {items.length < 8 &&
          [...Array(8 - items.length)].map((_, i) => (
            <div key={i} className='pdf-flex-table pdf-flex-table-body pdf-flex-table-body-empty'>
              <div className='pdf-tab-data pdf-tab-data-sn'></div>
              <div className='pdf-tab-data pdf-tab-data-desc'></div>
              <div className='pdf-tab-data pdf-tab-data-val'></div>
              <div className='pdf-tab-data pdf-tab-data-val'></div>
              <div className='pdf-tab-data pdf-tab-data-amt'></div>
              <div className='pdf-tab-data pdf-tab-data-amt'></div>
            </div>
          ))}

        </div>
      </div>

      {/* Totals Section */}
      <div className='pdf-details-flexbox pdf-quotation-summary'>

        <div className='pdf-quotation-notice'>
          <p className='pdf-quotation-notice-title'>Quotation Only</p>
          <p className='pdf-quotation-notice-text'>
            This quotation presents the proposed price and applicable tax only.
            Payment should be made after an approved proforma invoice or final invoice is issued.
          </p>
        </div>

        <div className='pdf-total-box'>
          <div className='pdf-total-flexbox'>
            <div className='pdf-total-title'>Subtotal</div>
            <div className='pdf-total-value'>{formatWithDecimals(subtotal, currency)}</div>
          </div>

          <div className='pdf-total-flexbox'>
            <div className='pdf-total-title'>Discount</div>
            <div className='pdf-total-value'>{discount_amount > 0 ? `(${formatWithDecimals(discount_amount, currency)})` : '0.00'}</div>
          </div>

          <div className='pdf-total-flexbox pdf-total-flexbox-nettotal'>
            <div className='pdf-total-title'>Net Total</div>
            <div className='pdf-total-value'>{formatWithDecimals(subtotal - discount_amount, currency)}</div>
          </div>

          <div className='pdf-total-flexbox'>
            <div className='pdf-total-title'>VAT (7.5%)</div>
            <div className='pdf-total-value'>{formatWithDecimals(tax_amount, currency)}</div>
          </div>

          <div className='pdf-total-flexbox pdf-total-flexbox-total'>
            <div className='pdf-total-title'>Grand Total</div>
            <div className='pdf-total-value'>{formatCurrencyDecimals(total_amount, currency)}</div>
          </div>
          
        </div>

      </div>


      <div className='pdf-note-amt-box'>
          <p className='pdf-amt-words-header'>Amount in words</p>
          <p className='pdf-amt-words-text'>{amountInWords(total_amount)}</p>
          {notes && <p className='pdf-notes'>{notes}</p>}
          <p className='pdf-notes'>{settings?.legal_footer}</p>
      </div>


      <div className="pdf-signature-box">
        <div className="pdf-signature-group">
          <div className="pdf-signature-line">{created_by_name}</div>
          <div className="pdf-signature-text">Created By</div>
        </div>

        <div className="pdf-signature-group">
          <div className="pdf-signature-line">{approved_by_name}</div>
          <div className="pdf-signature-text">Authorized By</div>
        </div>

        <div className="pdf-signature-group">
          <div className="pdf-signature-line"></div>
          <div className="pdf-signature-text">Received By</div>
        </div>
      </div>

      
      <div className='pdf-footer'>
          {contactLine}
      </div>


    </div>
  );
};

export default PreviewQuotationPDF;