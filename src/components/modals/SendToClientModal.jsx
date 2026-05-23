// components/modals/SendToClientModal.jsx
// Reusable PDF-email modal for invoices, quotations and proforma invoices.

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useThemeStore from '../../stores/useThemeStore';
import useToastStore from '../../stores/useToastStore';
import { fetchDocumentEmailHistory, sendDocumentWithPdf } from '../../utils/documentEmail';
import './SendToClientModal.css';

const ICON = {
  invoice: 'fa-file-invoice',
  quotation: 'fa-file-pen',
  proforma: 'fa-file-circle-check',
  receipt: 'fa-receipt',
  credit_note: 'fa-file-circle-minus',
};

const LABEL = {
  invoice: 'Invoice',
  quotation: 'Quotation',
  proforma: 'Proforma Invoice',
  receipt: 'Payment Receipt',
  credit_note: 'Credit Note',
};

const stageLabel = {
  preparing: 'Preparing...',
  generating: 'Generating PDF...',
  sending: 'Sending email...',
};

const formatSentAt = (value) => {
  if (!value) return '';
  return new Date(value.replace(' ', 'T')).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const SendToClientModal = ({
  open,
  onClose,
  onSent,
  documentType = 'invoice',
  documentNumber = '',
  documentId,
  documentData = null,
  clientName = '',
  clientEmail = '',
}) => {
  const { theme } = useThemeStore();
  const { showToast } = useToastStore();

  const [mounted, setMounted] = useState(false);
  const [animIn, setAnimIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('');
  const [recipient, setRecipient] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const exitTimer = useRef(null);
  const inputRef = useRef(null);

  const loadHistory = async () => {
    if (!documentId) return;
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const rows = await fetchDocumentEmailHistory(documentType, documentId);
      setHistory(rows);
    } catch (historyRequestError) {
      setHistoryError(
        historyRequestError.response?.data?.message || 'Send history is unavailable.'
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    clearTimeout(exitTimer.current);
    setRecipient(clientEmail || '');
    setError('');
    setStage('');
    setMounted(true);
    loadHistory();

    requestAnimationFrame(() => {
      setAnimIn(true);
      setTimeout(() => inputRef.current?.focus(), 80);
    });
  }, [open, clientEmail, documentId, documentType]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    if (loading) return;
    setAnimIn(false);
    exitTimer.current = setTimeout(() => {
      setMounted(false);
      onClose();
    }, 270);
  };

  useEffect(() => {
    if (!open && mounted && animIn) handleClose();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimeout(exitTimer.current), []);

  const handleSend = async () => {
    setError('');
    const email = recipient.trim().toLowerCase();

    if (!email) {
      setError('Recipient email is required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setStage('preparing');

    try {
      await sendDocumentWithPdf({
        documentType,
        documentId,
        documentData,
        recipientEmail: email,
        onStage: setStage,
      });

      showToast(`${LABEL[documentType]} PDF sent to ${email} successfully.`, 'success');
      await loadHistory();
      setAnimIn(false);
      exitTimer.current = setTimeout(() => {
        setMounted(false);
        onClose();
        onSent?.();
      }, 270);
    } catch (sendError) {
      const message = sendError.response?.data?.message
        || sendError.message
        || 'Failed to send the document. Please try again.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
      setStage('');
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !loading) handleSend();
    if (event.key === 'Escape') handleClose();
  };

  if (!mounted) return null;

  return createPortal(
    <div className={`stc-backdrop ${animIn ? 'stc-visible' : ''}`} onClick={handleClose}>
      <div
        className={`stc-modal theme-${theme} ${animIn ? 'stc-modal-in' : 'stc-modal-out'}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Send ${LABEL[documentType]}`}
      >
        <div className="stc-header">
          <div className="stc-header-icon">
            <i className={`fas ${ICON[documentType] || 'fa-file'}`} />
          </div>
          <div>
            <h3 className="stc-title">Send {LABEL[documentType]}</h3>
            <p className="stc-subtitle">{documentNumber}</p>
          </div>
          <button className="stc-close" onClick={handleClose} type="button" disabled={loading}>
            <i className="fas fa-xmark" />
          </button>
        </div>

        <div className="stc-body">
          <div className="stc-attachment">
            <div className="stc-attachment-icon"><i className="fas fa-file-pdf" /></div>
            <div>
              <p className="stc-attachment-title">PDF attached automatically</p>
              <p className="stc-attachment-copy">
                {documentType === 'receipt'
                  ? 'An official receipt PDF will be generated and attached to the email.'
                  : documentType === 'credit_note'
                    ? 'The issued credit note PDF will be generated and attached for the client’s records.'
                    : 'The same PDF shown in the preview will be generated and included in the email.'}
              </p>
            </div>
          </div>

          <div className="stc-client-row">
            <div className="stc-client-avatar">{clientName?.[0]?.toUpperCase() || '?'}</div>
            <div>
              <p className="stc-client-name">{clientName || 'Client'}</p>
              <p className="stc-client-default">
                Default: {clientEmail || <em style={{ opacity: 0.4 }}>No email on file</em>}
              </p>
            </div>
          </div>

          <div className="stc-field">
            <label className="stc-label" htmlFor="document-email-recipient">
              Recipient Email <span className="stc-required">*</span>
            </label>
            <div className="stc-input-wrap">
              <i className="fas fa-envelope stc-input-icon" />
              <input
                ref={inputRef}
                id="document-email-recipient"
                type="email"
                className={`stc-input theme-${theme} ${error ? 'has-error' : ''}`}
                placeholder="client@example.com"
                value={recipient}
                onChange={(event) => { setRecipient(event.target.value); setError(''); }}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
            </div>
            {clientEmail && recipient !== clientEmail && (
              <button
                type="button"
                className="stc-reset-email"
                onClick={() => { setRecipient(clientEmail); setError(''); }}
                disabled={loading}
              >
                <i className="fas fa-rotate-left" /> Use client default ({clientEmail})
              </button>
            )}
            {error && (
              <span className="stc-error"><i className="fas fa-circle-exclamation" /> {error}</span>
            )}
          </div>

          <div className="stc-history">
            <div className="stc-history-heading">
              <span><i className="fas fa-clock-rotate-left" /> Send History</span>
              <button type="button" onClick={loadHistory} disabled={historyLoading || loading}>
                <i className={`fas ${historyLoading ? 'fa-spinner fa-spin' : 'fa-rotate-right'}`} />
              </button>
            </div>

            {historyLoading ? (
              <p className="stc-history-empty">Loading send history...</p>
            ) : historyError ? (
              <p className="stc-history-empty">{historyError}</p>
            ) : history.length === 0 ? (
              <p className="stc-history-empty">This document has not been emailed yet.</p>
            ) : (
              <div className="stc-history-list">
                {history.slice(0, 3).map((entry) => (
                  <div className="stc-history-item" key={entry.id}>
                    <span className={`stc-history-status ${entry.delivery_status}`}>
                      <i className={`fas ${entry.delivery_status === 'sent' ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
                    </span>
                    <div className="stc-history-content">
                      <p>{entry.recipient_email}</p>
                      <small>{formatSentAt(entry.sent_at)}{entry.sent_by_name ? ` • ${entry.sent_by_name}` : ''}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="stc-actions">
          <button className="stc-btn stc-cancel" onClick={handleClose} type="button" disabled={loading}>
            Cancel
          </button>
          <button className="stc-btn stc-send" onClick={handleSend} type="button" disabled={loading}>
            {loading ? (
              <><span className="stc-spinner" /> {stageLabel[stage] || 'Sending...'}</>
            ) : (
              <><i className="fas fa-paper-plane" /> Send with PDF</>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SendToClientModal;
