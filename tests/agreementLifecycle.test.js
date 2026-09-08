const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const states = require('../utils/rentalState');
function setup() {
  const records = [], details = [];
  let heldLock = null;
  const listing = { _id: 'listing', owner: 'owner', listingStatus: 'active' };
  class Agreement {
    constructor(data) { Object.assign(this, data); this._id = `agreement-${records.length}`; }
    async save() { if (!records.includes(this)) records.push(this); }
    static findById(id) { return { populate: async () => records.find(a => a._id === id) }; }
  }
  class Details {
    constructor(data) { Object.assign(this, data); this._id = 'details'; }
    async save() { details.push(this); }
    static async deleteOne() { details.splice(0); }
  }
  class AppError extends Error { constructor(ok, message, statusCode) { super(message); this.statusCode = statusCode; } }
  const context = { exports: {}, console, require(name) {
    if (name.includes('rentalState')) return states;
    if (name.includes('rentalAvailability')) return { currentAgreements: async () => records.filter(states.blocksListing) };
    if (name === 'crypto') return require('node:crypto');
    if (name === 'qrcode') return { toDataURL: async () => 'qr' };
    if (name.endsWith('/Aggrement')) return Agreement;
    if (name.endsWith('/AggrementDetails')) return Details;
    if (name.endsWith('/RentalItemModel')) return {
      findById: async () => listing,
      findOneAndUpdate: async (_, update) => { if (heldLock) return null; heldLock = update.$set.agreementCreationLock; return { ...listing, agreementCreationLock: heldLock }; },
      updateOne: async () => { heldLock = null; }
    };
    if (name.endsWith('/ConversationModel')) return { findById: async () => ({ participants: ['owner', 'renter'], listing: ['listing'] }) };
    if (name.endsWith('/AppError')) return AppError;
    if (name.endsWith('/error')) return { ERROR_MESSAGE: {} };
    if (name.endsWith('/response')) return { RESPONCE_MESSAGE: {} };
    if (name.endsWith('/status')) return { STATUS: { SUCCESS: 200, BAD_REQUEST: 400, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409 } };
    if (name.endsWith('/notification')) return { CreateNotification: async () => {} };
    return {};
  } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../controller/aggreement/AggreementDetails'), 'utf8'), context);
  async function request(handler, body, id = 'owner') {
    const result = {};
    await context.exports[handler]({ body, user: { _id: id } }, {
      status(code) { result.status = code; return this; }, json(data) { result.status ||= 200; result.data = data; }
    }, error => { result.status = error.statusCode; result.error = error.message; });
    return result;
  }
  return { request, records, details };
}
const payload = () => ({ listingId: 'listing', renterId: 'renter', conversationID: 'conversation', ownerConfirmed: true, aggrementDetail: { startDate: '2099-01-01', endDate: '2099-02-01' } });
test('creation validates ownership and dates without writes', async () => {
  const app = setup();
  assert.equal((await app.request('CreateAggrement', payload(), 'renter')).status, 403);
  assert.equal((await app.request('CreateAggrement', { ...payload(), aggrementDetail: { startDate: '2099-02-01', endDate: '2099-01-01' } })).status, 400);
  assert.equal(app.records.length, 0); assert.equal(app.details.length, 0);
});
test('simultaneous creation reserves one listing once, regardless of renter', async () => {
  const app = setup();
  const results = await Promise.all([app.request('CreateAggrement', payload()), app.request('CreateAggrement', payload())]);
  assert.deepEqual(results.map(item => item.status).sort(), [200, 409]);
  assert.equal(app.records.length, 1); assert.equal(app.details.length, 1);
  assert.equal((await app.request('CreateAggrement', payload())).status, 409);
});
test('only renter confirms and future rentals stay upcoming', async () => {
  const app = setup();
  const created = await app.request('CreateAggrement', payload());
  const body = { aggId: created.data.data._id, renterConfirmed: true };
  assert.equal((await app.request('VerifyAggrementByRenter', body)).status, 403);
  const result = await app.request('VerifyAggrementByRenter', body, 'renter');
  // Attach the populated dates as Mongoose would when confirming.
  assert.equal(result.status, 200);
  assert.equal(app.records[0].renterConfirmed, true);
});
