import { CONFIG } from './config.mjs';

export const SCREENING_SCOPE = 'Automated Solidity source pre-screening using text-pattern checks. Markdown findings and suggested next checks only. No full audit, formal verification, exploit proof, PDF, code fixes, or security certification. SHA-256 identifies report bytes only.';

export function extractSoliditySource(order) {
  // Explicit source fields only: a job brief is never contract source.
  const source = order.sourceCode || order.soliditySource || order.input?.sourceCode || '';
  if (typeof source !== 'string' || source.length > 200000) return null;
  if (!/pragma\s+solidity\b/.test(source) || !/\b(contract|library|interface)\s+[A-Za-z_$][\w$]*/.test(source)) return null;
  return source;
}

export function evaluateRequest(item) {
  const reject = reason => ({ eligible: false, reason });
  const text = [item.title, item.scope, item.description].filter(v => typeof v === 'string').join(' ').toLowerCase();
  const budget = Number(item.budget?.max ?? item.budgetMax);
  const currency = String(item.budget?.currency || item.currency || '').toUpperCase();
  if (!['USDC', 'USDT'].includes(currency)) return reject('Only explicitly denominated stablecoin budgets are supported');
  if (!Number.isFinite(budget) || budget < CONFIG.minBudgetUsd) return reject('Missing, invalid or below-minimum budget');
  if (!/\bsolidity\b|\bbep[- ]?20\b|\berc[- ]?20\b/.test(text)) return reject('Not a Solidity source screening request');
  if (!/\b(pre[- ]?screen(?:ing)?|preliminary (?:scan|review)|pattern[- ](?:based )?(?:scan|check)|basic static (?:scan|check))\b/.test(text)) return reject('Buyer must explicitly request limited source pre-screening');
  if (/\b(full|comprehensive|exhaustive|production[- ]ready)\s+(security\s+)?audit\b|\b(formal verification|flash.?loan|exploit|penetration|bug.?fix|code diffs?|pdf|deploy|mint|kyc|quest|revoke|bridge|wallet transfer)\b/.test(text)) return reject('Requested deliverable exceeds the implemented screening service');
  if (item.status && !['OPEN', 'PUBLISHED', 'QUOTED'].includes(item.status)) return reject('Request is not open for offers');
  const rate = CONFIG.biddingDiscountRate;
  if (!Number.isFinite(rate) || rate <= 0 || rate > 1) return reject('Invalid bid pricing configuration');
  const price = Math.min(budget, Math.max(10, Math.round(budget * rate * 100) / 100)).toFixed(2);
  const title = String(item.title || 'Solidity source pre-screening').slice(0, 180);
  return {
    eligible: true, budget, currency, proposedPrice: price,
    matchedSkill: 'Solidity Source Pre-Screening', score: 100,
    reasons: ['Solidity domain and explicitly limited screening scope'],
    deliveryDays: CONFIG.defaultDeliveryDays,
    proposal: {
      scope: SCREENING_SCOPE,
      message: `For "${title}", I can provide a limited text-pattern pre-screen of Solidity source you supply. The report flags patterns for human review; it does not establish whether a contract is secure. Please supply sourceCode and confirm this scope before work begins.`,
      price, currency, deliveryDays: CONFIG.defaultDeliveryDays,
      proofMethod: 'optimistic', settlementType: 'escrow', validUntilHours: 168,
    },
  };
}
