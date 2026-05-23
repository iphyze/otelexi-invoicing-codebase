// utils/numberFormat.js

// Formats with 2 decimals → 1,250.00
export const formatWithDecimals = (number) => {
  if (number === null || number === undefined || isNaN(number)) return "0.00";
  return Number(number)
    .toFixed(2) // force 2 decimal places
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Formats without decimals → 1,250
export const formatWithoutDecimals = (number) => {
  if (number === null || number === undefined || isNaN(number)) return "0";
  return Math.round(Number(number)) // round to nearest integer
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};


export const formatCurrencyDecimals = (number, cur = 'NGN') => {
  // 1. Handle invalid numbers
  if (number === null || number === undefined || isNaN(number)) return "0.00";

  // 2. Map the currency codes to symbols
  const symbols = {
    NGN: "₦",
    USD: "$",
    GBP: "£",
    EUR: "€"
  };

  // 3. Get the symbol (defaults to NGN if the code isn't in our list)
  const symbol = symbols[cur.toUpperCase()] || "₦";

  // 4. Format the number with 2 decimals and commas
  const formattedNumber = Number(number)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `${symbol} ${formattedNumber}`;
};


// Format date string from "2025-11-07 23:28:07" to "November 11th, 2025"
export const formatDateLong = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = date.toLocaleDateString('en-US', options);
  
  // Add ordinal suffix to day (1st, 2nd, 3rd, 4th, etc.)
  const day = date.getDate();
  const suffix = getOrdinalSuffix(day);
  
  // Replace the day number with day + suffix
  return formattedDate.replace(/\b\d+\b/, `${day}${suffix}`);
};


// Format date string to "Month Year" format (e.g., "December 2025")
export const formatDateMonthYear = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }
    
    const options = { year: 'numeric', month: 'long' };
    return date.toLocaleDateString('en-US', options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};


// For Otelex

export const fmt = (n, cur = 'NGN') => {
  const sym = cur === 'USD' ? '$' : '₦';
  return sym + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });
};


export const STATUS_META = {
  draft:     { label: 'Draft',     cls: 'pdf-st-draft',     icon: 'fa-pen' },
  sent:      { label: 'Sent',      cls: 'pdf-st-sent',      icon: 'fa-paper-plane' },
  partial:   { label: 'Partial',   cls: 'pdf-st-partial',   icon: 'fa-circle-half-stroke' },
  paid:      { label: 'Paid',      cls: 'pdf-st-paid',      icon: 'fa-circle-check' },
  overdue:   { label: 'Overdue',   cls: 'pdf-st-overdue',   icon: 'fa-triangle-exclamation' },
  credited:  { label: 'Credited',  cls: 'pdf-st-partial',   icon: 'fa-file-circle-minus' },
  reversed:  { label: 'Reversed',  cls: 'pdf-st-cancelled', icon: 'fa-rotate-left' },
  cancelled: { label: 'Cancelled', cls: 'pdf-st-cancelled', icon: 'fa-ban' },
};


export const PDF_STATUS_META = {
  draft:     { label: 'Draft',     style: 'draftSt', color: '#4b5563'},
  sent:      { label: 'Sent',      style: 'sentSt', color: '#1e40af'},
  partial:   { label: 'Partial',   style: 'partialSt', color: '#92400e'},
  paid:      { label: 'Paid',      style: 'paidSt', color: '#047857'},
  overdue:   { label: 'Overdue',   style: 'overdueSt', color: '#b91c1c'},
  credited:  { label: 'Credited',  style: 'partialSt', color: '#d97706'},
  reversed:  { label: 'Reversed',  style: 'cancelledSt', color: '#374151'},
  cancelled: { label: 'Cancelled', style: 'cancelledSt', color: '#374151'},
};

// Helper function to get ordinal suffix for a number
const getOrdinalSuffix = (num) => {
  const j = num % 10;
  const k = num % 100;
  
  if (j === 1 && k !== 11) {
    return 'st';
  }
  if (j === 2 && k !== 12) {
    return 'nd';
  }
  if (j === 3 && k !== 13) {
    return 'rd';
  }
  return 'th';
};


// Convert number to words (Nigerian style up to billions)
const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
  'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

function toWords(n) {
  if (n === 0) return 'Zero';
  if (n < 0)   return 'Minus ' + toWords(-n);
  if (n < 20)  return ones[n];
  if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
  if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + toWords(n%100) : '');
  if (n < 1000000) return toWords(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + toWords(n%1000) : '');
  if (n < 1000000000) return toWords(Math.floor(n/1000000)) + ' Million' + (n%1000000 ? ' ' + toWords(n%1000000) : '');
  return toWords(Math.floor(n/1000000000)) + ' Billion' + (n%1000000000 ? ' ' + toWords(n%1000000000) : '');
}

export const amountInWords = (amount, currency = 'NGN') => {
  const n = Math.round(Number(amount || 0) * 100);
  const digits = Math.floor(n / 100);
  const point = n % 100;

  // Configuration for different currencies
  const currencyMap = {
    NGN: { major: 'Naira', minor: 'Kobo' },
    USD: { 
      major: digits === 1 ? 'Dollar' : 'Dollars', 
      minor: 'Cents' 
    }
  };

  const config = currencyMap[currency.toUpperCase()] || currencyMap.NGN;

  // Convert major units
  let result = toWords(digits) + ' ' + config.major;

  // Convert minor units (if any)
  if (point > 0) {
    result += ' and ' + toWords(point) + ' ' + config.minor;
  }

  result += ' Only';

  // Clean up extra spaces and capitalize the first letter
  return result.replace(/\s+/g, ' ').trim();
};

export const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};