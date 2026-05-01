import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import NavBar from '../../components/NavBar';
import PageNav from '../../components/PageNav';
import useThemeStore from '../../stores/useThemeStore';
import useInvoiceStore from '../../stores/useInvoiceStore';
import useToastStore from '../../stores/useToastStore';
import PDFDownloadButton from '../../components/pdf/PDFDownloadButton';
import { fmt, STATUS_META } from '../../utils/helper';
import PreviewInvoicePDF from '../../components/pdf/PreviewInvoicePDF';
import { motion } from 'framer-motion';
import Skeleton from '../../components/Sekeleton';


const PreviewInvoice = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const { showToast } = useToastStore();
  
  const { fetchSingleInvoice, selectedInvoice: invoice, singleLoading } = useInvoiceStore();

  const [nav, setNav] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    setFetchError(null);
    fetchSingleInvoice(id).catch((err) => {
      setFetchError(err.response?.data?.message || 'Failed to load invoice preview.');
    });
  }, [id]);

  const inv = invoice;
  const status = inv?.status;
  const statusMeta = STATUS_META[status] || STATUS_META.draft;

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav
          pageTitle={`Invoice Preview - ${inv?.invoice_number}`}
          links={[
            { label: 'Dashboard', to: '/' }, 
            { label: 'Invoices', to: '/invoices' }, 
            { label: 'Preview', active: true }
          ]}
        />

        <motion.div className="sinv-wrapper" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          
          {/* Loading State */}
          {singleLoading && <Skeleton />}

          {/* Error State */}
          {fetchError && !singleLoading && (
            <div className={`sinv-error theme-${theme}`}>
              <div className="sinv-error-icon"><i className="fas fa-triangle-exclamation" /></div>
              <h4>Failed to Load Invoice</h4>
              <p>{fetchError}</p>
              <button 
                className="sinv-retry-btn" 
                onClick={() => window.location.reload()} // Or implement a retry count state if preferred
                type="button"
              >
                <i className="fas fa-rotate-right" /> Retry
              </button>
            </div>
          )}

          {/* Main Content Area */}
          {inv && !singleLoading && (
            <div className="preview-container">
              
              {/* Top Action Bar */}
              <div className={`sinv-hero theme-${theme}`} style={{justifyContent: 'flex-end'}}>
                
                <div className="sinv-hero-actions">
                  {/* This is the button you wanted inside the screen */}
                  <PDFDownloadButton type="invoice" doc={inv} label="Download PDF" />

                </div>
              
              </div>

              <PreviewInvoicePDF doc={inv}/>

            </div>
          )}
        </motion.div>

        
      </div>
    </div>
  );
};

export default PreviewInvoice;