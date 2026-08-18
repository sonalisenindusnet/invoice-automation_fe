// Currency conversion matrix.
//
// CONVERSION_RATES[from][to] = how many units of `to` equal 1 unit of
// `from`. e.g. CONVERSION_RATES.GBP.USD = 1.27 means 1 GBP = 1.27 USD.
//
// This is the single place to update conversion ratios — everything that
// needs a conversion (the Invoice % of Project Value calculation, and the
// Invoice Value vs. Project Value validation, since Project Value is
// always USD while Invoice Value can be in any of CURRENCY_OPTIONS) reads
// from this file via getConversionRate()/convertCurrency() below, so
// updating a rate here is the only change needed — nothing else in the
// app needs to be touched.
//
// Kept as a full matrix (not just a "→ USD" list) so it's ready to support
// a conversion between any two of the listed currencies later, even though
// today only the "→ USD" column is actually used.
//
// NOTE: these are placeholder rates — replace with your actual/live rates.
// Keep each currency's self-rate at 1, and try to keep reciprocal pairs
// roughly consistent (e.g. GBP→USD and USD→GBP should be inverses of each
// other) to avoid the percentage calculation looking inconsistent.
export const CONVERSION_RATES = {
  USD: { USD: 1, GBP: 0.79, PLN: 3.95 },
  GBP: { USD: 1.27, GBP: 1, PLN: 5.01 },
  PLN: { USD: 0.25, GBP: 0.2, PLN: 1 },
};

export function getConversionRate(fromCurrency, toCurrency) {
  if (!fromCurrency || !toCurrency) return null;
  return CONVERSION_RATES[fromCurrency]?.[toCurrency] ?? null;
}

// Returns the converted amount, or null if either currency is unknown or
// amount isn't a valid number.
export function convertCurrency(amount, fromCurrency, toCurrency) {
  const num = Number(amount);
  if (Number.isNaN(num)) return null;
  const rate = getConversionRate(fromCurrency, toCurrency);
  if (rate == null) return null;
  return num * rate;
}
