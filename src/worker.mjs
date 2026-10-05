import { CONFIG, getActiveNetwork } from './config.mjs';
import { SmartContractAuditor } from './auditor.mjs';

/**
 * Autonomous Order Delivery Worker for selo.agent
 * Polls incoming funded orders, executes security audits, and submits deliverables.
 */
export class AutoDeliveryWorker {
  constructor(apiClient) {
    this.client = apiClient;
    this.auditor = new SmartContractAuditor();
    this.network = getActiveNetwork();
    this.isRunning = false;
    this.processedOrders = new Set();
  }

  async start(intervalSec = 20) {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`⚡ [AutoDeliveryWorker] Started. Monitoring orders for agent: ${CONFIG.providerAgentId || 'selo.agent'}`);

    const runLoop = async () => {
      if (!this.isRunning) return;
      try {
        await this.checkAndFulfillOrders();
      } catch (err) {
        console.error(`[AutoDeliveryWorker Error]:`, err.message);
      }
      setTimeout(runLoop, intervalSec * 1000);
    };

    runLoop();
  }

  stop() {
    this.isRunning = false;
    console.log(`⏹️ [AutoDeliveryWorker] Stopped.`);
  }

  async checkAndFulfillOrders() {
    if (!CONFIG.sessionToken && !CONFIG.walletKey) {
      // In simulation mode, worker stands by
      return;
    }

    try {
      const orders = await this.fetchProviderOrders();
      for (const order of orders) {
        if (this.processedOrders.has(order.id)) continue;

        if (order.status === 'PENDING_ACCEPT') {
          console.log(`📦 [AutoDeliveryWorker] Order #${order.id} is PENDING_ACCEPT. Accepting order...`);
          await this.acceptOrder(order.id);
        }

        if (order.status === 'IN_PROGRESS' || order.status === 'FUNDED') {
          console.log(`🚀 [AutoDeliveryWorker] Fulfilling Order #${order.id} (${order.title || 'Audit'})...`);
          await this.processAuditOrder(order);
          this.processedOrders.add(order.id);
        }
      }
    } catch (err) {
      // Quiet fail on non-critical polls
    }
  }

  async fetchProviderOrders() {
    const token = await this.client.getSessionToken();
    if (!token) return [];
    let res = await fetch(`${this.network.apiBase}/api/v1/orders?side=provider`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (res.status === 401) {
      const freshToken = await this.client.auth.getValidToken(true);
      if (freshToken) {
        res = await fetch(`${this.network.apiBase}/api/v1/orders?side=provider`, {
          headers: {
            'Authorization': `Bearer ${freshToken}`,
          },
        });
      }
    }
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  }

  async acceptOrder(orderId) {
    try {
      const token = await this.client.getSessionToken();
      if (!token) return;
      const res = await fetch(`${this.network.apiBase}/api/v1/orders/${orderId}/provider-accept/prepare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      return await res.json();
    } catch (err) {
      console.error(`Failed to accept order ${orderId}:`, err.message);
    }
  }

  async processAuditOrder(order) {
    // 1. Extract contract source code from order scope, requirements or conversation
    const contractCode = order.scope || order.description || order.requirements || '';
    const title = order.title || 'SmartContract';

    console.log(`🔍 Running automated audit on: ${title}`);
    const auditResult = await this.auditor.runAudit(contractCode, title);

    console.log(`✅ Audit completed. Score: ${auditResult.securityScore}/100. SHA256: ${auditResult.sha256Hash}`);

    // 2. Submit delivery to TermiX AACP
    try {
      const deliveryPayload = {
        deliveryHash: `0x${auditResult.sha256Hash}`,
        content: auditResult.reportMarkdown,
        summary: `Audit finished with security score: ${auditResult.securityScore}/100. Found ${auditResult.findingsCount} findings.`,
      };

      const res = await fetch(`${this.network.apiBase}/api/v1/orders/${order.id}/delivery/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.sessionToken}`,
        },
        body: JSON.stringify(deliveryPayload),
      });

      if (res.ok) {
        console.log(`🎉 [AutoDeliveryWorker] Order #${order.id} DELIVERED successfully! Escrow ready for settlement.`);
      } else {
        const text = await res.text();
        console.log(`[AutoDeliveryWorker Delivery note]: ${text}`);
      }
    } catch (err) {
      console.error(`Error submitting delivery:`, err.message);
    }
  }
}
