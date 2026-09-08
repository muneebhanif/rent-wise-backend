// Date-only agreement end dates include the entire day (UTC).
function dateValue(value, endOfDay = false) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(String(value))) date.setUTCHours(23, 59, 59, 999);
  return date;
}
function rentalState(agreement, now = new Date()) {
  const status = String(agreement.agreementStatus || '').toLowerCase();
  if (status === 'rejected') return 'rejected';
  if (status === 'inactive') return 'completed';
  const details = agreement.agreementDetailsId?.aggrementDetail || agreement.aggrementDetail || {};
  const end = dateValue(details.endDate, true);
  if (end && end < now) return 'completed';
  if (!agreement.ownerConfirmed || !agreement.renterConfirmed) return 'pending';
  const start = dateValue(details.startDate);
  return start && start > now ? 'upcoming' : 'rented';
}
const blocksListing = (agreement, now) => ['pending', 'upcoming', 'rented'].includes(rentalState(agreement, now));
const serializeAgreement = (agreement) => {
  const data = agreement.toObject ? agreement.toObject() : agreement;
  return { ...data, rentalState: rentalState(data) };
};
module.exports = { dateValue, rentalState, blocksListing, serializeAgreement };
