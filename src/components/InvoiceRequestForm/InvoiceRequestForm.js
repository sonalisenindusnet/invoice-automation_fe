import { useEffect, useState } from 'react';
import { submitInvoiceRequest } from '../../api/invoiceApi';
import { validateField, validateAll, computeInvoicePercentage } from '../../utils/validators';
import { loadCachedFormData, saveCachedFormData, clearCachedFormData } from '../../utils/formCache';
import {
  ENTITY_OPTIONS,
  CURRENCY_BY_ENTITY,
  CURRENCY_OPTIONS,
  WORK_ORDER_OPTIONS,
  INVOICE_TYPE_OPTIONS,
  INITIAL_FORM_STATE,
} from '../../constants/invoiceFormOptions';
import { TextField, TextAreaField, SelectField } from './FormField';
import './InvoiceRequestForm.css';

// Fields that, when changed, can affect whether Invoice Value/Project Value
// are still valid together — Currency (and Entity, which can auto-fill
// Currency) changes which conversion rate applies, on top of the values
// themselves changing.
const VALUE_TRIGGER_FIELDS = ['projectValue', 'invoiceValue', 'currency', 'entity'];
// The fields to actually re-check whenever one of the above changes.
const VALUE_FIELDS_TO_REVALIDATE = ['projectValue', 'invoiceValue'];

// Draft cache — remembers what's been typed across page refreshes so
// manual testing doesn't require re-filling every field each time.
const DRAFT_CACHE_KEY = 'invoiceRequestForm:draft';

function getInitialFormData() {
  const cached = loadCachedFormData(DRAFT_CACHE_KEY);
  // Merge over INITIAL_FORM_STATE (not the other way round) so a cached
  // draft from before a field was added/renamed doesn't leave stale keys.
  return cached ? { ...INITIAL_FORM_STATE, ...cached } : INITIAL_FORM_STATE;
}

export default function InvoiceRequestForm() {
  const [formData, setFormData] = useState(getInitialFormData);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null); // { ok: boolean, message: string }

  // Cache every change as a draft so a refresh during testing doesn't lose
  // what's already been typed in.
  useEffect(() => {
    saveCachedFormData(DRAFT_CACHE_KEY, formData);
  }, [formData]);

  function handleChange(e) {
    const { name, value } = e.target;
    let nextFormData;

    setFormData((prev) => {
      nextFormData = { ...prev, [name]: value };
      // Auto-fill currency from entity; user can still override afterwards.
      if (name === 'entity' && CURRENCY_BY_ENTITY[value]) {
        nextFormData.currency = CURRENCY_BY_ENTITY[value];
      }
      return nextFormData;
    });

    setErrors((prev) => {
      if (!prev[name] && !VALUE_TRIGGER_FIELDS.includes(name)) return prev;

      const next = { ...prev };
      // Clear the edited field's own error right away — it may already be fixed.
      delete next[name];

      if (VALUE_TRIGGER_FIELDS.includes(name)) {
        // Re-check the linked value fields too, so a stale cross-field
        // error (Invoice Value vs. Project Value, currency-converted)
        // clears as soon as the user fixes it, without waiting for blur.
        VALUE_FIELDS_TO_REVALIDATE.forEach((fieldName) => {
          if (fieldName in next) {
            const error = validateField(fieldName, nextFormData[fieldName], nextFormData);
            if (error) next[fieldName] = error;
            else delete next[fieldName];
          }
        });
      }
      return next;
    });
  }

  function handleBlur(e) {
    const { name, value } = e.target;
    const error = validateField(name, value, formData);
    setErrors((prev) => ({ ...prev, [name]: error || undefined }));
  }

  function handleClearDraft() {
    setFormData(INITIAL_FORM_STATE);
    setErrors({});
    setSubmitResult(null);
    clearCachedFormData(DRAFT_CACHE_KEY);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitResult(null);

    const allErrors = validateAll(formData);
    setErrors(allErrors);
    if (Object.keys(allErrors).length > 0) {
      setSubmitResult({ ok: false, message: 'Please fix the highlighted fields.' });
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitInvoiceRequest(formData);
      if (result?.success) {
        setSubmitResult({ ok: true, message: result.message || 'Saved successfully.' });
        setFormData(INITIAL_FORM_STATE);
        setErrors({});
        clearCachedFormData(DRAFT_CACHE_KEY);
      } else {
        setSubmitResult({ ok: false, message: result?.message || 'Save failed. Please try again.' });
      }
    } catch (err) {
      setSubmitResult({ ok: false, message: err.message || 'Something went wrong while saving.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="invoice-form" onSubmit={handleSubmit} noValidate>
      <h1 className="invoice-form__title">Invoice Request</h1>

      <div className="invoice-form__grid">
        <TextField
          label="PF Id"
          name="pfId"
          value={formData.pfId}
          placeholder="e.g. 2614/Retail-Diverse/1245"
          error={errors.pfId}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        <TextField
          label="Account Name"
          name="accountName"
          value={formData.accountName}
          placeholder="e.g. DE_COC_FC"
          error={errors.accountName}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        <TextField
          label="Client Name"
          name="clientName"
          value={formData.clientName}
          placeholder="Client / company name"
          error={errors.clientName}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        <TextField
          label="Contact Person Name"
          name="contactPersonName"
          value={formData.contactPersonName}
          placeholder="Client-side contact person"
          error={errors.contactPersonName}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        <TextField
          label="Client Email To"
          name="clientMailTo"
          value={formData.clientMailTo}
          placeholder="accounts@client.com"
          error={errors.clientMailTo}
          onChange={handleChange}
          onBlur={handleBlur}
          hint="Separate multiple addresses with a comma."
        />

        <TextField
          label="Client Email Cc"
          name="clientMailCc"
          value={formData.clientMailCc}
          placeholder="Optional"
          error={errors.clientMailCc}
          onChange={handleChange}
          onBlur={handleBlur}
          hint="Separate multiple addresses with a comma."
          optional
        />

        <TextField
          label="INT CC Mail Id"
          name="intCcMailId"
          value={formData.intCcMailId}
          placeholder="Optional"
          error={errors.intCcMailId}
          onChange={handleChange}
          onBlur={handleBlur}
          hint="Separate multiple addresses with a comma."
          optional
        />

        <SelectField
          label="Work Order"
          name="workOrder"
          value={formData.workOrder}
          options={WORK_ORDER_OPTIONS}
          error={errors.workOrder}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        <TextField
          label="Master Project ID"
          name="masterProjectId"
          value={formData.masterProjectId}
          placeholder="Optional"
          error={errors.masterProjectId}
          onChange={handleChange}
          onBlur={handleBlur}
          optional
        />

        <SelectField
          label="Entity"
          name="entity"
          value={formData.entity}
          options={ENTITY_OPTIONS}
          error={errors.entity}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        <SelectField
          label="Currency"
          name="currency"
          value={formData.currency}
          options={CURRENCY_OPTIONS}
          error={errors.currency}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        <SelectField
          label="Invoice Type"
          name="invoiceType"
          value={formData.invoiceType}
          options={INVOICE_TYPE_OPTIONS}
          error={errors.invoiceType}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        <div className="invoice-form__value-group">
          <TextField
            label="Project Value"
            name="projectValue"
            type="number"
            value={formData.projectValue}
            placeholder="e.g. 350000"
            error={errors.projectValue}
            onChange={handleChange}
            onBlur={handleBlur}
            prefix="USD"
            hint="Always in USD, regardless of the invoice Currency."
          />

          <TextField
            label="Invoice Value"
            name="invoiceValue"
            type="number"
            value={formData.invoiceValue}
            placeholder="e.g. 350000"
            error={errors.invoiceValue}
            onChange={handleChange}
            onBlur={handleBlur}
            hint="Converted to USD at the configured rate — must not exceed Project Value."
          />

          <TextField
            label="Invoice % of Project Value"
            name="invoicePercentage"
            value={computeInvoicePercentage(formData.projectValue, formData.invoiceValue, formData.currency)}
            placeholder="Auto-calculated"
            onChange={() => {}}
            readOnly
          />
        </div>

        <TextAreaField
          label="Invoice Description"
          name="invoiceDescription"
          value={formData.invoiceDescription}
          placeholder="e.g. Monthly retainer - August 2026"
          error={errors.invoiceDescription}
          onChange={handleChange}
          onBlur={handleBlur}
          fullWidth
        />
      </div>

      {submitResult && (
        <div className={`invoice-form__banner ${submitResult.ok ? 'is-success' : 'is-error'}`}>
          {submitResult.message}
        </div>
      )}

      <div className="invoice-form__actions">
        <button type="button" className="invoice-form__clear" onClick={handleClearDraft} disabled={submitting}>
          Clear form
        </button>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
