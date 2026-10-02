export const PAYMENT_TERM_OPTIONS = [
  { value: 'due_on_receipt', label: 'Due on Receipt', icon: 'fa-clock' },
  { value: 'net_7', label: 'Net 7 Days', icon: 'fa-calendar-days' },
  { value: 'net_15', label: 'Net 15 Days', icon: 'fa-calendar-days' },
  { value: 'net_30', label: 'Net 30 Days', icon: 'fa-calendar-days' },
];

const TERM_DAYS = {
  due_on_receipt: 0,
  net_7: 7,
  net_15: 15,
  net_30: 30,
};

const TERM_LABELS = Object.fromEntries(PAYMENT_TERM_OPTIONS.map(({ value, label }) => [value, label]));

export const getPaymentTermLabel = (value) => TERM_LABELS[value] || value || 'Due on Receipt';

export const calculatePaymentDueDate = (issueDate, paymentTerms) => {
  if (!issueDate) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(issueDate);
  if (!match) return issueDate;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  date.setUTCDate(date.getUTCDate() + (TERM_DAYS[paymentTerms] ?? 0));
  return date.toISOString().slice(0, 10);
};
