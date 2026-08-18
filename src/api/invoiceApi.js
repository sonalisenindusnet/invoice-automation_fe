// Save-invoice API integration.
//
// Wired up to the real "save invoice request" endpoint. Set
// REACT_APP_SAVE_INVOICE_API_URL in your .env if the URL ever needs to
// change (e.g. a different host/port per environment) instead of editing
// this file.

const SAVE_INVOICE_API_URL =
  process.env.REACT_APP_SAVE_INVOICE_API_URL || 'http://localhost:5000/invoice/api/v1/invoice-generation';

export async function submitInvoiceRequest(payload) {
  let response;
  try {
    response = await fetch(SAVE_INVOICE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
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
