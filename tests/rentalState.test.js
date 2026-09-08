const { test } = require('node:test');
const assert = require('node:assert/strict');
const { rentalState, blocksListing, dateValue } = require('../utils/rentalState');
const now = new Date('2026-09-08T12:00:00Z');
const agreement = (overrides = {}, dates = {}) => ({ agreementStatus: 'pending', ownerConfirmed: true, renterConfirmed: true,
  agreementDetailsId: { aggrementDetail: { startDate: '2026-09-01', endDate: '2026-09-30', ...dates } }, ...overrides });
for (const [label, data, state, blocks] of [
  ['unconfirmed agreement reserves item', agreement({ renterConfirmed: false }), 'pending', true],
  ['owner must also confirm', agreement({ ownerConfirmed: false }), 'pending', true],
  ['both confirmations mean rented within dates', agreement(), 'rented', true],
  ['future confirmation remains upcoming', agreement({}, { startDate: '2026-10-01', endDate: '2026-10-30' }), 'upcoming', true],
  ['expired active agreement releases listing without cron', agreement({ agreementStatus: 'active' }, { endDate: '2026-09-07' }), 'completed', false],
  ['expired pending agreement releases listing', agreement({ renterConfirmed: false }, { endDate: '2026-09-07' }), 'completed', false],
  ['end date includes the whole day', agreement({}, { endDate: '2026-09-08' }), 'rented', true],
  ['rejected agreement does not block', agreement({ agreementStatus: 'rejected' }), 'rejected', false],
  ['inactive agreement does not block', agreement({ agreementStatus: 'Inactive' }), 'completed', false],
  ['legacy missing dates remain reserved conservatively', { agreementStatus: 'pending' }, 'pending', true],
]) test(label, () => { assert.equal(rentalState(data, now), state); assert.equal(blocksListing(data, now), blocks); });
test('invalid dates do not crash and exact timestamps preserve their time', () => {
  assert.equal(dateValue('invalid'), null);
  assert.equal(dateValue(null), null);
  assert.equal(dateValue('2026-09-08T06:00:00Z', true).toISOString(), '2026-09-08T06:00:00.000Z');
});
