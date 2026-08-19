// Presentation helpers for rendering an arbitrary MIS API response in the
// read-only "Project Info" panel. Kept generic (not a fixed list of known
// fields) since the response shape is expected to change.

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/;

// "company_location" -> "Company Location"
export function formatMisLabel(key) {
  return key
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatMisValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' && ISO_DATE_RE.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
  }
  return String(value);
}
