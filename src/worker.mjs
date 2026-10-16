import { CONFIG } from './config.mjs';

/** Read-only monitor. Financial acceptance and delivery remain manual. */
export class AutoDeliveryWorker {
  constructor(apiClient) {
    this.client = apiClient;
    this.isRunning = false;
    this.seenStates = new Map();
  }

  start(intervalSec = 20) {
    if (this.isRunning) return;
    this.isRunning = true;
    const runLoop = async () => {
      if (!this.isRunning) return;
      try { await this.checkAndFulfillOrders(); }
      catch (err) { console.error('[Order monitor failed]', err.message); }
      if (this.isRunning) this.timer = setTimeout(runLoop, intervalSec * 1000);
    };
    runLoop();
  }

  stop() { this.isRunning = false; clearTimeout(this.timer); }

  async checkAndFulfillOrders() {
    if (!CONFIG.sessionToken && !CONFIG.walletKey) return;
    const orders = await this.fetchProviderOrders();
    for (const order of orders) {
      // Never monitor or act for a different provider on the same account.
      const provider = order.providerAgentId || order.providerAgent?.id || order.provider?.id;
      if (provider !== CONFIG.providerAgentId) continue;
      if (['PENDING_ACCEPT', 'IN_PROGRESS', 'FUNDED'].includes(order.status) && this.seenStates.get(order.id) !== order.status) {
        this.seenStates.set(order.id, order.status);
        console.log(`[MANUAL REVIEW REQUIRED] Order ${order.id} (${order.status}): inspect source and accepted scope. No acceptance, delivery or settlement transaction was sent.`);
      }
    }
  }

  async fetchProviderOrders() {
    const res = await this.client.authenticatedFetch('/api/v1/orders?side=provider');
    if (!res.ok) throw new Error(`Provider order poll failed: HTTP ${res.status}`);
    const data = await res.json();
    return data.items || [];
  }
}
