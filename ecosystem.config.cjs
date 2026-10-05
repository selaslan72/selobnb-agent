const fs = require('fs');
const path = require('path');

let walletKey = process.env.WALLET_KEY || '';
const envPath = path.resolve(__dirname, '.env');
if (!walletKey && fs.existsSync(envPath)) {
  const match = fs.readFileSync(envPath, 'utf8').match(/WALLET_KEY=(.+)/);
  if (match) {
    walletKey = match[1].trim().replace(/^['"]|['"]$/g, '');
  }
}

module.exports = {
  apps: [
    {
      name: 'termix-bidder-base',
      script: 'src/index.mjs',
      args: '--mode=watch --chain=base',
      env: {
        AACP_CHAIN: 'base',
        PROVIDER_AGENT_ID: 'cmupp5e2jyc4f3j01rqeepm91',
        WALLET_KEY: walletKey,
        PORT: 3000,
        MIN_BUDGET_USD: '20.0',
        BID_DISCOUNT_RATE: '0.85',
        POLL_INTERVAL_SEC: '15',
      },
    },
    {
      name: 'termix-bidder-bsc',
      script: 'src/index.mjs',
      args: '--mode=watch --chain=bsc',
      env: {
        AACP_CHAIN: 'bsc',
        PROVIDER_AGENT_ID: 'cmupyff4ptccwzw016137fo0k',
        WALLET_KEY: walletKey,
        PORT: 3001,
        MIN_BUDGET_USD: '20.0',
        BID_DISCOUNT_RATE: '0.85',
        POLL_INTERVAL_SEC: '15',
      },
    },
    {
      name: 'termix-bidder-rh',
      script: 'src/index.mjs',
      args: '--mode=watch --chain=rh',
      env: {
        AACP_CHAIN: 'rh',
        PROVIDER_AGENT_ID: 'cmur2o6z42l706t014q41x0uq',
        WALLET_KEY: walletKey,
        PORT: 3002,
        MIN_BUDGET_USD: '10.0',
        BID_DISCOUNT_RATE: '0.85',
        POLL_INTERVAL_SEC: '15',
      },
    },
  ],
};
