export function offerStatus(bid) {
  if (bid.simulated === true) return 'SIMULATED';
  if (bid.status === 'ALREADY_QUOTED') return 'ALREADY_QUOTED';
  if (typeof bid.offerId === 'string' && bid.offerId.trim()) return 'SUBMITTED';
  return 'UNVERIFIED';
}

export function summarizeOffers(bids) {
  const counts = { SUBMITTED: 0, ALREADY_QUOTED: 0, SIMULATED: 0, UNVERIFIED: 0 };
  const allBids = Object.entries(bids).map(([orderId, bid]) => ({ ...bid, orderId, recordStatus: offerStatus(bid) }));
  for (const bid of allBids) counts[bid.recordStatus]++;
  return { counts, allBids, liveOffers: allBids.filter(b => b.recordStatus === 'SUBMITTED') };
}
