// Maps MIS "project info" API response keys → form field names.
//
// Only list a mapping here if the API key should actually OVERWRITE a form
// field on a successful fetch. Anything the API returns that ISN'T listed
// here still shows up in the read-only "Project Info" panel (see
// InvoiceRequestForm.js) — it just won't be written into the submitted
// form data. The response shape is expected to change over time, so keep
// this mapping intentionally small and add to it as fields are confirmed.
//
// company_location is deliberately NOT mapped to `entity` — the API's
// values (e.g. "India") don't match the Entity dropdown's options
// (USA/UK/Poland/Singapore), so Entity is left for the user to pick by
// hand rather than risk being set to an invalid/unlisted value.
export const MIS_FIELD_MAP = {
  client_name: 'clientName',
};
