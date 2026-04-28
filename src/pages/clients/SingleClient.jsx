// pages/clients/SingleClient.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import useThemeStore from '../../stores/useThemeStore';
import useClientStore from '../../stores/useClientStore';
import useToastStore from '../../stores/useToastStore';
import ConfirmModal from '../../components/modals/ConfirmModal';
import { ClientFormModal, ContactFormModal } from './ClientModals';
import './SingleClient.css';

// ── Helper components ─────────────────────────────────────────────

const InfoRow = ({ icon, label, value, href }) => {
  if (!value) return null;
  return (
    <div className="sc-info-row">
      <div className="sc-info-icon"><i className={`fas ${icon}`} /></div>
      <div className="sc-info-body">
        <span className="sc-info-label">{label}</span>
        {href
          ? <a href={href} className="sc-info-value sc-link">{value}</a>
          : <span className="sc-info-value">{value}</span>
        }
      </div>
    </div>
  );
};

const Badge = ({ children, variant = 'default' }) => (
  <span className={`sc-badge sc-badge-${variant}`}>{children}</span>
);

const ContactCard = ({ contact, onEdit, onDelete }) => (
  <div className="sc-contact-card">
    {contact.is_primary === 1 && (
      <span className="sc-primary-tag"><i className="fas fa-star" /> Primary</span>
    )}
    <div className="sc-contact-top">
      <div className="sc-contact-avatar">{contact.name?.[0]?.toUpperCase()}</div>
      <div className="sc-contact-info">
        <p className="sc-contact-name">{contact.name}</p>
        {contact.position && <p className="sc-contact-pos">{contact.position}</p>}
      </div>
    </div>
    <div className="sc-contact-details">
      {contact.email && (
        <a href={`mailto:${contact.email}`} className="sc-contact-meta">
          <i className="fas fa-envelope" /> {contact.email}
        </a>
      )}
      {contact.phone && (
        <a href={`tel:${contact.phone}`} className="sc-contact-meta">
          <i className="fas fa-phone" /> {contact.phone}
        </a>
      )}
    </div>
    <div className="sc-contact-actions">
      <button className="sc-contact-btn edit" onClick={() => onEdit(contact)} type="button">
        <i className="fas fa-pen" /> Edit
      </button>
      <button className="sc-contact-btn delete" onClick={() => onDelete(contact)} type="button">
        <i className="fas fa-trash" /> Delete
      </button>
    </div>
  </div>
);

// ── Skeleton ──────────────────────────────────────────────────────

const Skeleton = ({ theme }) => (
  <div className={`sc-skeleton theme-${theme}`}>
    <div className="sc-skel-hero">
      <div className="sc-skel-avatar" />
      <div className="sc-skel-lines">
        <div className="sc-skel-block" style={{ width: '35%' }} />
        <div className="sc-skel-block" style={{ width: '55%', height: 14 }} />
        <div className="sc-skel-block" style={{ width: '25%', height: 12 }} />
      </div>
    </div>
    <div className="sc-skel-grid">
      <div className="sc-skel-col">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="sc-skel-row-skel">
            <div className="sc-skel-icon" />
            <div className="sc-skel-text">
              <div className="sc-skel-block" style={{ width: '30%', height: 10 }} />
              <div className="sc-skel-block" style={{ width: `${50 + (i % 3) * 15}%`, height: 13 }} />
            </div>
          </div>
        ))}
      </div>
      <div className="sc-skel-col">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="sc-skel-row-skel">
            <div className="sc-skel-icon" />
            <div className="sc-skel-text">
              <div className="sc-skel-block" style={{ width: '30%', height: 10 }} />
              <div className="sc-skel-block" style={{ width: `${40 + (i % 3) * 18}%`, height: 13 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ── Main page ─────────────────────────────────────────────────────

const SingleClient = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const { showToast } = useToastStore();
  const {
    fetchSingleClient, selectedClient: client, singleLoading,
    deleteClients, deactivateClients, reactivateClients, deleteContacts,
  } = useClientStore();

  const [nav, setNav] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [editContact, setEditContact] = useState(null);

  const [confirm, setConfirm] = useState({ open: false, type: '', data: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [fetchError, setFetchError] = useState(null);

  // Fetch client
  useEffect(() => {
    if (!id) return;
    setFetchError(null);
    fetchSingleClient(id).catch((err) => {
      setFetchError(err.response?.data?.message || 'Failed to load client.');
    });
  }, [id, retryCount]);

  useEffect(() => {
    if (client) document.title = `Otelex | ${client.company_name}`;
    else document.title = 'Otelex | Client';
  }, [client]);

  const handleConfirm = async () => {
    setActionLoading(true);
    try {
      if (confirm.type === 'delete-client') {
        await deleteClients([client.id]);
        showToast('Client deleted.', 'success');
        navigate('/clients');
      } else if (confirm.type === 'deactivate') {
        await deactivateClients([client.id]);
        showToast('Client deactivated.', 'success');
        setRetryCount((c) => c + 1);
      } else if (confirm.type === 'reactivate') {
        await reactivateClients([client.id]);
        showToast('Client reactivated.', 'success');
        setRetryCount((c) => c + 1);
      } else if (confirm.type === 'delete-contact') {
        await deleteContacts([confirm.data.id]);
        showToast('Contact deleted.', 'success');
        setRetryCount((c) => c + 1);
      }
      setConfirm({ open: false, type: '', data: null });
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed.', 'error');
    } finally { setActionLoading(false); }
  };

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav
          pageTitle={client?.company_name || 'Client Details'}
          links={[
            { label: 'Dashboard', to: '/' },
            { label: 'Clients', to: '/clients' },
            { label: client?.company_name || 'Details', active: true },
          ]}
        />

        <div className="sc-wrapper">

          {/* ── Loading ── */}
          {singleLoading && <Skeleton theme={theme} />}

          {/* ── Error ── */}
          {fetchError && !singleLoading && (
            <div className={`sc-error theme-${theme}`}>
              <div className="sc-error-icon">
                <i className="fas fa-triangle-exclamation" />
              </div>
              <h4>Failed to Load Client</h4>
              <p>{fetchError}</p>
              <button className="sc-retry-btn" onClick={() => setRetryCount((c) => c + 1)} type="button">
                <i className="fas fa-rotate-right" /> Retry
              </button>
            </div>
          )}

          {/* ── Content ── */}
          {client && !singleLoading && (
            <>

              {/* ── Hero card ── */}
              <motion.div
                className={`sc-hero theme-${theme}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <div className="sc-hero-left">
                  <div className="sc-hero-avatar">
                    {client.company_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="sc-hero-text">
                    <h1 className="sc-hero-name">{client.company_name}</h1>
                    <div className="sc-hero-badges">
                      <Badge variant={client.is_active ? 'active' : 'inactive'}>
                        <i className={`fas ${client.is_active ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
                        {client.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="currency">{client.currency}</Badge>
                      <Badge variant="terms">
                        {client.payment_terms === 'due_on_receipt' ? 'Due on Receipt' : 'Net 7'}
                      </Badge>
                    </div>
                    <p className="sc-hero-since">
                      <i className="fas fa-calendar-plus" />
                      Added {new Date(client.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="sc-hero-actions">
                  <button className="sc-action-btn primary" onClick={() => setEditOpen(true)} type="button">
                    <i className="fas fa-pen" /> Edit
                  </button>
                  <button className="sc-action-btn secondary" onClick={() => setContactOpen(true)} type="button">
                    <i className="fas fa-user-plus" /> Add Contact
                  </button>
                  <div className="sc-action-sep" />
                  {client.is_active ? (
                    <button className="sc-action-btn warning"
                      onClick={() => setConfirm({ open: true, type: 'deactivate', data: client })} type="button">
                      <i className="fas fa-user-slash" /> Deactivate
                    </button>
                  ) : (
                    <button className="sc-action-btn success"
                      onClick={() => setConfirm({ open: true, type: 'reactivate', data: client })} type="button">
                      <i className="fas fa-user-check" /> Reactivate
                    </button>
                  )}
                  <button className="sc-action-btn danger"
                    onClick={() => setConfirm({ open: true, type: 'delete-client', data: client })} type="button">
                    <i className="fas fa-trash" /> Delete
                  </button>
                </div>
              </motion.div>

              {/* ── Two-column detail grid ── */}
              <div className="sc-grid">

                {/* Contact & Location */}
                <motion.div
                  className={`sc-card theme-${theme}`}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.06 }}
                >
                  <h3 className="sc-card-title"><i className="fas fa-address-card" /> Contact &amp; Location</h3>
                  <div className="sc-info-list">
                    <InfoRow icon="fa-envelope" label="Email" value={client.email} href={`mailto:${client.email}`} />
                    <InfoRow icon="fa-phone" label="Phone" value={client.phone} href={`tel:${client.phone}`} />
                    <InfoRow icon="fa-location-dot" label="City" value={client.city} />
                    <InfoRow icon="fa-map" label="State" value={client.state} />
                    <InfoRow icon="fa-globe" label="Country" value={client.country} />
                    <InfoRow icon="fa-id-card" label="Tax ID / TIN" value={client.tax_id} />
                  </div>
                </motion.div>

                {/* Addresses & System */}
                <motion.div
                  className={`sc-card theme-${theme}`}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.1 }}
                >
                  <h3 className="sc-card-title"><i className="fas fa-building" /> Addresses</h3>
                  <div className="sc-info-list">
                    <InfoRow icon="fa-file-invoice" label="Billing Address" value={client.billing_address} />
                    <InfoRow icon="fa-truck" label="Shipping Address" value={client.shipping_address || 'Same as billing'} />
                  </div>
                  <div className="sc-card-divider" />
                  <h3 className="sc-card-title"><i className="fas fa-clock" /> System Info</h3>
                  <div className="sc-info-list">
                    <InfoRow icon="fa-calendar-plus" label="Created" value={client.created_at ? new Date(client.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'} />
                    <InfoRow icon="fa-calendar-check" label="Updated" value={client.updated_at ? new Date(client.updated_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'} />
                  </div>
                </motion.div>
              </div>

              {/* ── Contacts section ── */}
              <motion.div
                className={`sc-card theme-${theme} sc-contacts-section`}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.14 }}
              >
                <div className="sc-contacts-header">
                  <h3 className="sc-card-title">
                    <i className="fas fa-users" /> Contact Persons
                    {client.contacts?.length > 0 && (
                      <span className="sc-contacts-count">{client.contacts.length}</span>
                    )}
                  </h3>
                  <button className="sc-add-contact-btn" onClick={() => setContactOpen(true)} type="button">
                    <i className="fas fa-plus" /> Add Contact
                  </button>
                </div>

                {(!client.contacts || client.contacts.length === 0) ? (
                  <div className="sc-no-contacts">
                    <div className="sc-no-contacts-icon">
                      <i className="fas fa-user-group" />
                    </div>
                    <h4>No Contacts Yet</h4>
                    <p>Add a contact person for this client to keep track of who to reach.</p>
                  </div>
                ) : (
                  <div className="sc-contacts-grid">
                    {client.contacts.map((c) => (
                      <ContactCard
                        key={c.id}
                        contact={c}
                        onEdit={(contact) => { setEditContact(contact); setContactOpen(true); }}
                        onDelete={(contact) => setConfirm({ open: true, type: 'delete-contact', data: contact })}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <ClientFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        client={client}
      />

      <ContactFormModal
        open={contactOpen}
        onClose={() => { setContactOpen(false); setEditContact(null); setRetryCount((c) => c + 1); }}
        contact={editContact}
        preselectedClientId={client?.id}
      />

      <ConfirmModal
        open={confirm.open && confirm.type === 'delete-client'}
        onClose={() => setConfirm({ open: false, type: '', data: null })}
        onConfirm={handleConfirm}
        title="Delete Client"
        message="Permanently delete this client? This cannot be undone and will fail if they have associated invoices or quotations."
        confirmText="Yes, Delete" variant="danger" loading={actionLoading}
      />
      <ConfirmModal
        open={confirm.open && confirm.type === 'deactivate'}
        onClose={() => setConfirm({ open: false, type: '', data: null })}
        onConfirm={handleConfirm}
        title="Deactivate Client"
        message="Deactivate this client? They won't appear in active lists until reactivated."
        confirmText="Deactivate" variant="warning" loading={actionLoading}
      />
      <ConfirmModal
        open={confirm.open && confirm.type === 'reactivate'}
        onClose={() => setConfirm({ open: false, type: '', data: null })}
        onConfirm={handleConfirm}
        title="Reactivate Client"
        message="Reactivate this client? They will become active and usable again."
        confirmText="Reactivate" variant="success" loading={actionLoading}
      />
      <ConfirmModal
        open={confirm.open && confirm.type === 'delete-contact'}
        onClose={() => setConfirm({ open: false, type: '', data: null })}
        onConfirm={handleConfirm}
        title="Delete Contact"
        message={`Permanently delete "${confirm.data?.name}"? This cannot be undone.`}
        confirmText="Delete Contact" variant="danger" loading={actionLoading}
      />
    </div>
  );
};

export default SingleClient;