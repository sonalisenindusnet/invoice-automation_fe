// Static configuration for the Invoice Request form: dropdown option lists
// and the form's initial/default values. Kept separate from the component
// so options can be adjusted (or later fetched from an API) without
// touching the form or validation logic.

// Entities currently live in the invoice pipeline (USA / UK / Poland 2026).
export const ENTITY_OPTIONS = ["USA", "UK", "Poland", "Singapore"];

// Default currency per entity — auto-filled when Entity changes; the user
// can still override Currency manually afterwards.
export const CURRENCY_BY_ENTITY = {
  USA: "USD",
  UK: "GBP",
  Poland: "PLN",
  Singapore: "USD",
};

export const CURRENCY_OPTIONS = ["USD", "GBP", "PLN"];

export const WORK_ORDER_OPTIONS = ["Yes", "No"];

// What the invoice being requested is for.
export const INVOICE_TYPE_OPTIONS = ["Advance", "Milestone"];

export const INITIAL_FORM_STATE = {
  pfId: "",
  accountName: "",
  clientName: "",
  invoiceDescription: "",
  contactPersonName: "",
  clientMailTo: "",
  clientMailCc: "",
  intCcMailId: "",
  workOrder: "",
  masterProjectId: "",
  currency: "",
  projectValue: "",
  invoiceValue: "",
  invoiceType: "",
  entity: "",
};

// Fields that are allowed to be left blank. Master Project ID is commonly
// not filled in. Client Email Cc is treated as optional (CC recipients
// aren't always needed) — flag if it should actually be required.
// Project Value and Invoice Value are both mandatory now (Invoice Value
// must additionally be a subset of Project Value — see validators.js).
export const OPTIONAL_FIELDS = new Set(["masterProjectId", "clientMailCc"]);
