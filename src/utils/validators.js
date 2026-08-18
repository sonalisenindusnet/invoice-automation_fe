// Validation rules for the Invoice Request form.
//
// NOTE: only basic required/format checks are implemented for now (the
// specific validation rules mentioned for this form haven't been shared
// yet). Update the checks in `validateField` below once those are
// confirmed — everything else (the form, the error display) already reads
// from this file and doesn't need to change.

import { INITIAL_FORM_STATE, OPTIONAL_FIELDS } from '../constants/invoiceFormOptions';
import { convertCurrency } from '../constants/currencyRates';

// Project Value is always entered in USD (see the "USD" prefix on that
// field) — Invoice Value can be in any of CURRENCY_OPTIONS, so it has to
// be converted to USD via the conversion matrix before comparing the two.
const PROJECT_VALUE_CURRENCY = 'USD';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// PF Id shape seen in real data, e.g. "2614/Retail-Diverse/1245".
const PF_ID_RE = /^\d+\/[A-Za-z0-9-]+\/\d+$/;

export function validateEmailList(value) {
  const parts = value
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return 'Enter at least one valid email address.';
  const bad = parts.find((p) => !EMAIL_RE.test(p));
  if (bad) return `"${bad}" doesn't look like a valid email address.`;
  return null;
}

// `formData` is optional and only needed for cross-field checks (Invoice
// Value vs. Project Value below) — pass it whenever it's available.
export function validateField(name, value, formData = {}) {
  const trimmed = typeof value === 'string' ? value.trim() : value;

  if (!OPTIONAL_FIELDS.has(name) && !trimmed) {
    return 'This field is required.';
  }
  if (!trimmed) return null; // optional and empty — nothing more to check

  switch (name) {
    case 'pfId':
      return PF_ID_RE.test(trimmed) ? null : 'Expected format like 2614/Retail-Diverse/1245.';
    case 'projectValue': {
      const num = Number(trimmed);
      return Number.isNaN(num) || num <= 0 ? 'Enter a positive number.' : null;
    }
    case 'invoiceValue': {
      const num = Number(trimmed);
      if (Number.isNaN(num) || num <= 0) return 'Enter a positive number.';

      const projectValueTrimmed = typeof formData.projectValue === 'string' ? formData.projectValue.trim() : formData.projectValue;
      if (projectValueTrimmed) {
        const projectValueNum = Number(projectValueTrimmed);
        const invoiceCurrency = formData.currency || PROJECT_VALUE_CURRENCY;
        const invoiceValueInUsd = convertCurrency(num, invoiceCurrency, PROJECT_VALUE_CURRENCY);

        if (invoiceValueInUsd == null) {
          return `No conversion rate configured for ${invoiceCurrency} → ${PROJECT_VALUE_CURRENCY}.`;
        }
        if (!Number.isNaN(projectValueNum) && invoiceValueInUsd > projectValueNum) {
          return invoiceCurrency === PROJECT_VALUE_CURRENCY
            ? 'Invoice Value cannot be more than Project Value.'
            : `Invoice Value (${invoiceCurrency}) converts to more than Project Value (USD).`;
        }
      }
      return null;
    }
    case 'clientMailTo':
    case 'clientMailCc':
    case 'intCcMailId':
      return validateEmailList(trimmed);
    default:
      return null;
  }
}

export function validateAll(formData) {
  const errors = {};
  Object.keys(INITIAL_FORM_STATE).forEach((name) => {
    const error = validateField(name, formData[name], formData);
    if (error) errors[name] = error;
  });
  return errors;
}

// Percentage of Project Value that the Invoice Value represents, for the
// read-only "Invoice % of Project Value" field. Project Value is always
// USD; Invoice Value is converted from `invoiceCurrency` to USD via the
// conversion matrix (constants/currencyRates.js) before the ratio is
// taken. Returns '' when a value is missing/invalid or no conversion rate
// is configured, so the field can show a placeholder instead.
export function computeInvoicePercentage(projectValue, invoiceValue, invoiceCurrency = PROJECT_VALUE_CURRENCY) {
  const p = Number(projectValue);
  if (!projectValue || !invoiceValue || Number.isNaN(p) || p <= 0) {
    return '';
  }
  const invoiceValueInUsd = convertCurrency(invoiceValue, invoiceCurrency, PROJECT_VALUE_CURRENCY);
  if (invoiceValueInUsd == null || Number.isNaN(invoiceValueInUsd)) return '';
  return `${((invoiceValueInUsd / p) * 100).toFixed(2)}%`;
}
