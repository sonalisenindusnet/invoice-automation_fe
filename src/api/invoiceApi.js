// Save-invoice API integration.
//
// Wired up to the real "save invoice request" endpoint. Set
// REACT_APP_SAVE_INVOICE_API_URL in your .env if the URL ever needs to
// change (e.g. a different host/port per environment) instead of editing
// this file.

const SAVE_INVOICE_API_URL =
  process.env.REACT_APP_SAVE_INVOICE_API_URL || 'http://localhost:5000/invoice/api/v1/invoice-generation';

// File-upload (evidence) support is commented out for now — see the
// "No Work Order" section in InvoiceRequestForm.js, which now just shows an
// informational message instead of collecting a file. Kept here, inactive,
// in case evidence upload comes back later.
//
// Previously: `file` was optional — the evidence screenshot/email attached
// when Work Order is "No". When present, the request was sent as
// multipart/form-data (every payload field appended alongside the file
// under the "evidence" key) instead of plain JSON, since a file can't be
// embedded in a JSON body. The browser sets the multipart Content-Type +
// boundary itself, so that header must NOT be set manually in that branch.
export async function submitInvoiceRequest(payload /*, file */) {
  let response;
  try {
    // if (file) {
    //   const body = new FormData();
    //   Object.entries(payload).forEach(([key, value]) => {
    //     body.append(key, value ?? '');
    //   });
    //   body.append('evidence', file, file.name);
    //
    //   response = await fetch(SAVE_INVOICE_API_URL, {
    //     method: 'POST',
    //     body,
    //   });
    // } else {
    response = await fetch(SAVE_INVOICE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    // }
  } catch (networkError) {
    // fetch() throws a plain "Failed to fetch" here for anything that
    // happens BEFORE an HTTP response comes back at all — the API isn't
    // running/reachable, a wrong host/port, or (most commonly in local dev)
    // the browser blocking the request because the API doesn't send back
    // CORS headers allowing this app's origin. It is NOT specific to POST —
    // a GET would fail the exact same way. A real HTTP error (404/500 etc.)
    // never lands here; that's handled below via response.ok instead.
    // eslint-disable-next-line no-console
    console.error('[submitInvoiceRequest] network/CORS failure calling', SAVE_INVOICE_API_URL, networkError);
    throw new Error(
      `Could not reach ${SAVE_INVOICE_API_URL}. Make sure the API is running and that it allows requests from this app's origin (CORS) — see the browser console for the underlying error.`
    );
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null; // body was empty or not JSON — fall back to status alone
  }

  if (!response.ok) {
    const message = data?.message || `Save failed (${response.status}).`;
    throw new Error(message);
  }

  // A 2xx response counts as success even if the API's body doesn't
  // include an explicit `success` field.
  return { success: data?.success !== false, message: data?.message, data };
}
