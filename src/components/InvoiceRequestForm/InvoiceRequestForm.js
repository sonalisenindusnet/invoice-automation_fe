import { useEffect, /* useRef, */ useState } from 'react';
import { submitInvoiceRequest } from '../../api/invoiceApi';
import { fetchProjectInfo } from '../../api/misApi';
import { validateField, validateAll, computeInvoicePercentage } from '../../utils/validators';
import { loadCachedFormData, saveCachedFormData, clearCachedFormData } from '../../utils/formCache';
import { formatMisLabel, formatMisValue } from '../../utils/misFieldFormat';
import { MIS_FIELD_MAP } from '../../constants/misFieldMap';
import {
  ENTITY_OPTIONS,
  CURRENCY_BY_ENTITY,
  CURRENCY_OPTIONS,
  WORK_ORDER_OPTIONS,
  INVOICE_TYPE_OPTIONS,
  // EVIDENCE_ACCEPT, // file upload commented out — see the "No Work Order" section below
  INITIAL_FORM_STATE,
} from '../../constants/invoiceFormOptions';
import { TextField, TextAreaField, SelectField, CheckboxField /* , FileField */ } from './FormField';
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

  // Evidence file upload — commented out for now (see the "No Work Order"
  // section below, which shows an informational message instead). Kept
  // here, inactive, in case it comes back later:
  // const [evidenceFile, setEvidenceFile] = useState(null);
  // const fileInputRef = useRef(null);

  // MIS project-info lookup, triggered by the "Fetch project details"
  // checkbox next to PF Id.
  const [fetchingProjectInfo, setFetchingProjectInfo] = useState(false);
  const [projectInfoChecked, setProjectInfoChecked] = useState(false);
  const [projectInfo, setProjectInfo] = useState(null); // raw API `data`, for the read-only panel
  const [projectInfoError, setProjectInfoError] = useState('');

  // Cache every change as a draft so a refresh during testing doesn't lose
  // what's already been typed in.
  useEffect(() => {
    saveCachedFormData(DRAFT_CACHE_KEY, formData);
  }, [formData]);

  // function resetEvidence() {
  //   setEvidenceFile(null);
  //   if (fileInputRef.current) fileInputRef.current.value = '';
  // }

  function resetProjectInfoLookup() {
    setProjectInfoChecked(false);
    setProjectInfo(null);
    setProjectInfoError('');
  }

  function handleChange(e) {
    const { name, type } = e.target;
    const value = type === 'checkbox' ? e.target.checked : e.target.value;
    let nextFormData;

    setFormData((prev) => {
      nextFormData = { ...prev, [name]: value };
      // Auto-fill currency from entity; user can still override afterwards.
      if (name === 'entity' && CURRENCY_BY_ENTITY[value]) {
        nextFormData.currency = CURRENCY_BY_ENTITY[value];
      }
      // Consent/evidence only apply when there's no Work Order — clear them
      // if the user switches back to "Yes" so stale data isn't submitted.
      if (name === 'workOrder' && value !== 'No') {
        nextFormData.noWorkOrderConsent = false;
      }
      return nextFormData;
    });

    // if (name === 'workOrder' && value !== 'No') {
    //   resetEvidence();
    // }

    // Editing PF Id after a lookup invalidates that lookup — require
    // re-verifying against the new value rather than leaving stale data.
    if (name === 'pfId' && (projectInfoChecked || projectInfo || projectInfoError)) {
      resetProjectInfoLookup();
    }

    setErrors((prev) => {
      const touchesValueFields = VALUE_TRIGGER_FIELDS.includes(name);
      if (!prev[name] && !touchesValueFields && name !== 'workOrder') return prev;

      const next = { ...prev };
      // Clear the edited field's own error right away — it may already be fixed.
      delete next[name];

      if (touchesValueFields) {
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

      if (name === 'workOrder') {
        delete next.noWorkOrderConsent;
        // if (value !== 'No') delete next.evidenceFile; // file upload commented out
      }

      return next;
    });
  }

  function handleBlur(e) {
    const { name, type } = e.target;
    const value = type === 'checkbox' ? e.target.checked : e.target.value;
    const error = validateField(name, value, formData);
    setErrors((prev) => ({ ...prev, [name]: error || undefined }));
  }

  // function handleEvidenceFileChange(e) {
  //   const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
  //   setEvidenceFile(file);
  //   setErrors((prev) => {
  //     if (!prev.evidenceFile) return prev;
  //     const next = { ...prev };
  //     delete next.evidenceFile;
  //     return next;
  //   });
  // }

  async function handleFetchProjectInfoToggle(e) {
    const checked = e.target.checked;

    if (!checked) {
      resetProjectInfoLookup();
      return;
    }

    const pfId = formData.pfId.trim();
    if (!pfId) {
      // Leave the checkbox unchecked and point at the field that needs
      // filling in first, instead of calling the API with nothing to look up.
      setErrors((prev) => ({ ...prev, pfId: 'Enter PF Id before fetching project info.' }));
      return;
    }

    setProjectInfoChecked(true);
    setProjectInfoError('');
    setProjectInfo(null);
    setFetchingProjectInfo(true);

    const result = await fetchProjectInfo(pfId);

    setFetchingProjectInfo(false);

    if (result.success) {
      setProjectInfo(result.data);
      const mapped = {};
      Object.entries(MIS_FIELD_MAP).forEach(([apiKey, formKey]) => {
        const apiValue = result.data[apiKey];
        if (apiValue !== undefined && apiValue !== null && apiValue !== '') {
          mapped[formKey] = apiValue;
        }
      });
      if (Object.keys(mapped).length > 0) {
        setFormData((prev) => ({ ...prev, ...mapped }));
      }
    } else {
      // Uncheck so the user can fix something (e.g. the PF Id) and retry.
      setProjectInfoChecked(false);
      setProjectInfoError(result.error || 'Could not fetch project info.');
    }
  }

  function handleClearDraft() {
    setFormData(INITIAL_FORM_STATE);
    setErrors({});
    setSubmitResult(null);
    // resetEvidence(); // file upload commented out
    resetProjectInfoLookup();
    clearCachedFormData(DRAFT_CACHE_KEY);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitResult(null);

    const allErrors = validateAll(formData);
    // File upload commented out — evidence is no longer collected/required;
    // see the info message shown in the "No Work Order" section instead.
    // if (formData.workOrder === 'No' && !evidenceFile) {
    //   allErrors.evidenceFile = 'Please attach a screenshot or email as evidence.';
    // }
    setErrors(allErrors);
    if (Object.keys(allErrors).length > 0) {
      setSubmitResult({ ok: false, message: 'Please fix the highlighted fields.' });
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitInvoiceRequest(formData /*, evidenceFile */);
      if (result?.success) {
        setSubmitResult({ ok: true, message: result.message || 'Saved successfully.' });
        setFormData(INITIAL_FORM_STATE);
        setErrors({});
        // resetEvidence(); // file upload commented out
        resetProjectInfoLookup();
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
        <div className={`field ${errors.pfId ? 'has-error' : ''}`}>
          <label htmlFor="pfId">
            PF Id<span className="field__required">*</span>
          </label>
          <div className="field__pfid-row">
            <input
              id="pfId"
              name="pfId"
              type="text"
              value={formData.pfId}
              placeholder="e.g. 2614/Retail-Diverse/1245"
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <label className="field__pfid-checkbox" htmlFor="fetchProjectInfo">
              <input
                id="fetchProjectInfo"
                type="checkbox"
                checked={projectInfoChecked}
                disabled={fetchingProjectInfo}
                onChange={handleFetchProjectInfoToggle}
              />
              <span>{fetchingProjectInfo ? 'Fetching…' : 'Fetch details'}</span>
            </label>
          </div>
          {errors.pfId && <span className="field__error">{errors.pfId}</span>}
        </div>

        <TextField
          label="Account Name"
          name="accountName"
          value={formData.accountName}
          placeholder="e.g. DE_COC_FC"
          error={errors.accountName}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        {projectInfoError && (
          <div className="invoice-form__mis-error field--full" role="alert">
            <span>{projectInfoError} Please fill the project details in manually.</span>
            <button
              type="button"
              className="invoice-form__mis-error-dismiss"
              onClick={() => setProjectInfoError('')}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {projectInfo && (
          <div className="invoice-form__project-info field--full">
            <p className="invoice-form__project-info-title">Project Info (from MIS)</p>
            <dl className="invoice-form__project-info-list">
              {Object.entries(projectInfo).map(([key, value]) => (
                <div className="invoice-form__project-info-row" key={key}>
                  <dt>{formatMisLabel(key)}</dt>
                  <dd>{formatMisValue(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

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

        {formData.workOrder === 'No' && (
          <div className="invoice-form__no-wo field--full">
            <p className="invoice-form__no-wo-title">No Work Order — consent required</p>

            <CheckboxField
              label="I confirm this invoice is being raised without a Work Order."
              name="noWorkOrderConsent"
              checked={formData.noWorkOrderConsent}
              error={errors.noWorkOrderConsent}
              onChange={handleChange}
              onBlur={handleBlur}
            />

            {/* File upload commented out — evidence is no longer collected
                here. Instead, just tell the requester to hold onto it themselves:
            <FileField
              label="Evidence (screenshot or email)"
              name="evidenceFile"
              inputRef={fileInputRef}
              fileName={evidenceFile?.name}
              accept={EVIDENCE_ACCEPT}
              error={errors.evidenceFile}
              onChange={handleEvidenceFileChange}
              hint="Accepted: image, PDF, or an exported email (.eml/.msg)."
            />
            */}

            {formData.noWorkOrderConsent && (
              <p className="invoice-form__no-wo-note">
                Please keep the evidence (screenshot or email) with you for future reference, since this invoice is
                being generated without a Work Order.
              </p>
            )}
          </div>
        )}

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
