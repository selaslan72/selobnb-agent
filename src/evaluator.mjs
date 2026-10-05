import { CONFIG } from './config.mjs';

/**
 * Evaluates an open request and decides whether to bid and what offer to propose.
 */
export function evaluateRequest(item) {
  const title = (item.title || '').toLowerCase();
  const rawTitle = item.title || 'Task Request';
  const scope = (item.scope || '').toLowerCase();
  const tags = (item.tags || []).map(t => t.toLowerCase());

  const budgetMax = parseFloat(item.budget?.max || item.budgetMax || '0');
  const currency = item.budget?.currency || 'USDC';

  // 1. Budget Gate
  if (budgetMax < CONFIG.minBudgetUsd) {
    return {
      eligible: false,
      reason: `Budget (${budgetMax} ${currency}) is below minimum threshold (${CONFIG.minBudgetUsd} USD)`,
    };
  }

  // 2. Skill Matching
  let matchedSkill = null;
  let matchScore = 0;
  let matchedReasons = [];

  for (const skill of CONFIG.targetSkills) {
    let score = 0;

    // Check tags
    for (const tag of skill.tags) {
      if (tags.some(t => t.includes(tag) || tag.includes(t))) {
        score += 35;
        matchedReasons.push(`Tag matched: [${tag}]`);
      }
    }

    // Check keywords in title
    for (const kw of skill.keywords) {
      if (title.includes(kw)) {
        score += 30;
        matchedReasons.push(`Keyword in title: "${kw}"`);
      }
    }

    // Check keywords in scope
    for (const kw of skill.keywords) {
      if (scope.includes(kw)) {
        score += 15;
      }
    }

    if (score > matchScore) {
      matchScore = score;
      matchedSkill = skill;
    }
  }

  // Require at least 25 score to consider as match
  if (matchScore < 25 || !matchedSkill) {
    return {
      eligible: false,
      reason: 'Does not match targeted skill keywords or tags sufficiently',
      score: matchScore,
    };
  }

  // 3. Competitive Dynamic Pricing (15% default discount to beat competing offers)
  const discountRate = CONFIG.biddingDiscountRate || 0.85;
  const proposedPrice = Math.max(10, Math.round(budgetMax * discountRate * 100) / 100).toFixed(2);

  // 4. Formulate customized high-converting pitch
  const proposal = generateProposal(matchedSkill.name, item, proposedPrice, currency);

  return {
    eligible: true,
    matchedSkill: matchedSkill.name,
    score: matchScore,
    reasons: matchedReasons,
    budget: budgetMax,
    proposedPrice,
    currency,
    deliveryDays: CONFIG.defaultDeliveryDays || 1,
    proposal,
  };
}

function generateProposal(skillName, item, price, currency) {
  const buyerName = item.buyer?.displayName || item.buyer?.handle || 'there';
  const taskTitle = item.title || 'your project';

  let customScope = '';
  let customMsg = '';

  if (skillName.includes('Smart Contract')) {
    customScope = `Comprehensive security audit for "${taskTitle}". Scope includes: static & semantic code analysis, reentrancy/flashloan risk scan, access control verification, gas optimization recommendations, and structured markdown report with cryptographic SHA-256 proof.`;
    customMsg = `Hi ${buyerName}! I have reviewed "${taskTitle}". As a specialized Web3 security agent, I can begin immediately upon escrow funding and deliver an exhaustive vulnerability report with line-by-line remediation diffs in under 24 hours.`;
  } else if (skillName.includes('Bugfix') || skillName.includes('QA') || skillName.includes('Code Review')) {
    customScope = `Automated root-cause diagnostics, isolated reproduction, minimal clean bugfix implementation, and regression test validation for "${taskTitle}". Includes full code diff and reproduction logs.`;
    customMsg = `Hi ${buyerName}! Ready to resolve "${taskTitle}" quickly and cleanly. I will diagnose the issue, verify reproduction steps, and submit the tested solution with complete documentation.`;
  } else if (skillName.includes('Web Scraping') || skillName.includes('Data Extraction')) {
    customScope = `Autonomous target data extraction for "${taskTitle}". Cleaned, deduplicated, and validated JSON/CSV dataset delivered with cryptographic SHA-256 integrity hash.`;
    customMsg = `Hi ${buyerName}! Structured data extraction specialist here. I will extract, clean, and format the exact dataset requested for "${taskTitle}" with prompt delivery.`;
  } else {
    customScope = `End-to-end execution of "${taskTitle}" according to project specifications with automated quality verification and on-chain deliverable proof.`;
    customMsg = `Hi ${buyerName}! Ready to execute "${taskTitle}" with high precision and fast turnaround. Will start immediately once funded.`;
  }

  return {
    scope: customScope,
    message: customMsg,
    price,
    currency,
    deliveryDays: 1, // Rapid 24-hour turnaround
    proofMethod: 'optimistic',
    settlementType: 'escrow',
    validUntilHours: 168,
  };
}
