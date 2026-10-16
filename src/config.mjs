import fs from 'node:fs';
import path from 'node:path';

/**
 * TermiX AACP Configuration & Network Endpoints
 */

export const NETWORKS = {
  bsc: {
    chainId: 56,
    name: 'BNB Chain',
    apiBase: 'https://platform-backend.prod.termix.live',
    rpcUrl: 'https://bsc-rpc.publicnode.com',
    explorer: 'https://bscscan.com',
    currency: 'USDC',
    decimals: 18,
  },
  base: {
    chainId: 8453,
    name: 'Base',
    apiBase: 'https://platform-backend-base.prod.termix.live',
    rpcUrl: 'https://base-rpc.publicnode.com',
    explorer: 'https://basescan.org',
    currency: 'USDC',
    decimals: 6,
  },
  rh: {
    chainId: 4663,
    name: 'Robinhood',
    apiBase: 'https://platform-backend-rh.prod.termix.live',
    rpcUrl: 'https://rpc.mainnet.chain.robinhood.com',
    explorer: 'https://explorer.mainnet.chain.robinhood.com',
    currency: 'USDC',
    decimals: 6,
  },
};

function loadEnvKey() {
  if (process.env.WALLET_KEY) return process.env.WALLET_KEY;
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const match = fs.readFileSync(envPath, 'utf8').match(/WALLET_KEY=(.+)/);
      if (match) return match[1].trim().replace(/^['"]|['"]$/g, '');
    }
  } catch {}
  return '';
}

export const CONFIG = {
  // Chain: 'bsc', 'base', or 'rh'
  chain: process.env.AACP_CHAIN || 'bsc',

  // Target criteria for bidding
  minBudgetUsd: parseFloat(process.env.MIN_BUDGET_USD || '20.0'),
  biddingDiscountRate: parseFloat(process.env.BID_DISCOUNT_RATE || '0.85'), // Bid at 85% of max budget (15% competitive discount)
  defaultDeliveryDays: 2,
  maxOffersPerCycle: Math.max(1, parseInt(process.env.MAX_OFFERS_PER_CYCLE || '3', 10) || 3),

  // Polling intervals in seconds
  pollIntervalSec: parseInt(process.env.POLL_INTERVAL_SEC || '20', 10),

  // Only the limited screening service is implemented.
  agentName: process.env.AGENT_NAME || ({ bsc: 'selobnb.agent', base: 'selo.agent', rh: 'selo.agent' }[process.env.AACP_CHAIN || 'bsc']),
  agentTokenId: process.env.AGENT_TOKEN_ID || '',

  // Operator credentials
  walletKey: loadEnvKey(),
  providerAgentId: process.env.PROVIDER_AGENT_ID || '',
  sessionToken: process.env.AACP_SESSION_TOKEN || process.env.SESSION_TOKEN || '',
};

export function getActiveNetwork() {
  const net = NETWORKS[CONFIG.chain];
  if (!net) {
    throw new Error(`Unsupported chain: ${CONFIG.chain}. Must be 'bsc', 'base', or 'rh'.`);
  }
  return net;
}
