import React from 'react';

const HERO_CONFIG = {
  quotation: {
    eyebrow: 'Sales Quotation',
    icon: 'fa-file-signature',
    createTitle: 'Create a clear, professional quotation',
    editTitle: 'Update quotation details',
    description: 'Present transparent pricing, VAT and agreed discounts for customer review before proceeding to a proforma invoice.',
    steps: [
      { icon: 'fa-pen-ruler', label: 'Prepare pricing' },
      { icon: 'fa-paper-plane', label: 'Send for review' },
      { icon: 'fa-arrow-right-arrow-left', label: 'Convert when approved' },
    ],
  },
  proforma: {
    eyebrow: 'Proforma Invoice',
    icon: 'fa-file-invoice-dollar',
    createTitle: 'Prepare a payment-ready proforma',
    editTitle: 'Update proforma invoice details',
    description: 'Confirm approved commercial terms, tax and payment details before the final invoice is issued.',
    steps: [
      { icon: 'fa-circle-check', label: 'Confirm terms' },
      { icon: 'fa-building-columns', label: 'Present payment details' },
      { icon: 'fa-file-invoice', label: 'Issue final invoice' },
    ],
  },
};

const DocumentFormHero = ({ type = 'quotation', mode = 'create', documentNumber = '' }) => {
  const config = HERO_CONFIG[type] || HERO_CONFIG.quotation;
  const isEdit = mode === 'edit';

  return (
    <section className={`qf-hero qf-hero-${type}`} aria-label={`${config.eyebrow} workflow`}>
      <div className="qf-hero-content">
        <div className="qf-hero-eyebrow">
          <i className={`fas ${config.icon}`} />
          <span>{config.eyebrow}</span>
          {documentNumber && <strong>{documentNumber}</strong>}
        </div>

        <h2>{isEdit ? config.editTitle : config.createTitle}</h2>
        <p>{config.description}</p>
      </div>

      <div className="qf-hero-flow">
        {config.steps.map((step, index) => (
          <React.Fragment key={step.label}>
            <div className="qf-flow-step">
              <span className="qf-flow-icon"><i className={`fas ${step.icon}`} /></span>
              <span>{step.label}</span>
            </div>
            {index < config.steps.length - 1 && (
              <i className="fas fa-chevron-right qf-flow-arrow" aria-hidden="true" />
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
};

export default DocumentFormHero;
