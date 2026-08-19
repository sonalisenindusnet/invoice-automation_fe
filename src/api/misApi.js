// MIS "project info" lookup — given a PF Id, fetches project details so
// the requester doesn't have to type them all in by hand.
//
// SECURITY NOTE: this calls the MIS API directly from the browser with an
// x-api-key header. Anything set via REACT_APP_* is baked into the built
// JS bundle and visible to anyone using the app (Network tab, view
// source) — it is NOT a secret once shipped, only "not hardcoded in the
// repo". The invoice-automation backend already calls this exact same
// endpoint server-side with the key kept private (see src/mis/mis_api.py
// in that project) — routing this call through your own backend instead
// of hitting MIS directly from here would be the safe way to do this in
// production. Implemented here as a direct call per what was asked;
// swap MIS_API_URL to your own backend's proxy endpoint later and nothing
// else needs to change (the { success, data } / { success, error } return
// shape can stay the same).
const MIS_API_URL = process.env.REACT_APP_MIS_API_URL || 'http://13.235.37.117:8161/api/projectinfo';
const MIS_API_KEY = process.env.REACT_APP_MIS_API_KEY || '';

// Returns { success: true, data } or { success: false, error }. Never
// throws — every failure mode (network/CORS, non-200, malformed body,
// `success: false` in the body) is normalized into the error shape so the
// caller can show one consistent message.
export async function fetchProjectInfo(pfId) {
  let response;
  try {
    response = await fetch(MIS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': MIS_API_KEY,
      },
      body: JSON.stringify({ project_id: pfId }),
    });
  } catch (networkError) {
    // eslint-disable-next-line no-console
    console.error('[fetchProjectInfo] network/CORS failure calling', MIS_API_URL, networkError);
    return { success: false, error: 'Could not reach the project lookup service.' };
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null; // empty or non-JSON body
  }

  if (!response.ok || !body?.success) {
    return { success: false, error: body?.message || `Project lookup failed (${response.status}).` };
  }

  return { success: true, data: body.data || {} };
}
