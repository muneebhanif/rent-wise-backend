const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const state = require('../utils/rentalState');
function service(agreements) {
  const context = { module: { exports: {} }, require(name) {
    if (name.includes('rentalState')) return state;
    return { find(query) { return { populate() { return { async lean() { return agreements.filter(a => !query.listingId || query.listingId.$in.includes(a.listingId)); } }; } }; } };
  } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../services/rentalAvailability'), 'utf8'), context);
  return context.module.exports;
}
const agreements = [
  { listingId: 'pending', ownerConfirmed: true, renterConfirmed: false },
  { listingId: 'rented', ownerConfirmed: true, renterConfirmed: true },
  { listingId: 'expired', ownerConfirmed: true, renterConfirmed: true, agreementDetailsId: { aggrementDetail: { endDate: '2000-01-01' } } },
];
test('public queries keep rented listings visible and retain category and active filters', async () => {
  const filter = await service(agreements).publicListingFilter({ category: 'car' });
  assert.equal(filter.category, 'car'); assert.equal(filter.listingStatus, 'active');
  assert.equal(filter._id, undefined);
});
test('owners retain all listings with accurate status including manual rented and unpublished', async () => {
  const listings = ['pending', 'rented', 'expired', 'available'].map(_id => ({ _id, listingStatus: 'active' }));
  listings.push({ _id: 'manual', listingStatus: 'Rented' }, { _id: 'hidden', listingStatus: 'Inactive' });
  const result = await service(agreements).annotateListings(listings);
  assert.deepEqual(Array.from(result, item => item.rentalState), ['pending', 'rented', 'available', 'available', 'rented', 'unpublished']);
  assert.equal(result.length, listings.length);
});
