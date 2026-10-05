import { CONFIG, getActiveNetwork } from './config.mjs';
import { TermixApiClient } from './api.mjs';
import { evaluateRequest } from './evaluator.mjs';
import { Storage } from './storage.mjs';
import { startDashboard } from './dashboard.mjs';
import { AutoDeliveryWorker } from './worker.mjs';

let latestState = {
  recentMatches: [],
  networkStats: null,
  lastScanAt: null,
};


function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    mode: 'scan',
    dryRun: false,
    minBudget: CONFIG.minBudgetUsd,
  };

  for (const arg of args) {
    if (arg.startsWith('--mode=')) {
      options.mode = arg.split('=')[1];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--min-budget=')) {
      options.minBudget = parseFloat(arg.split('=')[1]);
      CONFIG.minBudgetUsd = options.minBudget;
    } else if (arg.startsWith('--chain=')) {
      CONFIG.chain = arg.split('=')[1];
    }
  }

  return options;
}

async function runScan(client, options) {
  const net = getActiveNetwork();
  console.log(`\n======================================================`);
  console.log(`🚀 TermiX Proactive Bidding Radar [Scan Mode]`);
  console.log(`📡 Network: ${net.name} (Chain ID: ${net.chainId})`);
  console.log(`🎯 Min Budget Filter: ${CONFIG.minBudgetUsd} ${net.currency}`);
  console.log(`======================================================\n`);

  try {
    const stats = await client.fetchNetworkStats();
    console.log(`📊 Network Stats: Total Vol: $${stats.totalVolumeUsd} | Jobs: ${stats.jobsCount} | Open for offers: ${stats.openForOffers}\n`);
  } catch (e) {
    console.log(`(Network stats unavailable: ${e.message})\n`);
  }

  console.log(`🔍 Scanning live open requests from TermiX...`);
  const items = await client.fetchDiscoverOrders(40);
  console.log(`Found ${items.length} live requests in feed.\n`);

  const matched = [];

  for (const item of items) {
    const evaluation = evaluateRequest(item);
    if (evaluation.eligible) {
      matched.push({ item, evaluation });
    }
  }

  console.log(`🎯 Filtered Matches: Found ${matched.length} high-value opportunities matching our skillset!\n`);

  let totalOpportunityUsd = 0;

  matched.forEach(({ item, evaluation }, index) => {
    const isAlreadyQuoted = Storage.hasBid(item.id);
    const profitEst = parseFloat(evaluation.proposedPrice);
    totalOpportunityUsd += profitEst;

    console.log(`------------------------------------------------------`);
    console.log(`[#${index + 1}] 🏷️ ${item.title}`);
    console.log(`💰 Max Budget: ${evaluation.budget} ${evaluation.currency} | 🎯 Proposed Bid: ${evaluation.proposedPrice} ${evaluation.currency}`);
    console.log(`🛠️ Target Skill: ${evaluation.matchedSkill} (Score: ${evaluation.score}/100)`);
    console.log(`📌 Tags: ${(item.tags || []).join(', ') || 'N/A'}`);
    console.log(`👤 Buyer: ${item.buyer?.displayName || item.buyer?.handle || 'Anonymous'}`);
    console.log(`⚡ Existing Quotes: ${item.quoteCount || 0} | Status: ${item.status}`);
    console.log(`📝 Pitch: "${evaluation.proposal.message}"`);
    console.log(`📦 Deliverable: ${evaluation.proposal.scope}`);
    console.log(`Status in Storage: ${isAlreadyQuoted ? '✅ ALREADY QUOTED' : '⏳ READY TO BID'}`);
  });

  console.log(`\n======================================================`);
  console.log(`📈 Summary:`);
  console.log(`• Total Matching Jobs: ${matched.length}`);
  console.log(`• Total Potential Revenue: $${totalOpportunityUsd.toFixed(2)} USDC`);
  console.log(`======================================================\n`);

  return matched;
}

async function runWatch(client, options) {
  const net = getActiveNetwork();
  console.log(`\n======================================================`);
  console.log(`🤖 TermiX Autonomous Bidder Daemon [Watch Mode]`);
  console.log(`📡 Network: ${net.name} | Interval: ${CONFIG.pollIntervalSec}s`);
  console.log(`🛡️ Dry-Run Mode: ${options.dryRun ? 'ENABLED (Simulation Only)' : 'LIVE (Will submit bids if auth present)'}`);
  console.log(`======================================================\n`);

  // Start live dashboard
  const port = parseInt(process.env.PORT || '3000', 10);
  startDashboard(port, client, () => latestState);

  // Start autonomous order fulfillment worker
  const worker = new AutoDeliveryWorker(client);
  worker.start(CONFIG.pollIntervalSec);

  async function cycle() {
    try {
      try {
        latestState.networkStats = await client.fetchNetworkStats();
      } catch (err) {}

      const items = await client.fetchDiscoverOrders(40);
      const matches = [];

      for (const item of items) {
        const evaluation = evaluateRequest(item);
        if (evaluation.eligible) {
          matches.push({ item, evaluation });
        }

        if (Storage.hasBid(item.id)) {
          continue;
        }

        if (!evaluation.eligible) {
          continue;
        }

        console.log(`\n🔔 [NEW OPPORTUNITY DETECTED] at ${new Date().toLocaleTimeString()}`);
        console.log(`Title: ${item.title}`);
        console.log(`Budget: ${evaluation.budget} ${evaluation.currency} -> Proposed: ${evaluation.proposedPrice}`);
        console.log(`Skill: ${evaluation.matchedSkill}`);

        if (options.dryRun || (!CONFIG.sessionToken && !CONFIG.walletKey) || !CONFIG.providerAgentId) {
          console.log(`[SIMULATION] Bid recorded in storage (no transaction sent).`);
          Storage.recordBid(item.id, {
            title: item.title,
            proposedPrice: evaluation.proposedPrice,
            currency: evaluation.currency,
            skill: evaluation.matchedSkill,
            simulated: true,
          });
        } else {
          console.log(`🚀 Submitting live offer...`);
          try {
            const res = await client.submitOffer(
              item.id,
              evaluation.proposal,
              null, // uses auto-managed session token from AuthService
              CONFIG.providerAgentId
            );
            console.log(`✅ Offer submitted successfully! Offer ID: ${res.id}`);
            Storage.recordBid(item.id, {
              title: item.title,
              proposedPrice: evaluation.proposedPrice,
              currency: evaluation.currency,
              skill: evaluation.matchedSkill,
              offerId: res.id,
              simulated: false,
            });
          } catch (bidErr) {
            console.error(`❌ Failed to submit bid:`, bidErr.message);
            if (bidErr.message.includes('409') || bidErr.message.includes('CONFLICT')) {
              Storage.recordBid(item.id, {
                title: item.title,
                proposedPrice: evaluation.proposedPrice,
                currency: evaluation.currency,
                skill: evaluation.matchedSkill,
                simulated: false,
                status: 'ALREADY_QUOTED',
              });
            }
          }
        }
      }

      latestState.recentMatches = matches;
      latestState.lastScanAt = new Date().toISOString();
    } catch (err) {
      console.error(`[Error in watch cycle]:`, err.message);
      throw err;
    }
  }

  let consecutiveErrors = 0;
  async function runLoop() {
    try {
      await cycle();
      consecutiveErrors = 0;
      setTimeout(runLoop, CONFIG.pollIntervalSec * 1000);
    } catch (err) {
      consecutiveErrors++;
      const backoffSec = Math.min(120, Math.max(15, CONFIG.pollIntervalSec * Math.min(consecutiveErrors * 2, 8)));
      console.warn(`⏳ Network pause: Retrying watch cycle in ${backoffSec}s (error count: ${consecutiveErrors})...`);
      setTimeout(runLoop, backoffSec * 1000);
    }
  }

  runLoop();
}

async function main() {
  const options = parseArgs();
  const client = new TermixApiClient();

  if (options.mode === 'watch') {
    await runWatch(client, options);
  } else {
    await runScan(client, options);
  }
}

main().catch(err => {
  console.error(`Fatal error:`, err);
  process.exit(1);
});
