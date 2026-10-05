import http from 'node:http';
import { Storage } from './storage.mjs';
import { CONFIG, getActiveNetwork } from './config.mjs';

export function startDashboard(port = 3000, client, getLatestState) {
  const net = getActiveNetwork();

  const server = http.createServer(async (req, res) => {
    try {
      // API endpoint for live json state
      if (req.url === '/api/state') {
        const state = getLatestState ? getLatestState() : {};
        const bids = Storage.getBids();
        
        const bidsList = Object.entries(bids).map(([orderId, data]) => ({
          orderId,
          ...data,
        }));

        const liveOffers = bidsList.filter(b => b.offerId || b.simulated === false);

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({
          network: net,
          config: {
            chain: CONFIG.chain,
            providerAgentId: CONFIG.providerAgentId,
            minBudget: CONFIG.minBudgetUsd,
            pollInterval: CONFIG.pollIntervalSec,
          },
          bidsCount: bidsList.length,
          liveOffersCount: liveOffers.length,
          liveOffers: liveOffers.slice(-30).reverse(),
          allBids: bidsList.slice(-50).reverse(),
          ...state,
        }));
      }

      // HTML Dashboard
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderHtml(net, port));
    } catch (err) {
      console.error('Dashboard error:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error: ' + err.message);
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`🌐 Live Dashboard running at http://0.0.0.0:${port}`);
  });

  return server;
}

function renderHtml(net, port) {
  const currentChain = net.name.toLowerCase().includes('base') ? 'base' : (net.name.toLowerCase().includes('robinhood') ? 'rh' : 'bsc');
  const badgeClass = currentChain === 'base' ? 'base' : (currentChain === 'rh' ? 'rh' : 'bnb');
  const chainPrefix = currentChain === 'base' ? 'base/' : (currentChain === 'rh' ? 'rh/' : 'bsc/');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TermiX Autonomous Agent Operations Panel</title>
  <style>
    :root {
      --bg: #090a0f;
      --card: #12141c;
      --border: #232738;
      --accent: #00ffaa;
      --accent-yellow: #f0b90b;
      --accent-blue: #0052ff;
      --accent-orange: #ff5e3a;
      --accent-green: #00c805;
      --text: #e6edf3;
      --muted: #8b949e;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; }
    body { background: var(--bg); color: var(--text); padding: 24px; min-height: 100vh; }
    .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 20px; border-bottom: 1px solid var(--border); margin-bottom: 24px; }
    .title { display: flex; align-items: center; gap: 12px; font-size: 20px; font-weight: 700; }
    .badge { background: rgba(0, 255, 170, 0.15); color: var(--accent); padding: 4px 10px; border-radius: 99px; font-size: 12px; border: 1px solid rgba(0, 255, 170, 0.3); }
    .badge.live { animation: pulse 2s infinite; }
    .badge.bnb { background: rgba(240, 185, 11, 0.15); color: var(--accent-yellow); border-color: rgba(240, 185, 11, 0.3); }
    .badge.base { background: rgba(0, 82, 255, 0.15); color: #4b89ff; border-color: rgba(0, 82, 255, 0.3); }
    .badge.rh { background: rgba(0, 200, 5, 0.15); color: var(--accent-green); border-color: rgba(0, 200, 5, 0.3); }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    
    .switch-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #191c28;
      color: #fff;
      padding: 6px 14px;
      border-radius: 6px;
      text-decoration: none;
      font-size: 13px;
      border: 1px solid var(--border);
      transition: all 0.2s;
    }
    .switch-btn:hover { background: #222638; border-color: var(--accent); }

    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 28px; }
    .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 18px; }
    .stat-card .label { font-size: 12px; color: var(--muted); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }
    .stat-card .value { font-size: 24px; font-weight: 700; color: #fff; }
    .stat-card .sub { font-size: 12px; color: var(--accent); margin-top: 4px; }
    
    .nav-tabs { display: flex; gap: 12px; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 10px; }
    .tab-btn { background: none; border: none; color: var(--muted); font-size: 14px; font-weight: 600; padding: 8px 16px; cursor: pointer; border-radius: 6px; transition: all 0.2s; }
    .tab-btn.active { background: #1c2130; color: #fff; border: 1px solid var(--border); }
    .tab-btn:hover { color: #fff; }

    .table-container { background: var(--card); border: 1px solid var(--border); border-radius: 8px; overflow-x: auto; margin-bottom: 32px; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    th { background: #181b26; padding: 12px 16px; color: var(--muted); font-weight: 600; border-bottom: 1px solid var(--border); }
    td { padding: 14px 16px; border-bottom: 1px solid var(--border); }
    tr:last-child td { border-bottom: none; }
    tr:hover { background: rgba(255, 255, 255, 0.02); }
    .price-tag { font-weight: 700; color: var(--accent); }
    .tag { display: inline-block; background: #1e2230; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-right: 4px; color: #9aa5b5; }
    .status-pill { padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .status-pill.live { background: rgba(0, 255, 170, 0.2); color: var(--accent); }
    .status-pill.open { background: rgba(255, 94, 58, 0.15); color: var(--accent-orange); }
    .status-pill.won { background: rgba(0, 82, 255, 0.2); color: #5b95ff; }
    .id-code { font-family: monospace; font-size: 11px; color: var(--muted); }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">
      <span>🤖 TermiX Operations Command</span>
      <span class="badge ${badgeClass}">${net.name} Daemon</span>
      <span class="badge live">● 24/7 LIVE</span>
    </div>
    <div style="display: flex; gap: 8px; align-items: center;">
      <a href="http://91.99.209.113:3000" class="switch-btn" style="${currentChain === 'base' ? 'border-color: #3C8AFF; font-weight: bold;' : ''}">🔵 Base (:3000)</a>
      <a href="http://91.99.209.113:3001" class="switch-btn" style="${currentChain === 'bsc' ? 'border-color: #F0B90B; font-weight: bold;' : ''}">🟡 BNB (:3001)</a>
      <a href="http://91.99.209.113:3002" class="switch-btn" style="${currentChain === 'rh' ? 'border-color: #00C805; font-weight: bold;' : ''}">🟢 Robinhood (:3002)</a>
      <span id="last-update" class="tag">Updating...</span>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="label">🚀 Live Official Offers Sent</div>
      <div id="stat-live-offers" class="value" style="color: var(--accent);">0</div>
      <div class="sub">Submitted to TermiX AACP</div>
    </div>
    <div class="stat-card">
      <div class="label">🎯 Pipeline Opportunities</div>
      <div id="stat-bids" class="value">0</div>
      <div class="sub">Identified by local radar</div>
    </div>
    <div class="stat-card">
      <div class="label">Protocol Volume (USDC)</div>
      <div id="stat-volume" class="value">Loading...</div>
      <div class="sub">AACP Total Settlement</div>
    </div>
    <div class="stat-card">
      <div class="label">Network Active Jobs</div>
      <div id="stat-jobs" class="value">Loading...</div>
      <div class="sub">On-Chain Requests</div>
    </div>
  </div>

  <div class="nav-tabs">
    <button class="tab-btn active" onclick="switchTab('offers')">🚀 Gönderilen Canlı Teklifler (Submitted Live Offers)</button>
    <button class="tab-btn" onclick="switchTab('radar')">📡 Canlı Radar & Açık İşler (Marketplace Radar)</button>
  </div>

  <!-- TAB 1: SUBMITTED LIVE OFFERS -->
  <div id="tab-offers" class="table-container">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Task Title</th>
          <th>Proposed Price</th>
          <th>Skill / Service</th>
          <th>Offer ID</th>
          <th>Mode</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody id="offers-body">
        <tr><td colspan="7" style="text-align: center; color: var(--muted); padding: 32px;">Loading live offers...</td></tr>
      </tbody>
    </table>
  </div>

  <!-- TAB 2: RADAR MATCHES -->
  <div id="tab-radar" class="table-container" style="display: none;">
    <table>
      <thead>
        <tr>
          <th>Task Title</th>
          <th>Budget (Max)</th>
          <th>Proposed Bid</th>
          <th>Target Skill</th>
          <th>Tags</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody id="matches-body">
        <tr><td colspan="6" style="text-align: center; color: var(--muted); padding: 32px;">Scanning live requests...</td></tr>
      </tbody>
    </table>
  </div>

  <script>
    let currentTab = 'offers';

    function switchTab(tab) {
      currentTab = tab;
      document.querySelectorAll('.tab-btn').forEach((btn, idx) => {
        btn.classList.toggle('active', (tab === 'offers' && idx === 0) || (tab === 'radar' && idx === 1));
      });
      document.getElementById('tab-offers').style.display = tab === 'offers' ? 'block' : 'none';
      document.getElementById('tab-radar').style.display = tab === 'radar' ? 'block' : 'none';
    }

    async function refresh() {
      try {
        const res = await fetch('/api/state');
        const data = await res.json();

        document.getElementById('last-update').textContent = 'Ping: ' + new Date().toLocaleTimeString();
        document.getElementById('stat-live-offers').textContent = data.liveOffersCount || 0;
        document.getElementById('stat-bids').textContent = data.bidsCount || 0;

        if (data.networkStats) {
          document.getElementById('stat-volume').textContent = '$' + Number(data.networkStats.totalVolumeUsd).toLocaleString();
          document.getElementById('stat-jobs').textContent = Number(data.networkStats.jobsCount).toLocaleString();
        }

        // Render Live Offers Table
        const offers = data.liveOffers || [];
        const offersTbody = document.getElementById('offers-body');
        if (offers.length > 0) {
          offersTbody.innerHTML = offers.map((o, idx) => {
            const hasRealOffer = Boolean(o.offerId);
            return \`
              <tr>
                <td>\${idx + 1}</td>
                <td><strong>\${o.title || 'Job Request'}</strong></td>
                <td class="price-tag">\${o.proposedPrice} \${o.currency || 'USDC'}</td>
                <td><span class="badge">\${o.skill || 'Smart Contract Audit'}</span></td>
                <td><span class="id-code">\${o.offerId ? o.offerId.slice(0, 14) + '...' : 'N/A'}</span></td>
                <td><span class="status-pill live">✅ LIVE OFFER</span></td>
                <td>
                  <a href="https://www.agent.family/${chainPrefix}scan?tab=jobs" target="_blank" style="color: var(--accent); text-decoration: none; font-size: 12px;">
                    View on TermiX ↗
                  </a>
                </td>
              </tr>
            \`;
          }).join('');
        } else {
          offersTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--muted); padding: 32px;">No live offers recorded yet. Monitoring incoming briefs...</td></tr>';
        }

        // Render Radar Table
        const matches = data.recentMatches || [];
        const matchesTbody = document.getElementById('matches-body');
        if (matches.length > 0) {
          matchesTbody.innerHTML = matches.map(m => \`
            <tr>
              <td><strong>\${m.item.title}</strong></td>
              <td>\${m.evaluation.budget} \${m.evaluation.currency}</td>
              <td class="price-tag">\${m.evaluation.proposedPrice} \${m.evaluation.currency}</td>
              <td><span class="badge">\${m.evaluation.matchedSkill}</span></td>
              <td>\${(m.item.tags || []).slice(0, 3).map(t => \`<span class="tag">\${t}</span>\`).join('')}</td>
              <td><span class="status-pill \${m.item.status === 'QUOTED' ? 'live' : 'open'}">\${m.item.status}</span></td>
            </tr>
          \`).join('');
        }
      } catch (err) {
        console.error('Refresh error:', err);
      }
    }

    refresh();
    setInterval(refresh, 5000);
  </script>
</body>
</html>`;
}
