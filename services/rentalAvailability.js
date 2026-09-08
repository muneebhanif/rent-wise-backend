const Agreement = require('../model/agreements/Aggrement');
const { blocksListing, rentalState } = require('../utils/rentalState');

async function currentAgreements(listingIds) {
  const query = { agreementStatus: { $nin: ['Inactive', 'rejected'] } };
  if (listingIds) query.listingId = { $in: listingIds };
  const agreements = await Agreement.find(query).populate('agreementDetailsId').lean();
  return agreements.filter(agreement => blocksListing(agreement));
}
async function publicListingFilter(extra = {}) {
  const agreements = await currentAgreements();
  return { ...extra, listingStatus: 'active', _id: { $nin: agreements.map(item => item.listingId) } };
}
async function annotateListings(listings) {
  const agreements = await currentAgreements(listings.map(item => item._id));
  const priority = { rented: 3, upcoming: 2, pending: 1 };
  return listings.map(listing => {
    const data = listing.toObject ? listing.toObject() : listing;
    const current = agreements.filter(item => String(item.listingId) === String(data._id))
      .sort((a, b) => priority[rentalState(b)] - priority[rentalState(a)])[0];
    return { ...data, rentalState: current ? rentalState(current)
      : data.listingStatus === 'Rented' ? 'rented'
      : data.listingStatus === 'active' ? 'available' : 'unpublished' };
  });
}
module.exports = { currentAgreements, publicListingFilter, annotateListings };
